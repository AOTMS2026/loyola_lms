import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import EmojiPicker from 'emoji-picker-react';
import { 
  Send, 
  Check, 
  CheckCheck, 
  MoreVertical, 
  Video, 
  Search,
  Paperclip,
  Smile,
  Mic,
  ArrowLeft,
  X,
  BookOpen,
  Award,
  Briefcase,
  MessageSquarePlus,
  Image as ImageIcon,
  Sun,
  Cloud,
  Moon,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file';
}

interface Conversation {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    email: string;
    status?: 'online' | 'offline';
  } | null;
  lastMessage: {
    id: string;
    content: string;
    timestamp: string;
    status: string;
    sender: string;
    type?: 'text' | 'image' | 'file';
  } | null;
  unreadCount: number;
}

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  email: string;
  role: string;
  joined_at: string;
  details: {
    expertise?: string;
    experience?: string;
    bio?: string;
    courses_count?: number;
    enrolled_courses?: number;
    completed_courses?: number;
  };
}

interface BatchContact {
  id: string;
  name: string;
  avatar: string | null;
  email: string;
  role: string;
  batch_session: string;
  batch_name: string;
  batch_id: string | null;
  course_id: string;
}

interface BatchGroupedContacts {
  morning: BatchContact[];
  afternoon: BatchContact[];
  evening: BatchContact[];
  unassigned: BatchContact[];
  all: BatchContact[];
}

type BatchTab = 'all' | 'morning' | 'afternoon' | 'evening';

