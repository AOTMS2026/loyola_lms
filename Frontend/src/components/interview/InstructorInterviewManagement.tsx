/**
 * INSTRUCTOR — INTERVIEW MANAGEMENT PANEL
 * File: Frontend/src/components/interview/InstructorInterviewManagement.tsx
 *
 * Add to InstructorDashboard.tsx sidebar menu:
 *   { id: "interview-management", label: "Interview Management", icon: ClipboardCheck }
 * And render this component when that tab is active.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Users, FileText,
  Sparkles, RefreshCw, UserPlus, Send
} from "lucide-react";

// Strip trailing /api if VITE_API_URL already includes it, since this file appends /api paths manually
const _rawBase = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:5000/api" : "https://loyola-lms.onrender.com/api");
const API_BASE = _rawBase.replace(/\/api$/, '');

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

// ─────────────────────────────────────────────────────────────────────────────

export default function InstructorInterviewManagement() {
  const [activeTab, setActiveTab] = useState("exams");
  const { toast } = useToast();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            Interview Management
          </h2>
          <p className="text-slate-500 font-medium text-sm">
            Create exams, manage candidates, generate AI questions
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-11 bg-slate-100/80 border border-slate-200 rounded-xl p-1">
          <TabsTrigger
            value="exams"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-semibold text-slate-500 transition-all"
          >
            <FileText className="w-4 h-4 mr-2" /> Exams
          </TabsTrigger>
          <TabsTrigger
            value="candidates"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-semibold text-slate-500 transition-all"
          >
            <Users className="w-4 h-4 mr-2" /> Candidates
          </TabsTrigger>
          <TabsTrigger
            value="create-candidate"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-semibold text-slate-500 transition-all"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Add Candidate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exams" className="mt-4"><ExamsTab toast={toast} /></TabsContent>
        <TabsContent value="candidates" className="mt-4"><CandidatesTab toast={toast} /></TabsContent>
        <TabsContent value="create-candidate" className="mt-4"><CreateCandidateTab toast={toast} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── EXAMS TAB ────────────────────────────────────────────────────────────────

function ExamsTab({ toast }: any) {
  const [exams, setExams] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [form, setForm] = useState({
    title: "", topic: "", difficulty: "medium",
    num_questions: 20, duration_minutes: 60,
    passing_percentage: 50, scheduled_date: "", scheduled_time: ""
  });

  useEffect(() => { fetchExams(); }, []);

  const fetchExams = async () => {
    const res = await fetch(`${API_BASE}/api/interview/exams`, { headers: authHeaders() });
    const data = await res.json();
    if (Array.isArray(data)) setExams(data);
  };

  const fetchQuestions = async (examId: string) => {
    setLoadingQuestions(true);
    const res = await fetch(`${API_BASE}/api/interview/exams/${examId}/questions`, { headers: authHeaders() });
    const data = await res.json();
    setQuestions(Array.isArray(data) ? data : []);
    setLoadingQuestions(false);
  };

  const handleSelectExam = (exam: any) => {
    setSelectedExam(exam);
    fetchQuestions(exam.id || exam._id);
  };

  const createExam = async () => {
    if (!form.title || !form.topic || !form.scheduled_date || !form.scheduled_time) {
      toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    if (!form.num_questions || form.num_questions < 1) {
      toast({ title: "Error", description: "Number of questions must be at least 1.", variant: "destructive" });
      return;
    }
    if (!form.duration_minutes || form.duration_minutes < 1) {
      toast({ title: "Error", description: "Duration must be at least 1 minute.", variant: "destructive" });
      return;
    }
    const payload = {
      ...form,
      num_questions: Math.max(1, parseInt(String(form.num_questions)) || 10),
      duration_minutes: Math.max(1, parseInt(String(form.duration_minutes)) || 60),
      passing_percentage: Math.min(100, Math.max(0, parseInt(String(form.passing_percentage)) || 50)),
    };
    const res = await fetch(`${API_BASE}/api/interview/exams`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      toast({ title: "Exam Created", description: data.exam?.title || "Done" });
      setShowCreate(false);
      setForm({ title: "", topic: "", difficulty: "medium", num_questions: 20, duration_minutes: 60, passing_percentage: 50, scheduled_date: "", scheduled_time: "" });
      fetchExams();
    } else {
      const errMsg = data.error || data.message || JSON.stringify(data);
      toast({ title: "Error", description: errMsg, variant: "destructive" });
    }
  };

  const generateAIQuestions = async () => {
    if (!selectedExam) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/interview/exams/${selectedExam.id || selectedExam._id}/generate-questions`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ topic: selectedExam.topic, count: selectedExam.num_questions, difficulty: selectedExam.difficulty })
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Questions Generated", description: `${data.questions?.length || 0} questions ready` });
        fetchQuestions(selectedExam.id || selectedExam._id);
      } else {
        toast({ title: "Generation Failed", description: data.error, variant: "destructive" });
      }
    } finally {
      setGenerating(false);
    }
  };

  const deleteQuestion = async (qId: string) => {
    if (!confirm("Delete this question?")) return;
    await fetch(`${API_BASE}/api/interview/questions/${qId}`, {
      method: "DELETE", headers: authHeaders()
    });
    fetchQuestions(selectedExam.id || selectedExam._id);
  };

  const deleteExam = async (examId: string) => {
    if (!confirm("Delete this exam and all its questions?")) return;
    await fetch(`${API_BASE}/api/interview/exams/${examId}`, {
      method: "DELETE", headers: authHeaders()
    });
    setSelectedExam(null);
    fetchExams();
  };

  return (
    <div className="space-y-5">
      {/* Create Exam Form */}
      {showCreate ? (
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="pb-4 border-b border-slate-50">
            <CardTitle className="text-slate-900 text-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Create New Exam
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Exam Title *" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. React Developer Assessment" />
              <Field label="Topic *" value={form.topic} onChange={v => setForm(f => ({ ...f, topic: v }))} placeholder="e.g. React JS" />
              <div>
                <Label className="text-slate-700 text-sm font-semibold">Difficulty</Label>
                <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v }))}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-700 mt-1 focus:bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {["easy", "medium", "hard"].map(d => (
                      <SelectItem key={d} value={d} className="capitalize font-medium">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field label="No. of Questions" value={String(form.num_questions)} onChange={v => setForm(f => ({ ...f, num_questions: Number(v) }))} type="number" min="1" />
              <Field label="Duration (minutes)" value={String(form.duration_minutes)} onChange={v => setForm(f => ({ ...f, duration_minutes: Number(v) }))} type="number" />
              <Field label="Passing Percentage %" value={String(form.passing_percentage)} onChange={v => setForm(f => ({ ...f, passing_percentage: Number(v) }))} type="number" />
              <Field label="Scheduled Date *" value={form.scheduled_date} onChange={v => setForm(f => ({ ...f, scheduled_date: v }))} type="date" />
              <Field label="Scheduled Time *" value={form.scheduled_time} onChange={v => setForm(f => ({ ...f, scheduled_time: v }))} type="time" />
            </div>
            <div className="flex gap-3 pt-1">
              <Button onClick={createExam} className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Create Exam
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="h-10 px-5 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowCreate(true)} className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Create New Exam
        </Button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Exam List */}
        <div className="space-y-3">
          <h3 className="text-slate-700 text-sm font-bold uppercase tracking-wide">
            Your Exams ({exams.length})
          </h3>
          {exams.length === 0 && (
            <div className="text-slate-400 text-sm p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-500">No exams created yet.</p>
            </div>
          )}
          {exams.map(exam => (
            <div
              key={exam._id || exam.id}
              onClick={() => handleSelectExam(exam)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedExam?.id === exam.id || selectedExam?._id === exam._id
                  ? "border-primary/40 bg-primary/5 shadow-sm"
                  : "border-slate-200 bg-white hover:border-primary/30 hover:bg-slate-50 shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-semibold truncate">{exam.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5 font-medium">
                    {exam.topic} · {exam.difficulty} · {exam.num_questions}Q · {exam.duration_minutes}min
                  </p>
                  <p className="text-slate-400 text-xs mt-1">📅 {exam.scheduled_date} at {exam.scheduled_time}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Badge variant="outline" className="text-slate-500 border-slate-200 text-xs bg-slate-50">
                    {exam.question_count || 0} Q
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); deleteExam(exam.id || exam._id); }}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Question Panel */}
        {selectedExam && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-700 text-sm font-bold uppercase tracking-wide">
                Questions — {selectedExam.title} ({questions.length})
              </h3>
              <Button
                onClick={generateAIQuestions}
                disabled={generating}
                size="sm"
                className="h-8 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm"
              >
                {generating
                  ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                  : <><Sparkles className="w-3 h-3 mr-1" /> Generate AI Questions</>
                }
              </Button>
            </div>

            {loadingQuestions && (
              <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
                <div className="h-5 w-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin mr-2" />
                Loading questions...
              </div>
            )}

            {!loadingQuestions && questions.length === 0 && (
              <div className="text-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-medium">No questions yet.</p>
                <p className="text-slate-400 text-xs">Click "Generate AI Questions" to auto-generate.</p>
              </div>
            )}

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {questions.map((q, idx) => (
                <div key={q._id || q.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-slate-700 text-sm flex-1 leading-relaxed">
                      <span className="text-slate-400 mr-2 font-semibold">Q{idx + 1}.</span>
                      {q.question_text}
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q._id || q.id)}
                      className="text-red-400 hover:bg-red-50 h-6 w-6 p-0 flex-shrink-0 rounded-lg">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {q.options?.map((opt: any, i: number) => (
                      <span key={i} className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                        opt.is_correct
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-50 text-slate-500 border border-slate-200"
                      }`}>
                        {String.fromCharCode(65 + i)}. {opt.text}
                      </span>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-slate-400 text-xs mt-2 italic">💡 {q.explanation}</p>
                  )}
                  <Badge variant="outline" className={`mt-2 text-xs border-0 bg-transparent ${q.source === 'ai' ? 'text-purple-600' : 'text-primary'}`}>
                    {q.source === 'ai' ? '🤖 AI Generated' : '✏️ Manual'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CANDIDATES TAB ───────────────────────────────────────────────────────────

function CandidatesTab({ toast }: any) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [assigning, setAssigning] = useState<any>(null);
  const [selectedExamForAssign, setSelectedExamForAssign] = useState("");

  useEffect(() => {
    fetchCandidates();
    fetchExams();
  }, []);

  const fetchCandidates = async () => {
    const res = await fetch(`${API_BASE}/api/interview/candidates`, { headers: authHeaders() });
    const data = await res.json();
    if (Array.isArray(data)) setCandidates(data);
  };

  const fetchExams = async () => {
    const res = await fetch(`${API_BASE}/api/interview/exams`, { headers: authHeaders() });
    const data = await res.json();
    if (Array.isArray(data)) setExams(data);
  };

  const assignToExam = async (candidateId: string) => {
    if (!selectedExamForAssign) {
      toast({ title: "Select an exam first", variant: "destructive" });
      return;
    }
    const res = await fetch(`${API_BASE}/api/interview/exams/${selectedExamForAssign}/assign`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ candidate_ids: [candidateId] })
    });
    if (res.ok) {
      toast({ title: "Assigned", description: "Candidate assigned to exam" });
      setAssigning(null);
      fetchCandidates();
    }
  };

  const deleteCandidate = async (id: string) => {
    if (!confirm("Delete this candidate account?")) return;
    await fetch(`${API_BASE}/api/interview/candidates/${id}`, {
      method: "DELETE", headers: authHeaders()
    });
    fetchCandidates();
  };

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blocked: "bg-red-50 text-red-600 border-red-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-slate-700 text-sm font-bold uppercase tracking-wide">
          All Candidates ({candidates.length})
        </h3>
        <Button onClick={fetchCandidates} size="sm" variant="outline" className="h-8 px-3 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {candidates.length === 0 && (
        <div className="text-center p-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No candidates created yet.</p>
          <p className="text-slate-400 text-sm">Use the "Add Candidate" tab to create accounts.</p>
        </div>
      )}

      <div className="space-y-3">
        {candidates.map(c => (
          <div key={c._id || c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-slate-900 font-semibold">{c.full_name}</p>
                  <Badge className={`text-xs border font-medium ${STATUS_COLORS[c.status] || "bg-slate-100 text-slate-500 border-slate-200"}`}>
                    {c.status}
                  </Badge>
                </div>
                <p className="text-slate-400 text-xs mt-1 font-medium">
                  @{c.username} · {c.email} · {c.mobile_number}
                </p>
                {c.exam_title ? (
                  <p className="text-primary text-xs mt-1.5 font-medium">📋 {c.exam_title} · {c.exam_date} {c.exam_time}</p>
                ) : (
                  <p className="text-amber-500 text-xs mt-1.5 font-medium">⚠️ No exam assigned</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => setAssigning(c._id || c.id)}
                  className="h-8 px-3 rounded-xl border-primary/30 text-primary hover:bg-primary/5 text-xs font-semibold">
                  <Send className="w-3 h-3 mr-1.5" /> Assign
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteCandidate(c._id || c.id)}
                  className="text-red-400 hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0 rounded-xl">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Inline assign panel */}
            {assigning === (c._id || c.id) && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2 items-center">
                <Select value={selectedExamForAssign} onValueChange={setSelectedExamForAssign}>
                  <SelectTrigger className="h-9 rounded-xl bg-slate-50 border-slate-200 text-slate-700 text-xs flex-1 focus:bg-white">
                    <SelectValue placeholder="Select exam..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {exams.map(e => (
                      <SelectItem key={e._id || e.id} value={e._id || e.id} className="text-xs font-medium">
                        {e.title} — {e.scheduled_date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => assignToExam(c._id || c.id)} className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold">
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAssigning(null)} className="h-9 px-3 rounded-xl text-slate-400 text-xs">
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CREATE CANDIDATE TAB ─────────────────────────────────────────────────────

function CreateCandidateTab({ toast }: any) {
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [assignExamId, setAssignExamId] = useState('');
  const [tab, setTab] = useState<'roster'|'manual'>('roster');
  const [form, setForm] = useState({
    full_name: "", email: "", mobile_number: "",
    username: "", password: "", assigned_exam_id: ""
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/interview/exams`, { headers: authHeaders() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setExams(d); });
    // Fetch all students from instructor's courses and batches
    fetch(`${API_BASE}/api/instructor/students`, { headers: authHeaders() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setStudents(d); })
      .catch(() => setStudents([]));
  }, []);

  const filteredStudents = students.filter(s =>
    !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStudent = (s: any) => {
    setSelectedStudents(prev =>
      prev.find(p => p.user_id === s.user_id || p._id === s._id)
        ? prev.filter(p => p.user_id !== s.user_id && p._id !== s._id)
        : [...prev, s]
    );
  };

  const handleBulkCreate = async () => {
    if (selectedStudents.length === 0) {
      toast({ title: "No students selected", description: "Select at least one student.", variant: "destructive" });
      return;
    }
    setSaving(true);
    let successCount = 0;
    const errors: string[] = [];
    for (const s of selectedStudents) {
      try {
        const payload = {
          full_name: s.full_name,
          email: s.email,
          mobile_number: s.mobile_number || s.phone || '',
          username: s.email,
          password: `Interview@${(s.roll_number || s.email.split('@')[0]).replace(/\s/g,'')}`,
          assigned_exam_id: assignExamId || undefined,
        };
        const res = await fetch(`${API_BASE}/api/interview/candidates`, {
          method: "POST", headers: authHeaders(), body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) { successCount++; }
        else { errors.push(`${s.full_name}: ${data.error || 'failed'}`); }
      } catch (e) { errors.push(`${s.full_name}: network error`); }
    }
    setSaving(false);
    setSelectedStudents([]);
    if (successCount > 0) toast({ title: `✅ ${successCount} candidates created`, description: errors.length > 0 ? errors.join(', ') : 'All done!' });
    else toast({ title: "Failed", description: errors.join(', '), variant: "destructive" });
  };

  const handleCreate = async () => {
    if (!form.full_name || !form.email || !form.username || !form.password) {
      toast({ title: "Error", description: "Full name, email, username, and password are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/interview/candidates`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setCreated(data);
        toast({ title: "Candidate Created!", description: `Account created for ${form.full_name}` });
        setForm({ full_name: "", email: "", mobile_number: "", username: "", password: "", assigned_exam_id: "" });
      } else {
        toast({ title: "Error", description: data.error || JSON.stringify(data), variant: "destructive" });
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Tab switcher */}
      <div className="flex gap-2">
        <Button size="sm" variant={tab === 'roster' ? 'default' : 'outline'} onClick={() => setTab('roster')} className="rounded-xl h-9 px-5 font-bold text-xs">
          <Users className="w-3.5 h-3.5 mr-2" /> From Student Roster
        </Button>
        <Button size="sm" variant={tab === 'manual' ? 'default' : 'outline'} onClick={() => setTab('manual')} className="rounded-xl h-9 px-5 font-bold text-xs">
          <UserPlus className="w-3.5 h-3.5 mr-2" /> Manual Entry
        </Button>
      </div>

      {tab === 'roster' && (
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-slate-900 font-bold flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-primary" /> Select Students from Roster
            </CardTitle>
            <p className="text-slate-400 text-xs">Click to select students. They'll be added as interview candidates automatically.</p>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Search + assign exam */}
            <div className="flex gap-3">
              <Input
                placeholder="Search by name, roll number, email..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="h-9 rounded-xl bg-slate-50 border-slate-200 text-sm flex-1"
              />
              <Select value={assignExamId} onValueChange={v => setAssignExamId(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs w-48">
                  <SelectValue placeholder="Assign exam..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none" className="text-slate-400 text-xs">No exam</SelectItem>
                  {exams.map(e => (
                    <SelectItem key={e._id || e.id} value={e._id || e.id} className="text-xs">{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student grid — card style matching the roster screenshot */}
            <div className="max-h-96 overflow-y-auto pr-1">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-medium">No students found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredStudents.map(s => {
                    const uid = s.user_id || s._id;
                    const isSelected = selectedStudents.some(p => (p.user_id || p._id) === uid);
                    const initials = (s.full_name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                    const batchLabel = s.department || '';
                    return (
                      <div
                        key={uid}
                        onClick={() => toggleStudent(s)}
                        className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer border-2 transition-all ${
                          isSelected
                            ? 'bg-primary/5 border-primary/40 shadow-sm'
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                          <span className="text-sm font-black text-slate-600">{initials}</span>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{s.full_name}</p>
                          {s.roll_number && (
                            <p className="text-[11px] text-indigo-600 font-semibold truncate uppercase tracking-wider">
                              {s.roll_number}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                        </div>
                        {/* Batch badge */}
                        {batchLabel && (
                          <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wide">
                            {batchLabel}
                          </span>
                        )}
                        {/* Select/deselect indicator */}
                        <div
                          onClick={e => { e.stopPropagation(); toggleStudent(s); }}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all ${
                            isSelected ? 'bg-rose-50 border-rose-200 text-rose-400 hover:bg-rose-100' : 'border-slate-200 text-slate-300 hover:border-slate-300'
                          }`}
                          title={isSelected ? 'Remove' : 'Add'}
                        >
                          {isSelected ? (
                            <span className="text-[12px] font-black">✕</span>
                          ) : (
                            <span className="text-[12px] font-black">+</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected summary + create button */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <p className="text-sm font-bold text-slate-600">
                {selectedStudents.length === 0
                  ? 'No students selected'
                  : `${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''} selected`
                }
              </p>
              <Button
                onClick={handleBulkCreate}
                disabled={saving || selectedStudents.length === 0}
                className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                {saving ? 'Creating...' : `Create ${selectedStudents.length > 0 ? selectedStudents.length : ''} Candidate${selectedStudents.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'manual' && (
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="pb-4 border-b border-slate-50">
            <CardTitle className="text-slate-900 font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> New Interview Candidate
            </CardTitle>
            <p className="text-slate-500 text-sm font-medium">Create login credentials manually. No self-registration is allowed.</p>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full Name *" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} placeholder="Candidate full name" />
              <Field label="Email *" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" placeholder="candidate@email.com" />
              <Field label="Mobile Number" value={form.mobile_number} onChange={v => setForm(f => ({ ...f, mobile_number: v }))} placeholder="+91 9999999999" />
              <Field label="Username *" value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))} placeholder="candidate_username" />
              <Field label="Password *" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} type="password" placeholder="Set a secure password" />
              <div>
                <Label className="text-slate-700 text-sm font-semibold">Assign Exam (Optional)</Label>
                <Select value={form.assigned_exam_id} onValueChange={v => setForm(f => ({ ...f, assigned_exam_id: v === "none" ? "" : v }))}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-700 mt-1 focus:bg-white">
                    <SelectValue placeholder="Select exam..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="none" className="text-slate-400 font-medium">No exam assigned</SelectItem>
                    {exams.map(e => (
                      <SelectItem key={e._id || e.id} value={e._id || e.id} className="font-medium">
                        {e.title} — {e.scheduled_date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving} className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm mt-2">
              {saving ? 'Creating...' : <><UserPlus className="w-4 h-4 mr-2" /> Create Candidate Account</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {created && (
        <Card className="border-emerald-200 shadow-sm rounded-2xl overflow-hidden bg-emerald-50/60">
          <CardHeader className="pb-3 border-b border-emerald-100">
            <CardTitle className="text-emerald-700 text-base font-bold">✅ Candidate Account Created</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <p className="text-slate-600 text-sm font-medium">Share these credentials with the candidate:</p>
            <div className="bg-white border border-slate-200 rounded-xl p-4 font-mono text-sm space-y-1.5 shadow-sm">
              <p><span className="text-slate-400">Portal URL:</span> <span className="text-slate-800 font-semibold">{window.location.origin}/interview-login</span></p>
              <p><span className="text-slate-400">Username:</span> <span className="text-emerald-700 font-bold">{created.credentials?.username}</span></p>
              <p><span className="text-slate-400">Password:</span> <span className="text-emerald-700 font-bold">{created.credentials?.password}</span></p>
            </div>
            <p className="text-slate-400 text-xs">⚠️ Store these credentials safely. Password cannot be recovered — only reset.</p>
            <Button size="sm" variant="outline" onClick={() => setCreated(null)} className="h-8 px-4 rounded-xl border-slate-200 text-slate-500 hover:bg-white">Dismiss</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── SHARED HELPER ─────────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = "text", placeholder = "", min }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; min?: string;
}) {
  return (
    <div>
      <Label className="text-slate-700 text-sm font-semibold">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 mt-1 focus:bg-white transition-all"
      />
    </div>
  );
}