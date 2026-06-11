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
import { Label } from "@/components/ui/label";
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
  Info,
  CalendarDays,
  X,
  ChevronRight,
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

interface EventTemplate {
  eventType: string;
  eventName: string;
  description: string;
  fromDate: string;
  toDate: string;
  time: string;
}

const DEPARTMENTS = ["CSE", "ECE", "EEE", "DS", "AI/ML", "IT"];
const YEARS = ["1", "2", "3", "4"];

export function AICommunicationHub({ profiles = [], loading: profilesLoading, onSync }: AICommunicationHubProps) {
  const [activeTab, setActiveTab] = useState<"student" | "instructor">("student");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Event type flow
  const [eventTypeInput, setEventTypeInput] = useState("");
  const [showTemplate, setShowTemplate] = useState(false);
  const [template, setTemplate] = useState<EventTemplate>({
    eventType: "",
    eventName: "",
    description: "",
    fromDate: "",
    toDate: "",
    time: "",
  });
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const getRoleTab = (role: string | undefined) => {
    const r = role || "student";
    return r === "intern" ? "student" : r;
  };

  // Filtered users based on role, search, dept, and year
  const filteredUsers = useMemo(() => {
    return profiles.filter(p => {
      const matchesRole = getRoleTab(p.role) === activeTab;
      const matchesSearch =
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const dept = (p.department || "").toUpperCase();
      const matchesDept = selectedDepts.length === 0 || selectedDepts.includes(dept);
      const year = (p as any).year || "";
      const matchesYear = selectedYears.length === 0 || selectedYears.includes(year);
      return matchesRole && matchesSearch && matchesDept && matchesYear;
    });
  }, [profiles, activeTab, searchQuery, selectedDepts, selectedYears]);

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

  const toggleDept = (dept: string) => {
    setSelectedDepts(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const toggleYear = (year: string) => {
    setSelectedYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  // When user presses Enter on event type input → show template form
  const handleEventTypeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && eventTypeInput.trim()) {
      setTemplate(prev => ({ ...prev, eventType: eventTypeInput.trim(), eventName: "" }));
      setShowTemplate(true);
    }
  };

  const handleTemplateConfirm = () => {
    if (!template.eventName.trim()) {
      toast.error("Please enter the event name");
      return;
    }
    // Auto-fill subject and message from template
    setSubject(`${template.eventType}: ${template.eventName}`);
    setMessage(
      `📅 Event: ${template.eventName}\n` +
      `🗂️ Type: ${template.eventType}\n` +
      (template.fromDate ? `📆 From: ${template.fromDate}` : "") +
      (template.toDate ? ` → To: ${template.toDate}` : "") +
      (template.time ? `\n⏰ Time: ${template.time}` : "") +
      (template.description ? `\n\n${template.description}` : "")
    );
    setShowTemplate(false);
  };

  const handleSendBroadcast = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }
    if (!template.eventType && !eventTypeInput.trim()) {
      toast.error("Please enter an event type");
      return;
    }
    // Auto-build subject/message if not filled from template
    const finalSubject = subject || `${template.eventType || eventTypeInput}: ${template.eventName || 'Notification'}`;
    const finalMessage = message || `Event: ${template.eventName || eventTypeInput}\nType: ${template.eventType || eventTypeInput}${template.fromDate ? `\nFrom: ${template.fromDate}${template.toDate ? ' → ' + template.toDate : ''}` : ''}${template.time ? `\nTime: ${template.time}` : ''}${template.description ? `\n\n${template.description}` : ''}`;

    setIsSending(true);
    const tId = toast.loading(`Sending broadcast to ${selectedUsers.length} recipient${selectedUsers.length !== 1 ? "s" : ""}...`);

    try {
      const result = await fetchWithAuth<{ success: boolean; message: string; succeeded?: number; failed?: number }>("/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({
          type: activeTab,
          selectedUsers,
          category: template.eventType || "Announcement",
          eventType: template.eventType,
          eventName: template.eventName,
          eventDetails: {
            description: template.description,
            fromDate: template.fromDate,
            toDate: template.toDate,
            time: template.time,
          },
          subject: finalSubject,
          message: finalMessage,
          timestamp: new Date().toISOString(),
        }),
      });

      if (result?.succeeded === 0 && (result?.failed ?? 0) > 0) {
        toast.error(`Broadcast failed: n8n webhook rejected all requests.`, { id: tId });
      } else if ((result?.failed ?? 0) > 0) {
        toast.warning(`Broadcast partially sent: ${result?.succeeded} succeeded, ${result?.failed} failed.`, { id: tId });
      } else if ((result as any)?.emailSkipped) {
        toast.success(`✅ In-app notification sent to ${result?.succeeded} recipient(s). To enable email, add N8N_EMAIL1_WEBHOOK_URL to your .env file.`, { id: tId });
        setSelectedUsers([]);
        setSubject("");
        setMessage("");
        setEventTypeInput("");
        setTemplate({ eventType: "", eventName: "", description: "", fromDate: "", toDate: "", time: "" });
      } else {
        toast.success(result?.message || `Broadcast sent to ${result?.succeeded ?? selectedUsers.length} recipients!`, { id: tId });
        setSelectedUsers([]);
        setSubject("");
        setMessage("");
        setEventTypeInput("");
        setTemplate({ eventType: "", eventName: "", description: "", fromDate: "", toDate: "", time: "" });
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to initiate broadcast", { id: tId });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
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
              Broadcast event notifications and updates to your platform members via n8n automation.
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
                className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === "student" ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
              >
                Students
              </button>
              <button
                onClick={() => { setActiveTab("instructor"); setSelectedUsers([]); }}
                className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === "instructor" ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
              >
                Instructors
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT: RECIPIENT SELECTION */}
        <div className="xl:col-span-7 space-y-6">
          <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white h-full flex flex-col">
            <CardHeader className="pb-4 border-b border-slate-50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${activeTab === "student" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}`}>
                    {activeTab === "student" ? <GraduationCap className="h-5 w-5" /> : <Award className="h-5 w-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-slate-900 leading-none mb-1">Select Recipients</CardTitle>
                    <CardDescription className="text-xs font-bold text-slate-400">
                      {filteredUsers.length} total {activeTab === "student" ? "students & interns" : activeTab + "s"} available.
                    </CardDescription>
                  </div>
                </div>
                <div className="relative group w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={`Search ${activeTab}s...`}
                    className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Department filters */}
              {activeTab === "student" && (
                <div className="pt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DEPARTMENTS.map(d => (
                      <Badge
                        key={d}
                        onClick={() => toggleDept(d)}
                        className={`cursor-pointer px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all border-none shadow-none ${
                          selectedDepts.includes(d) ? "bg-primary text-white shadow-md scale-105" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {d}
                      </Badge>
                    ))}
                    {selectedDepts.length > 0 && (
                      <Badge variant="outline" onClick={() => setSelectedDepts([])} className="cursor-pointer px-3 py-1 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 border-rose-200">
                        Clear
                      </Badge>
                    )}
                  </div>
                  {/* Year filters */}
                  <div className="flex items-center gap-2 mt-1">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {YEARS.map(y => (
                      <Badge
                        key={y}
                        onClick={() => toggleYear(y)}
                        className={`cursor-pointer px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all border-none shadow-none ${
                          selectedYears.includes(y) ? "bg-indigo-600 text-white shadow-md scale-105" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        Year {y}
                      </Badge>
                    ))}
                    {selectedYears.length > 0 && (
                      <Badge variant="outline" onClick={() => setSelectedYears([])} className="cursor-pointer px-3 py-1 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 border-rose-200">
                        Clear
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 bg-slate-50/50 border-b border-slate-100">
                <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="h-8 rounded-lg gap-2 text-primary font-black text-[10px] uppercase tracking-widest px-3">
                  {selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  {selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 ? "Deselect All" : "Select All"}
                </Button>
                {selectedUsers.length > 0 && (
                  <Badge className="bg-primary text-white border-none text-[10px] h-6 font-black rounded-lg shadow-sm">
                    {selectedUsers.length} SELECTED
                  </Badge>
                )}
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
                          selectedUsers.includes(user.id) ? "bg-primary/5 border-primary shadow-sm" : "bg-white border-slate-100 hover:border-primary/20 hover:shadow-md"
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
                          {(user as any).roll_number && (
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">{(user as any).roll_number}</p>
                          )}
                          {(user as any).year && (
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Year {(user as any).year}</p>
                          )}
                          <p className="text-[11px] font-medium text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                            <Mail className="h-2.5 w-2.5 opacity-40" />
                            {user.email}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {user.role === "intern" && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-tight">Intern</span>
                            )}
                            {user.department && (
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate">
                                {user.department.toUpperCase()}
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

        {/* RIGHT: BROADCAST FORM */}
        <div className="xl:col-span-5 space-y-6">
          <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white sticky top-6">
            <CardHeader className="pb-6 border-b border-slate-50 bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-slate-900 leading-none mb-1">Broadcast Details</CardTitle>
                  <CardDescription className="text-xs font-bold text-slate-400">Configure and send event notifications via n8n.</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {/* Event Type Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                  Event Type <span className="text-slate-300 normal-case font-medium">(press Enter to open template)</span>
                </label>
                <div className="relative group">
                  <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="e.g. Workshop, Seminar, Exam, Holiday..."
                    className="pl-11 pr-10 h-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all text-sm font-bold"
                    value={eventTypeInput}
                    onChange={(e) => setEventTypeInput(e.target.value)}
                    onKeyDown={handleEventTypeKeyDown}
                  />
                  {eventTypeInput && (
                    <button
                      onClick={() => { setEventTypeInput(""); setShowTemplate(false); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {eventTypeInput && !showTemplate && (
                  <p className="text-[10px] text-slate-400 ml-1 flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" /> Press Enter to fill event template
                  </p>
                )}
              </div>

              {/* Event Template Form — shown after Enter */}
              {showTemplate && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-black text-indigo-700 uppercase tracking-widest">
                      {template.eventType} — Template
                    </p>
                    <button onClick={() => setShowTemplate(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Event Name *</Label>
                    <Input
                      placeholder="e.g. Python Workshop by Dr. Rao"
                      className="h-10 rounded-xl bg-white border-slate-200 text-sm"
                      value={template.eventName}
                      onChange={(e) => setTemplate(prev => ({ ...prev, eventName: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">From Date</Label>
                      <Input
                        type="date"
                        className="h-10 rounded-xl bg-white border-slate-200 text-sm"
                        value={template.fromDate}
                        onChange={(e) => setTemplate(prev => ({ ...prev, fromDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">To Date</Label>
                      <Input
                        type="date"
                        className="h-10 rounded-xl bg-white border-slate-200 text-sm"
                        value={template.toDate}
                        onChange={(e) => setTemplate(prev => ({ ...prev, toDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Time</Label>
                    <Input
                      type="time"
                      className="h-10 rounded-xl bg-white border-slate-200 text-sm"
                      value={template.time}
                      onChange={(e) => setTemplate(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</Label>
                    <Textarea
                      placeholder="Detailed explanation of the event..."
                      className="min-h-[80px] rounded-xl bg-white border-slate-200 text-sm resize-none"
                      value={template.description}
                      onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <Button
                    onClick={handleTemplateConfirm}
                    className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest"
                  >
                    OK — Apply to Message
                  </Button>
                </div>
              )}

              {/* Subject — hidden, auto-filled from template */}
              {/* Message — hidden, auto-filled from template */}

              {/* Summary */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 flex items-start gap-4">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <Info className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Broadcast Summary</p>
                  <p className="text-[11px] font-medium text-slate-600 leading-tight">
                    Sending <strong>{template.eventType || "notification"}</strong> to <strong>{selectedUsers.length}</strong> recipient{selectedUsers.length !== 1 ? "s" : ""}. Recipients will also get an in-app popup notification.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSendBroadcast}
                disabled={isSending || selectedUsers.length === 0 || !template.eventType}
                className="w-full h-14 rounded-[1.5rem] bg-primary text-white hover:bg-slate-900 transition-all shadow-xl shadow-primary/20 font-black text-xs uppercase tracking-[0.2em] gap-3"
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                {isSending ? "Initiating Broadcast..." : "Send AI Broadcast"}
              </Button>
              <p className="text-center text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                Powered by n8n Automation Engine
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}