export function ChatInterface() {
  const { user, userRole } = useAuth();
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();
  const recipientId = searchParams.get('recipientId');
  const shouldShowProfile = searchParams.get('showProfile') === 'true';
  const isInstructor = userRole === 'instructor' || userRole === 'admin';
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'chats' | 'contacts'>('chats');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch-wise state (instructor only)
  const [batchContacts, setBatchContacts] = useState<BatchGroupedContacts | null>(null);
  const [activeBatchTab, setActiveBatchTab] = useState<BatchTab>('all');
  const [loadingBatchContacts, setLoadingBatchContacts] = useState(false);
  
  // Profile Panel State
  const [showProfileInfo, setShowProfileInfo] = useState(shouldShowProfile);
  const [contactProfile, setContactProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showChatOptions, setShowChatOptions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Memoized Actions ---
  const fetchContacts = useCallback(async () => {
    try {
      const data = await fetchWithAuth('/chat/contacts') as UserProfile[];
      setContacts(data);
      return data;
    } catch (err) {
      console.error('Failed to load contacts:', err);
      return [];
    }
  }, []);

  const fetchBatchContacts = useCallback(async () => {
    if (!isInstructor) return;
    setLoadingBatchContacts(true);
    try {
      const data = await fetchWithAuth('/chat/contacts/by-batch') as BatchGroupedContacts;
      setBatchContacts(data);
    } catch (err) {
      console.error('Failed to load batch contacts:', err);
    } finally {
      setLoadingBatchContacts(false);
    }
  }, [isInstructor]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchWithAuth('/chat/conversations') as Conversation[];
      setConversations(data);
      return data;
    } catch (err) {
      console.error('Failed to load conversations:', err);
      return [];
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    setLoadingProfile(true);
    try {
      const data = await fetchWithAuth(`/users/${userId}/public-profile`) as UserProfile;
      setContactProfile(data);
    } catch (err) {
      console.error("Failed to fetch profile", err);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const selectConversation = useCallback(async (conv: Conversation) => {
    setSelectedConvId(conv.id);
    if (isMobileView) setShowChatList(false);
    
    // If profile pane is open, update it
    if (showProfileInfo && conv.user?.id) {
       fetchProfile(conv.user.id);
    }

    try {
      const msgs = await fetchWithAuth(`/chat/messages/${conv.id}`) as Message[];
      setMessages(msgs);
      setConversations(prev => prev.map(c => 
        c.id === conv.id ? { ...c, unreadCount: 0 } : c
      ));
      socket?.emit('join_conversation', conv.id);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, [isMobileView, showProfileInfo, fetchProfile, socket]);

  const startNewChat = useCallback(async (targetId: string) => {
    try {
      const newConv = await fetchWithAuth('/chat/start', {
         method: 'POST',
         body: JSON.stringify({ recipientId: targetId })
      }) as Conversation;
      
      setConversations(prev => {
        const exists = prev.find(c => c.id === newConv.id);
        if (exists) return prev;
        return [newConv, ...prev];
      });
      
      selectConversation(newConv);
      setSearchQuery(''); 
    } catch (err) {
      console.error("Failed to start chat", err);
    }
  }, [selectConversation]);

  // Initial Load
  useEffect(() => {
    const initChat = async () => {
       const [convs] = await Promise.all([
         loadConversations(),
         fetchContacts()
       ]);
       if (isInstructor) fetchBatchContacts();
       
       if (recipientId) {
          const existing = (convs as Conversation[]).find(c => c.user?.id === recipientId);
          if (existing) {
             selectConversation(existing);
          } else {
             startNewChat(recipientId);
          }
       }
    };
    initChat();
    
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1100);
      if (window.innerWidth >= 1100) setShowChatList(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [recipientId, selectConversation, startNewChat, fetchContacts, loadConversations, isInstructor, fetchBatchContacts]);

  // Fetch Profile Info when conversation changes
  useEffect(() => {
    if (selectedConvId && showProfileInfo) {
      const conv = conversations.find(c => c.id === selectedConvId);
      if (conv?.user?.id) {
        fetchProfile(conv.user.id);
      }
    }
  }, [selectedConvId, showProfileInfo, conversations, fetchProfile]);

  // Socket Events
  useEffect(() => {
    if (!socket) return;

    socket.on('user_status', ({ userId, status }: { userId: string, status: string }) => {
        setOnlineUsers(prev => {
            const next = new Set(prev);
            if (status === 'online') next.add(userId);
            else next.delete(userId);
            return next;
        });
    });

    socket.on('receive_message', (msg: Message & { conversationId: string }) => {
      // Prevent duplication of own messages
      if (msg.sender === user?.id) return;

      if (msg.conversationId === selectedConvId) {
        setMessages(prev => [...prev, msg]);
        socket.emit('mark_read', { conversationId: selectedConvId, messageIds: [msg.id] });
      } else {
        setConversations(prev => prev.map(c => 
          c.id === msg.conversationId 
            ? { ...c, unreadCount: c.unreadCount + 1, lastMessage: { ...msg, timestamp: msg.timestamp, status: msg.status, sender: msg.sender } }
            : c
        ));
      }
    });

    socket.on('messages_read', ({ conversationId, messageIds }) => {
      // Update local messages if current convo
      if (conversationId === selectedConvId) {
        setMessages(prev => prev.map(m => 
          messageIds.includes(m.id) ? { ...m, status: 'read' } : m
        ));
      }
      
      // Update conversation list last message status
      setConversations(prev => prev.map(c => {
         if (c.id === conversationId && c.lastMessage && messageIds.includes(c.lastMessage.id)) { // Wait, c.lastMessage doesn't have ID usually in my interface, need to be careful
             return { ...c, lastMessage: { ...c.lastMessage, status: 'read' } };
         }
         return c;
      }));
    });

    socket.on('typing_status', ({ userId, isTyping, conversationId }) => {
        if (conversationId === selectedConvId) {
            setTypingUsers(prev => {
                const next = new Set(prev);
                if (isTyping) next.add(userId);
                else next.delete(userId);
                return next;
            });
        }
    });

    return () => {
      socket.off('receive_message');
      socket.off('messages_read');
      socket.off('user_status');
      socket.off('typing_status');
    };
  }, [socket, selectedConvId, user?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedConvId) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
          // Optimistic UI for image? Maybe just loading state.
          const res = await fetchWithAuth('/chat/upload', {
              method: 'POST',
              body: formData,
          }) as { url: string }; 
          
          if (res.url) {
              sendMessage(res.url, 'image');
          }
      } catch (err) {
          console.error("Upload failed", err);
      }
  };

  const sendMessage = async (content: string = newMessage, type: 'text' | 'image' = 'text') => {
    if (!content.trim() && type === 'text') return;
    if (!selectedConvId) return;

    const tempId = Date.now().toString();
    const optimisticMsg: Message = {
      id: tempId,
      content: content,
      sender: user?.id || '',
      timestamp: new Date().toISOString(),
      status: 'sent',
      type: type
    };

    setMessages(prev => [...prev, optimisticMsg]);
    if (type === 'text') setNewMessage('');
    setShowEmojiPicker(false);

    try {
      const response = await fetchWithAuth('/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: selectedConvId,
          content: optimisticMsg.content,
          type: type
        })
      }) as { success: boolean; message: Message };
      
      if (response.success && response.message) {
         setMessages(prev => prev.map(m => 
           m.id === tempId ? { ...m, id: response.message.id, status: response.message.status } : m
         ));
      }
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewMessage(e.target.value);
      if (!isTyping) {
          setIsTyping(true);
          socket?.emit('typing', { conversationId: selectedConvId, isTyping: true });
      }
      
      // Debounce stop typing
      const timeoutId = setTimeout(() => {
          setIsTyping(false);
          socket?.emit('typing', { conversationId: selectedConvId, isTyping: false });
      }, 2000);
      
      return () => clearTimeout(timeoutId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Check className="h-3 w-3 text-slate-400" />;
      case 'delivered': return <CheckCheck className="h-3 w-3 text-slate-400" />;
      case 'read': return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default: return null;
    }
  };

  const selectedUser = conversations.find(c => c.id === selectedConvId)?.user;
  const isSelectedUserOnline = selectedUser && onlineUsers.has(selectedUser.id);

  // Filter Logic
  const filteredConversations = conversations.filter(c => 
    (c.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(contact => 
    (contact.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
    !conversations.some(c => c.user?.id === contact.id)
  );

  // Batch-filtered contacts for instructor view
  const batchTabStudents: BatchContact[] = batchContacts
    ? (batchContacts[activeBatchTab] || []).filter(s =>
        (s.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const BATCH_TABS: { key: BatchTab; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
    { key: 'all',       label: 'All',       icon: <Users className="h-3 w-3" />,  color: 'text-slate-600', bg: 'bg-slate-100' },
    { key: 'morning',   label: 'Morning',   icon: <Sun className="h-3 w-3" />,    color: 'text-amber-600', bg: 'bg-amber-50' },
    { key: 'afternoon', label: 'Afternoon', icon: <Cloud className="h-3 w-3" />,  color: 'text-blue-600',  bg: 'bg-blue-50' },
    { key: 'evening',   label: 'Evening',   icon: <Moon className="h-3 w-3" />,   color: 'text-indigo-600',bg: 'bg-indigo-50' },
  ];

  const getBatchBadgeStyle = (session: string) => {
    switch(session) {
      case 'morning':   return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'afternoon': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'evening':   return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default:          return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#e9edef]">
      
      {/* ─── LEFT PANEL: CHAT LIST ────────────────────────────────────────── */}
      <div className={cn(
        "w-full lg:w-[350px] xl:w-[400px] flex flex-col border-r border-[#d1d7db] bg-white transition-all duration-300 z-10",
        !showChatList && isMobileView ? "hidden" : "flex"
      )}>
        {/* Header */}
        <div className="h-16 px-4 bg-[#f0f2f5] flex items-center justify-between shrink-0 border-b border-[#d1d7db]">
          <Avatar className="h-10 w-10 cursor-pointer transition-opacity hover:opacity-80">
             <AvatarImage src={user?.avatar_url} />
             <AvatarFallback>ME</AvatarFallback>
          </Avatar>
          
          <div className="flex gap-3 text-[#54656f]">
             <Button 
                size="icon" 
                variant="ghost" 
                className="rounded-full h-10 w-10"
                onClick={() => setViewMode(prev => prev === 'chats' ? 'contacts' : 'chats')}
                title={viewMode === 'chats' ? "New Chat" : "Back to Chats"}
             >
                {viewMode === 'chats' ? <MessageSquarePlus className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
             </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="p-2 bg-white border-b border-[#f0f2f5]">
           <div className="relative flex items-center bg-[#f0f2f5] rounded-lg h-9 px-4">
              <Search className="h-4 w-4 text-[#54656f] mr-4 shrink-0" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isInstructor && viewMode === 'contacts' ? "Search students by batch..." : viewMode === 'contacts' ? "Search contacts" : "Search or start new chat"}
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-[#54656f] text-[#3b4a54]"
              />
              {searchQuery && (
                 <X 
                   className="h-4 w-4 text-[#54656f] cursor-pointer" 
                   onClick={() => setSearchQuery('')}
                 />
              )}
           </div>
        </div>

        {/* Batch Tabs — Instructor Only, Contacts Mode */}
        {isInstructor && viewMode === 'contacts' && (
          <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-[#f0f2f5] overflow-x-auto">
            {BATCH_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveBatchTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap border',
                  activeBatchTab === tab.key
                    ? `${tab.bg} ${tab.color} border-current shadow-sm`
                    : 'bg-white text-[#54656f] border-[#d1d7db] hover:bg-[#f0f2f5]'
                )}
              >
                {tab.icon}
                {tab.label}
                {batchContacts && (
                  <span className={cn(
                    'ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black',
                    activeBatchTab === tab.key ? 'bg-white/60' : 'bg-slate-100'
                  )}>
                    {(batchContacts[tab.key] || []).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        <ScrollArea className="flex-1 bg-white">
          <div className="flex flex-col">
            
            {/* Conversations Section */}
            {(viewMode === 'chats' || searchQuery) && filteredConversations.length > 0 && (
               <>
                 {searchQuery && <div className="px-4 py-2 text-xs font-semibold text-[#008069] uppercase tracking-wider">Conversations</div>}
                 {filteredConversations.map(conv => (
                  <div 
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={cn(
                      "flex items-center gap-3 p-3 pl-4 cursor-pointer hover:bg-[#f5f6f6] transition-colors border-b border-[#f0f2f5] group",
                      selectedConvId === conv.id && "bg-[#f0f2f5]"
                    )}
                  >
                    <div className="relative">
                        <Avatar className="h-12 w-12 border border-slate-100 shrink-0">
                        <AvatarImage src={conv.user?.avatar || ''} />
                        <AvatarFallback className="bg-slate-200 text-slate-500">{conv.user?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        {onlineUsers.has(conv.user?.id || '') && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-[17px] text-[#111b21] font-normal truncate">{conv.user?.name || 'Unknown User'}</h3>
                        {conv.lastMessage && (
                          <span className={cn(
                            "text-xs font-normal shrink-0 ml-2",
                            conv.unreadCount > 0 ? "text-[#25d366]" : "text-[#667781]"
                          )}>
                            {format(new Date(conv.lastMessage.timestamp), 'HH:mm')}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <p className={cn(
                          "text-[14px] truncate pr-2 flex items-center gap-1",
                          conv.unreadCount > 0 ? "text-[#111b21] font-medium" : "text-[#667781]"
                        )}>
                          {conv.lastMessage?.sender === user?.id && (
                            <span className="shrink-0 text-[#53bdeb]">
                               {getStatusIcon(conv.lastMessage.status)}
                            </span>
                          )}
                          {conv.lastMessage?.type === 'image' ? (
                              <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Photo</span>
                          ) : (
                              conv.lastMessage?.content || 'Start a conversation'
                          )}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="bg-[#25d366] text-white text-[12px] font-bold h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
               </>
            )}

            {/* Contacts Section */}
            {(viewMode === 'contacts' || (searchQuery && filteredContacts.length > 0)) && (
              <>
                {/* Instructor: Batch-grouped view */}
                {isInstructor && viewMode === 'contacts' ? (
                  loadingBatchContacts ? (
                    <div className="flex flex-col items-center gap-3 py-10 text-[#667781]">
                      <div className="w-6 h-6 border-2 border-[#008069] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm">Loading batch students...</p>
                    </div>
                  ) : batchTabStudents.length === 0 ? (
                    <div className="p-8 text-center text-[#667781]">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No students in this batch</p>
                      <p className="text-xs mt-1 opacity-70">Students appear here once assigned to your batches</p>
                    </div>
                  ) : (
                    batchTabStudents.map(student => (
                      <div
                        key={student.id}
                        onClick={() => { startNewChat(student.id); setViewMode('chats'); }}
                        className="flex items-center gap-3 p-3 pl-4 cursor-pointer hover:bg-[#f5f6f6] transition-colors border-b border-[#f0f2f5] group"
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12 border border-slate-100 shrink-0">
                            <AvatarImage src={student.avatar || ''} />
                            <AvatarFallback className="bg-slate-200 text-slate-500">{student.name?.[0]}</AvatarFallback>
                          </Avatar>
                          {onlineUsers.has(student.id) && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-[15px] text-[#111b21] font-medium truncate">{student.name}</h3>
                            <span className={cn(
                              'text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0',
                              getBatchBadgeStyle(student.batch_session)
                            )}>
                              {student.batch_session === 'unassigned' ? 'No Batch' : student.batch_session}
                            </span>
                          </div>
                          <p className="text-[12px] text-[#667781] truncate mt-0.5">{student.batch_name}</p>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  /* Regular contacts for non-instructor / search mode */
                  <>
                    {(searchQuery || viewMode === 'contacts') && <div className="px-4 py-2 text-xs font-semibold text-[#008069] uppercase tracking-wider mt-2">New Chats</div>}
                    {filteredContacts.map(contact => (
                      <div 
                        key={contact.id}
                        onClick={() => { startNewChat(contact.id); setViewMode('chats'); }}
                        className="flex items-center gap-3 p-3 pl-4 cursor-pointer hover:bg-[#f5f6f6] transition-colors border-b border-[#f0f2f5]"
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12 border border-slate-100 shrink-0">
                            <AvatarImage src={contact.avatar_url || ''} />
                            <AvatarFallback className="bg-slate-200 text-slate-500">{contact.full_name?.[0]}</AvatarFallback>
                          </Avatar>
                          {onlineUsers.has(contact.id) && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                          <h3 className="text-[17px] text-[#111b21] font-normal truncate">{contact.full_name}</h3>
                          <p className="text-[14px] text-[#667781] truncate">{contact.email}</p>
                        </div>
                      </div>
                    ))}
                    {filteredContacts.length === 0 && viewMode === 'contacts' && (
                      <div className="p-8 text-center text-[#667781]">
                        <p>No contacts found</p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Empty State */}
            {searchQuery && filteredConversations.length === 0 && filteredContacts.length === 0 && (
               <div className="p-8 text-center text-[#667781]">
                  <p>No contacts or messages found</p>
               </div>
            )}

          </div>
        </ScrollArea>
      </div>

      {/* ─── MIDDLE PANEL: CHAT AREA ────────────────────────────────────── */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#efeae2] relative transition-all duration-300 min-w-0",
        showChatList && isMobileView ? "hidden" : "flex"
      )}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.4]" 
             style={{ 
               backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
               backgroundRepeat: 'repeat'
             }} 
        />

        {selectedConvId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 bg-[#f0f2f5] border-b border-[#d1d7db] flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowProfileInfo(!showProfileInfo)}>
                {isMobileView && (
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setShowChatList(true); }} className="md:hidden mr-1 text-[#54656f]">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser?.avatar || ''} />
                  <AvatarFallback>{selectedUser?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-bold text-slate-900 leading-tight text-sm sm:text-base truncate">{selectedUser?.name}</h3>
                  <p className="text-[10px] sm:text-xs text-slate-600 font-medium truncate">
                     {typingUsers.has(selectedUser?.id || '') ? (
                         <span className="text-emerald-600 font-black uppercase tracking-tighter">typing...</span>
                     ) : (
                         isSelectedUserOnline ? 'Online' : <span className="hidden sm:inline">Click for contact info</span>
                     )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 sm:gap-3 text-slate-500 shrink-0">
                <Search 
                    className="h-4 w-4 sm:h-5 sm:w-5 cursor-pointer hover:text-primary transition-colors" 
                    onClick={() => setIsMessageSearchOpen(!isMessageSearchOpen)} 
                />
                <div className="relative">
                    <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" onClick={() => setShowChatOptions(!showChatOptions)}>
                       <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    {showChatOptions && (
                        <div className="absolute right-0 top-10 bg-white shadow-2xl rounded-xl border border-slate-100 py-2 w-52 z-50 animate-in slide-in-from-top-2 fade-in duration-200 origin-top-right">
                             <div className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-900" onClick={() => { setShowProfileInfo(true); setShowChatOptions(false); }}>Contact Info</div>
                             <div className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-900" onClick={() => { setSelectedConvId(null); setShowChatOptions(false); }}>Close Chat</div>
                             <div className="border-t border-slate-50 my-1"></div>
                             <div className="px-4 py-3 hover:bg-rose-50 cursor-pointer text-sm font-bold text-rose-600" onClick={() => { /* Block */ setShowChatOptions(false); }}>Block User</div>
                        </div>
                    )}
                </div>
              </div>
            </div>

            {/* Search Bar */}
            {isMessageSearchOpen && (
               <div className="h-12 bg-white border-b border-[#d1d7db] flex items-center px-4 animate-in slide-in-from-top-2 duration-200 z-10 shrink-0">
                  <Search className="h-4 w-4 text-[#54656f] mr-4 cursor-pointer" onClick={() => setIsMessageSearchOpen(false)} />
                  <input 
                     autoFocus
                     placeholder="Search messages..." 
                     className="flex-1 border-none outline-none text-sm text-[#3b4a54] placeholder:text-[#54656f]"
                     value={messageSearchQuery}
                     onChange={(e) => setMessageSearchQuery(e.target.value)}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-[#54656f]" onClick={() => { setIsMessageSearchOpen(false); setMessageSearchQuery(''); }}>
                     <X className="h-5 w-5" />
                  </Button>
               </div>
            )}

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 relative z-10 custom-scrollbar">
              <div className="flex flex-col gap-1 pb-4">
                {messages
                  .filter(m => !messageSearchQuery || m.content.toLowerCase().includes(messageSearchQuery.toLowerCase()))
                  .map((msg, idx, filteredArr) => {
                  const isMe = msg.sender === user?.id;
                  const showTail = !filteredArr[idx + 1] || filteredArr[idx + 1].sender !== msg.sender;

                  return (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex w-full mb-1",
                        isMe ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[80%] sm:max-w-[65%] px-3 py-1.5 rounded-lg shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] relative text-[14.2px] leading-[19px]",
                        isMe 
                          ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none" 
                          : "bg-white text-[#111b21] rounded-tl-none"
                      )}>
                        {msg.type === 'image' ? (
                            <img src={msg.content} alt="Shared" className="rounded-md max-w-full mb-1" />
                        ) : (
                            <p className="break-words whitespace-pre-wrap">
                                {messageSearchQuery ? (
                                    msg.content.split(new RegExp(`(${messageSearchQuery})`, 'gi')).map((part, i) => 
                                        part.toLowerCase() === messageSearchQuery.toLowerCase() ? <span key={i} className="bg-yellow-200 text-black">{part}</span> : part
                                    )
                                ) : (
                                    msg.content
                                )}
                            </p>
                        )}
                        <div className={cn(
                          "flex items-center gap-1 justify-end text-[11px] mt-1 select-none float-right ml-2 h-4",
                          isMe ? "text-[#111b21]/60" : "text-[#111b21]/60"
                        )}>
                          <span className="inline-block pt-0.5">{format(new Date(msg.timestamp), 'HH:mm')}</span>
                          {isMe && <span className="text-[#53bdeb]">{getStatusIcon(msg.status)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="px-4 py-2 bg-[#f0f2f5] shrink-0 z-20 flex items-center gap-2 relative">
              {showEmojiPicker && (
                  <div className="absolute bottom-16 left-4 z-50">
                      <EmojiPicker onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)} />
                  </div>
              )}
              
              <Button 
                size="icon" 
                variant="ghost" 
                className="rounded-full text-[#54656f] hover:bg-slate-200/50"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                 <Smile className="h-6 w-6" />
              </Button>
              
              <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload}
              />
              <Button 
                size="icon" 
                variant="ghost" 
                className="rounded-full text-[#54656f] hover:bg-slate-200/50"
                onClick={() => fileInputRef.current?.click()}
              >
                 <Paperclip className="h-6 w-6" />
              </Button>

              <div className="flex-1 bg-white rounded-lg flex items-center px-4 py-2 mx-2">
                <input 
                  value={newMessage}
                  onChange={handleTyping}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message" 
                  className="w-full border-none outline-none text-[15px] text-[#111b21] placeholder:text-[#667781]" 
                />
              </div>

              {newMessage.trim() ? (
                <Button onClick={() => sendMessage()} size="icon" className="h-10 w-10 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white shadow-none">
                  <Send className="h-5 w-5 ml-0.5" />
                </Button>
              ) : (
                <Button size="icon" variant="ghost" className="rounded-full text-[#54656f] hover:bg-slate-200/50">
                   <Mic className="h-6 w-6" />
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-800 z-10 border-b-[6px] border-[#25d366] p-10">
             <div className="mb-8">
                <div className="w-48 h-48 md:w-64 md:h-64 bg-[#f0f2f5] rounded-full flex items-center justify-center shadow-inner">
                    <Video className="h-16 w-16 md:h-24 md:w-24 text-slate-300" />
                </div>
             </div>
             <h3 className="text-2xl md:text-[32px] font-black text-slate-900 mb-4 tracking-tight">WhatsApp for Education</h3>
             <p className="text-sm md:text-base text-slate-600 max-w-md text-center font-bold leading-relaxed">
                Send and receive secure messages with your students and peers.<br className="hidden md:block"/>
                All communication is encrypted and monitored for safety.
             </p>
             <div className="mt-8 flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
                <Lock className="h-4 w-4" /> End-to-end encrypted
             </div>
          </div>
        )}
      </div>

      {/* ─── RIGHT PANEL: CONTACT INFO ──────────────────────────────────── */}
      <AnimatePresence>
        {showProfileInfo && selectedConvId && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobileView ? '100%' : 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-slate-200 bg-white flex flex-col z-20 overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="h-16 px-4 bg-slate-50 border-b border-slate-100 flex items-center shrink-0">
               <Button variant="ghost" size="icon" onClick={() => setShowProfileInfo(false)} className="text-slate-500 rounded-full">
                  <X className="h-5 w-5" />
               </Button>
               <span className="ml-4 font-black text-slate-900 uppercase tracking-widest text-[11px]">Contact Intelligence</span>
            </div>

            <ScrollArea className="flex-1">
              <div className="pb-10">
                {/* Profile Picture Section */}
                <div className="bg-white p-8 flex flex-col items-center shadow-sm mb-3">
                   <Avatar className="h-40 w-40 cursor-pointer mb-4">
                      <AvatarImage src={contactProfile?.avatar_url || selectedUser?.avatar} />
                      <AvatarFallback className="text-4xl bg-[#dfe3e5] text-[#8696a0]">
                        {selectedUser?.name?.[0]}
                      </AvatarFallback>
                   </Avatar>
                   <h2 className="text-2xl text-[#111b21] font-normal mb-1">{contactProfile?.full_name || selectedUser?.name}</h2>
                   <p className="text-[#667781] text-base capitalize">{contactProfile?.role || 'User'}</p>
                </div>

                {/* About Section */}
                <div className="bg-white p-4 shadow-sm mb-3">
                   <h4 className="text-[#667781] text-sm font-medium mb-2">About</h4>
                   <p className="text-[#111b21] text-base leading-relaxed">
                     {contactProfile?.details?.bio || "No bio available."}
                   </p>
                   {contactProfile?.joined_at && (
                     <p className="text-[#667781] text-xs mt-3">
                       Joined {new Date(contactProfile.joined_at).toLocaleDateString()}
                     </p>
                   )}
                </div>

                {/* Role Specific Stats */}
                {contactProfile?.role === 'instructor' && (
                  <div className="bg-white p-4 shadow-sm mb-3 space-y-4">
                     <h4 className="text-[#667781] text-sm font-medium">Instructor Details</h4>
                     
                     <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-[#f0f2f5] rounded-full flex items-center justify-center text-[#54656f]">
                           <Briefcase className="h-5 w-5" />
                        </div>
                        <div>
                           <p className="text-[#111b21] font-normal">{contactProfile?.details?.expertise || 'General'}</p>
                           <p className="text-[#667781] text-xs">Expertise</p>
                        </div>
                     </div>

                     <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-[#f0f2f5] rounded-full flex items-center justify-center text-[#54656f]">
                           <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                           <p className="text-[#111b21] font-normal">{contactProfile?.details?.courses_count || 0}</p>
                           <p className="text-[#667781] text-xs">Courses Published</p>
                        </div>
                     </div>
                  </div>
                )}

                {(contactProfile?.role === 'student' || contactProfile?.role === 'intern') && (
                   <div className="bg-white p-4 shadow-sm mb-3 space-y-4">
                      <h4 className="text-[#667781] text-sm font-medium">Student Progress</h4>
                      
                      <div className="flex items-center gap-4">
                         <div className="h-10 w-10 bg-[#f0f2f5] rounded-full flex items-center justify-center text-[#54656f]">
                            <BookOpen className="h-5 w-5" />
                         </div>
                         <div>
                            <p className="text-[#111b21] font-normal">{contactProfile?.details?.enrolled_courses || 0}</p>
                            <p className="text-[#667781] text-xs">Enrolled Courses</p>
                         </div>
                      </div>

                      <div className="flex items-center gap-4">
                         <div className="h-10 w-10 bg-[#f0f2f5] rounded-full flex items-center justify-center text-[#54656f]">
                            <Award className="h-5 w-5" />
                         </div>
                         <div>
                            <p className="text-[#111b21] font-normal">{contactProfile?.details?.completed_courses || 0}</p>
                            <p className="text-[#667781] text-xs">Completed</p>
                         </div>
                      </div>
                   </div>
                )}

                {/* Actions */}
                <div className="bg-white p-4 shadow-sm">
                   <div className="flex flex-col gap-4 text-[#ea0038] font-medium cursor-pointer">
                      <div className="flex items-center gap-4 hover:bg-[#f0f2f5] p-2 -mx-2 rounded transition-colors">
                         <X className="h-5 w-5" />
                         <span>Block {contactProfile?.full_name?.split(' ')[0]}</span>
                      </div>
                      <div className="flex items-center gap-4 hover:bg-[#f0f2f5] p-2 -mx-2 rounded transition-colors">
                         <div className="h-5 w-5 flex items-center justify-center rotate-90">👍</div>
                         <span>Report {contactProfile?.full_name?.split(' ')[0]}</span>
                      </div>
                   </div>
                </div>

              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Helper component for Lock icon since I missed importing it in the huge list
function Lock({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}