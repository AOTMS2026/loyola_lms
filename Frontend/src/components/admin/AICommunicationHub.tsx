import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Users,
  Search,
  Mail,
  Send,
  Sparkles,
  UserCheck,
  GraduationCap,
  Award,
  Filter,
  CheckSquare,
  Square,
  Loader2,
  Smile,
  Info
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchWithAuth } from "@/lib/api";
import { SyncDataButton } from "./data/SyncDataButton";
import { toast } from "sonner";
import { Profile } from "@/hooks/useAdminData";

interface AICommunicationHubProps {
  profiles: Profile[];
  loading: boolean;
  onSync?: () => void;
}

export function AICommunicationHub({ profiles = [], loading: profilesLoading, onSync }: AICommunicationHubProps) {
  const [activeTab, setActiveTab] = useState<"student" | "instructor">("student");
  const [selectedColleges, setSelectedColleges] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Form State
  const [category, setCategory] = useState("Update");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Helper: treat intern same as student for tab matching
  const getRoleTab = (role: string | undefined) => {
    const r = role || "student";
    return r === "intern" ? "student" : r;
  };

  // Get unique colleges for filtering
  const colleges = useMemo(() => {
    const all = profiles
      .filter(p => getRoleTab(p.role) === activeTab)
      .map(p => p.college_name)
      .filter((c): c is string => !!c);
    return Array.from(new Set(all)).sort();
  }, [profiles, activeTab]);

  // Filtered users based on role, search, and college
  const filteredUsers = useMemo(() => {
    return profiles.filter(p => {
      const matchesRole = getRoleTab(p.role) === activeTab;
      const matchesSearch =
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCollege =
        selectedColleges.length === 0 ||
        (p.college_name && selectedColleges.includes(p.college_name));

      return matchesRole && matchesSearch && matchesCollege;
    });
  }, [profiles, activeTab, searchQuery, selectedColleges]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const toggleCollegeShortcut = (college: string) => {
    setSelectedColleges(prev => 
      prev.includes(college) ? prev.filter(c => c !== college) : [...prev, college]
    );
    // Reset selected users when college filter changes to avoid confusion? 
    // Or just keep them? Let's keep them but maybe it's cleaner to reset?
    // Actually, user might want to select multiple colleges then select all.
  };



  const handleSendBroadcast = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }
    if (!subject.trim()) {
      toast.error("Email subject is required");
      return;
    }
    if (!message.trim()) {
      toast.error("Message content is required");
      return;
    }

    setIsSending(true);
    const tId = toast.loading(`Sending broadcast to ${selectedUsers.length} recipient${selectedUsers.length !== 1 ? 's' : ''}...`);

    try {
      const result = await fetchWithAuth<{ success: boolean; message: string; succeeded?: number; failed?: number }>("/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({
          type: activeTab,
          selectedUsers,   // MongoDB ObjectId strings
          category,
          subject: subject.trim(),
          message: message.trim(),
          timestamp: new Date().toISOString()
        })
      });

      if (result?.succeeded === 0 && (result?.failed ?? 0) > 0) {
        toast.error(`Broadcast failed: n8n webhook rejected all requests. Check if the n8n workflow is active.`, { id: tId });
      } else if ((result?.failed ?? 0) > 0) {
        toast.warning(`Broadcast partially sent: ${result?.succeeded} succeeded, ${result?.failed} failed.`, { id: tId });
      } else {
        toast.success(result?.message || `Broadcast sent to ${result?.succeeded ?? selectedUsers.length} recipients!`, { id: tId });
        // Reset form after successful send
        setSelectedUsers([]);
        setSubject("");
        setMessage("");
      }
    } catch (err) {
      const error = err as Error;
      const errMsg = error.message || "Failed to initiate broadcast";
      toast.error(errMsg, { id: tId });
      console.error("[Broadcast] Error:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* ── Header Branding ── */}
      <div className="relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Zap className="h-64 w-64 text-primary animate-pulse" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-black tracking-tight">AI Communication Hub</h1>
            </div>
            <p className="text-slate-400 font-medium max-w-md">
              Broadcast intelligent, AI-powered notifications and updates to your platform members via n8n automation.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            {onSync && (
              <SyncDataButton 
                onSync={onSync} 
                isLoading={profilesLoading} 
                className="h-12 px-6 rounded-2xl bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-xl"
              />
            )}
            <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl backdrop-blur-sm border border-white/10">
            <button
              onClick={() => { setActiveTab("student"); setSelectedUsers([]); }}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === "student" ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Students
            </button>
            <button
              onClick={() => { setActiveTab("instructor"); setSelectedUsers([]); }}
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === "instructor" ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Instructors
            </button>
          </div>
        </div>
      </div>
    </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* ── LEFT: RECIPIENT SELECTION ── */}
        <div className="xl:col-span-7 space-y-6">
          <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white h-full flex flex-col">
            <CardHeader className="pb-6 border-b border-slate-50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${activeTab === 'student' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                    {activeTab === 'student' ? <GraduationCap className="h-5 w-5" /> : <Award className="h-5 w-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-slate-900 leading-none mb-1">Select Recipients</CardTitle>
                    <CardDescription className="text-xs font-bold text-slate-400">
                      {filteredUsers.length} total {activeTab === "student" ? "students & interns" : activeTab + "s"} available for selection.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   <div className="relative group w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder={`Search ${activeTab}s...`}
                      className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all text-sm font-medium"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl shrink-0"
                    title="Bulk Filters"
                  >
                    <Filter className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              </div>

              {/* College Filters Shortcuts */}
              {colleges.length > 0 && (
                <div className="pt-4 flex flex-wrap gap-2">
                   {colleges.map(c => (
                     <Badge
                        key={c}
                        onClick={() => toggleCollegeShortcut(c)}
                        className={`cursor-pointer px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all border-none shadow-none ${
                          selectedColleges.includes(c) 
                            ? "bg-primary text-white shadow-md scale-105" 
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                     >
                       {c}
                     </Badge>
                   ))}
                   {selectedColleges.length > 0 && (
                     <Badge 
                        variant="outline" 
                        onClick={() => setSelectedColleges([])}
                        className="cursor-pointer px-3 py-1 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 border-rose-200"
                     >
                        Clear Filters
                     </Badge>
                   )}
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleSelectAll}
                    className="h-8 rounded-lg gap-2 text-primary font-black text-[10px] uppercase tracking-widest px-3"
                  >
                    {selectedUsers.length === filteredUsers.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    {selectedUsers.length === filteredUsers.length ? "Deselect All" : "Select All"}
                  </Button>
                  {selectedUsers.length > 0 && (
                     <Badge className="bg-primary text-white border-none text-[10px] h-6 font-black rounded-lg shadow-sm">
                       {selectedUsers.length} SELECTED
                     </Badge>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {profilesLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Retrieving user records...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <Search className="h-12 w-12 opacity-20 mb-4" />
                    <p className="font-black text-sm uppercase tracking-widest">No matching {activeTab}s found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer group ${
                          selectedUsers.includes(user.id)
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "bg-white border-slate-100 hover:border-primary/20 hover:shadow-md"
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-10 w-10 rounded-xl border border-white shadow-sm">
                            <AvatarImage src={user.avatar_url} className="object-cover" />
                            <AvatarFallback className="bg-slate-100 text-slate-400 font-bold text-xs uppercase">
                              {user.full_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          {selectedUsers.includes(user.id) && (
                            <div className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-primary text-white rounded-full flex items-center justify-center shadow-md scale-110 border-2 border-white animate-in zoom-in-0">
                              <UserCheck className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13px] font-black truncate leading-tight ${selectedUsers.includes(user.id) ? "text-primary" : "text-slate-900"}`}>
                            {user.full_name}
                          </p>
                          <p className="text-[11px] font-medium text-slate-500 truncate flex items-center gap-1.5">
                             <Mail className="h-2.5 w-2.5 opacity-40" />
                             {user.email}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {user.role === "intern" && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-tight">
                                Intern
                              </span>
                            )}
                            {user.college_name && (
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate">
                                {user.college_name.slice(0, 20)}{user.college_name.length > 20 ? '...' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: BROADCAST FORM ── */}
        <div className="xl:col-span-5 space-y-6">
          <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white sticky top-6">
            <CardHeader className="pb-6 border-b border-slate-50 bg-slate-50/30">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                   <Send className="h-5 w-5" />
                 </div>
                 <div>
                   <CardTitle className="text-lg font-black text-slate-900 leading-none mb-1">Broadcast Details</CardTitle>
                   <CardDescription className="text-xs font-bold text-slate-400">
                     Configure the message to be sent via n8n.
                   </CardDescription>
                 </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                {/* Category Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Notification Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 hover:border-primary/30 transition-all font-bold text-sm">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 overflow-hidden p-1 shadow-2xl">
                      <SelectItem value="Update" className="rounded-xl h-11 font-bold">🚀 Platform Update</SelectItem>
                      <SelectItem value="Announcement" className="rounded-xl h-11 font-bold">📢 General Announcement</SelectItem>
                      <SelectItem value="Urgent" className="rounded-xl h-11 font-bold text-rose-600">⚡ Urgent Alert</SelectItem>
                      <SelectItem value="Offer" className="rounded-xl h-11 font-bold text-emerald-600">🎁 Exclusive Offer</SelectItem>
                      <SelectItem value="Exam" className="rounded-xl h-11 font-bold text-indigo-600">🎓 Exam Information</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Email Subject</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="Enter a compelling subject line..."
                      className="pl-11 h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all text-sm font-bold"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                </div>

                {/* Message / Description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Message Content</label>

                  </div>
                  <div className="relative group">
                     <Textarea
                        placeholder="Type your message here. Use the AI Boost to add professional styling and emojis..."
                        className="min-h-[220px] p-5 rounded-[2rem] bg-slate-50 border-slate-200 focus:bg-white transition-all text-sm font-medium leading-relaxed resize-none scrollbar-hide"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                     />
                     <div className="absolute right-4 bottom-4 flex gap-1 opacity-20 hover:opacity-100 transition-opacity">
                        <Smile className="h-5 w-5 text-slate-400 cursor-pointer" />
                     </div>
                  </div>
                </div>

                {/* Summary Info */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 flex items-start gap-4">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <Info className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Broadcast Summary</p>
                    <p className="text-[11px] font-medium text-slate-600 leading-tight">
                       You are about to send a <strong>{category}</strong> notification to <strong>{selectedUsers.length}</strong> selected recipient{selectedUsers.length !== 1 ? 's' : ''}. This action will trigger an automated n8n workflow for delivery.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSendBroadcast}
                  disabled={isSending || selectedUsers.length === 0 || !subject || !message}
                  className="w-full h-14 rounded-[1.5rem] bg-primary text-white hover:bg-slate-900 transition-all shadow-xl shadow-primary/20 font-black text-xs uppercase tracking-[0.2em] gap-3"
                >
                  {isSending ? (
                     <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  {isSending ? "Initiating Broadcast..." : "Send AI Broadcast"}
                </Button>
                <p className="text-center text-[9px] font-bold text-slate-400 mt-4 uppercase tracking-widest">
                  Powered by n8n Automation Engine
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}