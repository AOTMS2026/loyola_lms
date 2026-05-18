import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardCheck, Clock, CheckCircle2, AlertCircle, ChevronRight, 
  MessageSquare, Mic, Play, Square, Loader2, Info, Search, Filter,
  BookOpen, User as UserIcon, Calendar, Star, Send, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { fetchWithAuth } from '@/lib/api';
import { cn } from "@/lib/utils";
import { SyncDataButton } from './data/SyncDataButton';

interface QuestionSnapshot {
  question_id: string;
  question_text: string;
  type: string;
  marks: number;
  correct_answer?: string;
  student_answer?: string;
}

interface PendingResult {
  _id: string;
  student_id: {
    _id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  test_title: string;
  exam_id?: string;
  mock_paper_id?: string;
  submitted_at: string;
  grading_status: 'pending' | 'reevaluation';
  reevaluation_reason?: string;
  score: number;
  total_questions: number;
  answers: Record<string, string>;
  questions_snapshot?: QuestionSnapshot[];
}

interface Question {
  _id: string;
  question_text: string;
  type: string;
  marks: number;
  correct_answer?: string;
}

interface SubjectiveGrade {
  marks: number;
  feedback: string;
}

interface SubmissionsGradingProps {
  onSync?: () => void;
  loading?: boolean;
}

export default function SubmissionsGrading({ onSync, loading: parentLoading = false }: SubmissionsGradingProps) {
  const [submissions, setSubmissions] = useState<PendingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<PendingResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Grading state
  const [subjectiveGrading, setSubjectiveGrading] = useState<Record<string, SubjectiveGrade>>({});
  const [globalFeedback, setGlobalFeedback] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  
  // Search/Filter
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async (showToast = false) => {
    setLoading(true);
    try {
      const data = await fetchWithAuth<PendingResult[]>('/instructor/pending-grading');
      setSubmissions(data || []);
      if (showToast) {
        toast.success("Submissions synchronized");
      }
    } catch {
      toast.error("Failed to load pending submissions");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = (sub: PendingResult) => {
    setSelectedSubmission(sub);
    setLoadingDetail(true);
    setSubjectiveGrading({});
    setGlobalFeedback("");
    
    try {
      // Use the snapshot directly if available
      let subjectiveFs: Question[] = [];
      
      if (sub.questions_snapshot && sub.questions_snapshot.length > 0) {
        // Snapshot already has question details
        subjectiveFs = sub.questions_snapshot
          .filter(q => ['short', 'long', 'subjective', 'short_answer', 'long_answer', 'coding'].includes(q.type))
          .map(q => ({
            _id: q.question_id,
            question_text: q.question_text,
            type: q.type,
            marks: q.marks,
            correct_answer: q.correct_answer
          }));
      }
      
      setQuestions(subjectiveFs);
      
      // Initialize grading state
      const initial: Record<string, SubjectiveGrade> = {};
      subjectiveFs.forEach(q => {
        initial[q._id] = { marks: 0, feedback: "" };
      });
      setSubjectiveGrading(initial);
    } catch {
      toast.error("Failed to process submission details");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleMarkChange = (qId: string, val: string) => {
    const marks = parseFloat(val) || 0;
    setSubjectiveGrading(prev => ({
      ...prev,
      [qId]: { ...prev[qId], marks }
    }));
  };

  const handleFeedbackChange = (qId: string, feedback: string) => {
    setSubjectiveGrading(prev => ({
      ...prev,
      [qId]: { ...prev[qId], feedback }
    }));
  };

  const submitGrades = async () => {
    if (!selectedSubmission) return;
    setIsGrading(true);
    
    try {
      await fetchWithAuth(`/instructor/grade-result/${selectedSubmission._id}`, {
        method: 'POST',
        body: JSON.stringify({
          subjective_grading: subjectiveGrading,
          global_feedback: globalFeedback
        })
      });
      toast.success("Grading submitted successfully");
      setSelectedSubmission(null);
      loadSubmissions();
    } catch {
      toast.error("Failed to submit grades");
    } finally {
      setIsGrading(false);
    }
  };

  const filtered = submissions.filter(s => 
    s.student_id.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.test_title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] gap-6 p-2 lg:p-4 bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      
      {/* List Panel (Sidebar) */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4 bg-white/80 backdrop-blur-xl border border-slate-200 p-5 rounded-[2rem] shadow-xl flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 uppercase italic">
              Manual Grading
            </h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
              Review & Score Subjective Submissions
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <SyncDataButton 
              onSync={onSync || (() => loadSubmissions(true))} 
              isLoading={parentLoading || loading} 
              className="h-8 px-3 rounded-xl border-slate-200 hover:bg-slate-100 text-slate-600 font-extrabold text-[10px] uppercase tracking-wider transition-all"
            />
            <Badge className="h-6 gap-1 bg-indigo-50 text-indigo-600 border border-indigo-200 font-black text-[10px] rounded-lg shadow-sm">
              {submissions.length} Pending
            </Badge>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search students or tests..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-11 h-11 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl font-bold text-slate-800 placeholder-slate-400 text-xs shadow-sm transition-all duration-300"
          />
        </div>

        <ScrollArea className="flex-grow rounded-2xl border border-slate-200 bg-slate-50/50 pr-1">
          <div className="p-1 space-y-2.5">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-white border border-slate-100 rounded-2xl animate-pulse flex items-center justify-between p-4 shadow-sm">
                  <div className="flex items-center gap-3 w-3/4">
                    <div className="h-9 w-9 bg-slate-200 rounded-xl" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 bg-slate-200 rounded-md w-1/2" />
                      <div className="h-2.5 bg-slate-200 rounded-md w-1/3" />
                    </div>
                  </div>
                  <div className="h-4 w-4 bg-slate-200 rounded-full" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="h-14 w-14 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="h-6 w-6 text-indigo-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">All caught up!</p>
                  <p className="text-[10px] text-slate-500 font-bold">No pending subjective grading queues found.</p>
                </div>
              </div>
            ) : (
              filtered.map(sub => (
                <motion.div
                  key={sub._id}
                  onClick={() => loadDetail(sub)}
                  whileHover={{ scale: 1.015, y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col gap-3 relative overflow-hidden shadow-sm ${
                    selectedSubmission?._id === sub._id 
                    ? "bg-indigo-50/80 border-indigo-200" 
                    : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80"
                  }`}
                >
                  {selectedSubmission?._id === sub._id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-violet-500" />
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 rounded-xl border border-slate-200 shadow-sm">
                      <AvatarImage src={sub.student_id.avatar_url} />
                      <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-black">
                        {sub.student_id.full_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-xs truncate leading-tight ${selectedSubmission?._id === sub._id ? 'text-indigo-900 font-extrabold' : 'text-slate-800'}`}>
                        {sub.student_id.full_name}
                      </p>
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mt-0.5 truncate">
                        {sub.test_title || "Mock Test"}
                      </p>
                    </div>
                    {sub.grading_status === 'reevaluation' && (
                       <Badge className="bg-rose-50 text-rose-600 border border-rose-200 h-4.5 px-2 text-[8px] font-black tracking-wider uppercase rounded-md animate-pulse shadow-sm">
                         RE
                       </Badge>
                    )}
                    <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${selectedSubmission?._id === sub._id ? 'text-indigo-600 translate-x-0.5' : 'text-slate-400'}`} />
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[8px] font-black uppercase tracking-widest text-slate-500 font-mono">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </div>
                    <div>{sub.total_questions} Questions</div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Detail Panel */}
      <div className="flex-grow flex flex-col bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2rem] shadow-xl overflow-hidden min-h-[500px]">
        {!selectedSubmission ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 space-y-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-indigo-100 blur-2xl animate-pulse" />
              <div className="h-24 w-24 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-lg relative">
                <ClipboardCheck className="h-10 w-10 text-indigo-500" />
              </div>
            </div>
            <div className="text-center space-y-2 max-w-sm">
              <p className="text-sm font-black uppercase tracking-widest text-slate-400 italic">Audit Console Offline</p>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Select a pending student submission from the sidebar to initialize manual grading workspace.
              </p>
            </div>
          </div>
        ) : loadingDetail ? (
          <div className="flex-grow flex flex-col items-center justify-center p-8">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Initializing manual audit sandbox...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header section (Frosted Glass Context Banner) */}
            <div className="px-8 py-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/60 backdrop-blur-md gap-4 flex-shrink-0">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 rounded-2xl border border-slate-200 shadow-md">
                  <AvatarImage src={selectedSubmission.student_id.avatar_url} />
                  <AvatarFallback className="bg-slate-100 text-slate-800 font-black">
                    {selectedSubmission.student_id.full_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    {selectedSubmission.student_id.full_name}
                    {selectedSubmission.grading_status === 'reevaluation' && (
                      <span className="text-[8px] font-black bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">Re-evaluation</span>
                    )}
                  </h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{selectedSubmission.student_id.email}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs sm:text-sm font-black text-indigo-600">{selectedSubmission.test_title}</p>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5 font-mono">
                  Submitted {new Date(selectedSubmission.submitted_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Questions Grading Area */}
            <ScrollArea className="flex-grow px-8 py-6">
              <div className="max-w-3xl mx-auto space-y-12 pb-12">
                
                {selectedSubmission.grading_status === 'reevaluation' && (
                  <div className="p-5 bg-rose-50/50 rounded-3xl border border-rose-200 flex items-start gap-4 shadow-sm">
                    <div className="h-10 w-10 rounded-2xl bg-white border border-rose-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <AlertCircle className="h-5 w-5 text-rose-500 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1 font-mono">Student Re-evaluation Reason:</p>
                      <p className="text-xs font-semibold text-rose-700 leading-normal">"{selectedSubmission.reevaluation_reason || "No specific reason provided."}"</p>
                    </div>
                  </div>
                )}

                <div className="space-y-12">
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                    <BookOpen className="h-4.5 w-4.5 text-indigo-500" />
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Subjective Audits ({questions.length})</h3>
                  </div>

                  {questions.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-300">
                      <Info className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">No subjective items requiring manual score</p>
                    </div>
                  ) : (
                    questions.map((q, i) => (
                      <div key={q._id} className="space-y-4">
                        <div className="flex items-start gap-4">
                          <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-xs flex-shrink-0 shadow-md">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base sm:text-lg font-black text-slate-900 leading-relaxed mb-4">{q.question_text}</h4>
                            
                            {/* Student Answer Box */}
                            {q.type === 'coding' ? (
                              /* Mac-Style Premium IDE Editor Mockup - Keeping it dark for code aesthetic */
                              <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden mb-6">
                                <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-red-500/80 shadow-md" />
                                    <div className="h-3 w-3 rounded-full bg-yellow-500/80 shadow-md" />
                                    <div className="h-3 w-3 rounded-full bg-green-500/80 shadow-md" />
                                  </div>
                                  <div className="px-3 py-1 bg-slate-950 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono border border-slate-800">
                                    submission.py
                                  </div>
                                  <div className="w-12" />
                                </div>
                                <div className="p-6 overflow-x-auto">
                                  <pre className="text-xs sm:text-sm font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap">
                                    <code>{selectedSubmission.answers[q._id] || "# — No code answer submitted —"}</code>
                                  </pre>
                                </div>
                              </div>
                            ) : (
                              /* Clean Glassmorphic Subjective Text box */
                              <div className="rounded-2xl p-5 border border-slate-200 bg-slate-50 shadow-inner mb-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 left-0 h-1 bg-slate-200/50" />
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2 font-mono">Student Response:</p>
                                <p className="text-slate-800 text-[14px] leading-relaxed font-semibold whitespace-pre-wrap">
                                  {selectedSubmission.answers[q._id] || "— No Answer Provided —"}
                                </p>
                              </div>
                            )}

                            {/* Reference Ideal Answer */}
                            {q.correct_answer && (
                              <div className="rounded-2xl mb-6 overflow-hidden border border-dashed border-emerald-300 bg-emerald-50">
                                <div className="bg-emerald-100/50 py-2 px-5 border-b border-emerald-200 flex items-center justify-between">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 font-mono">Reference Benchmark / Correct Key</p>
                                </div>
                                <div className="py-4 px-5 text-xs font-semibold text-emerald-800 leading-relaxed whitespace-pre-wrap font-mono">
                                  {q.correct_answer}
                                </div>
                              </div>
                            )}

                            {/* Scoring Slider and Question Feedback */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                              {/* Left: Score Assigner */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Scale Score</p>
                                  <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-mono">Max: {q.marks || 1} Marks</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="relative">
                                    <Input 
                                      type="number" 
                                      min="0"
                                      max={q.marks}
                                      value={subjectiveGrading[q._id]?.marks || 0}
                                      onChange={e => handleMarkChange(q._id, e.target.value)}
                                      className="h-11 w-24 bg-white border border-slate-300 focus:border-indigo-500 rounded-xl text-center font-black text-base text-slate-900 shadow-sm"
                                    />
                                  </div>
                                  
                                  {/* Dynamic color shifting status line */}
                                  <div className="flex-1 h-2.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden relative">
                                    <div 
                                      className={cn(
                                        "h-full rounded-full transition-all duration-300",
                                        (subjectiveGrading[q._id]?.marks || 0) >= (q.marks * 0.8) ? "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" :
                                        (subjectiveGrading[q._id]?.marks || 0) >= (q.marks * 0.4) ? "bg-gradient-to-r from-amber-400 to-indigo-400" :
                                        "bg-gradient-to-r from-rose-500 to-orange-400"
                                      )}
                                      style={{ width: `${Math.min(((subjectiveGrading[q._id]?.marks || 0) / (q.marks || 1)) * 100, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Right: Question Specific Comment */}
                              <div className="space-y-2">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Micro Feedback</p>
                                <Textarea 
                                  placeholder="Specific feedback notes for this question..."
                                  value={subjectiveGrading[q._id]?.feedback || ""}
                                  onChange={e => handleFeedbackChange(q._id, e.target.value)}
                                  className="min-h-[44px] bg-white border border-slate-300 focus:border-indigo-500 rounded-xl font-bold py-2 px-3 text-xs text-slate-800 placeholder-slate-400 shadow-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        {i < questions.length - 1 && <div className="h-px w-full bg-slate-200 my-8" />}
                      </div>
                    ))
                  )}
                </div>

                <div className="h-px w-full bg-slate-200 my-10" />

                {/* Overall grading and Feedback */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2.5">
                    <Star className="h-4.5 w-4.5 text-amber-500" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Overall Review & Audio Remarks</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">General Remarks (Typed Summary)</p>
                      <Textarea 
                        placeholder="Provide global feedback review..."
                        value={globalFeedback}
                        onChange={e => setGlobalFeedback(e.target.value)}
                        className="h-32 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-3xl p-5 text-sm font-bold text-slate-800 placeholder-slate-400 shadow-inner"
                      />
                    </div>
                    
                    {/* Glassmorphic Animated Mic Feedback */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Direct Vocal Feedback</p>
                      <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col items-center justify-center gap-3 text-center min-h-[128px] group hover:border-indigo-300 transition-all duration-300 shadow-sm">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-indigo-100 blur-md animate-ping" />
                          <div className="h-12 w-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shadow-sm text-indigo-500 cursor-pointer hover:scale-105 hover:bg-indigo-500 hover:text-white transition-all duration-300">
                            <Mic className="h-5 w-5" />
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Audio Feedback</p>
                          <p className="text-[8px] font-bold text-slate-500 mt-1 max-w-[130px] mx-auto leading-relaxed">Speak directly to student's portal</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Grade Actions */}
                <div className="flex items-center justify-end gap-3 pt-10 border-t border-slate-200">
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedSubmission(null)}
                    className="h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  >
                    Dismiss Sandbox
                  </Button>
                  <Button 
                    disabled={isGrading}
                    onClick={submitGrades}
                    className="h-11 px-8 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-200 gap-2 border border-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                  >
                    {isGrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Finalize & Push Score
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
