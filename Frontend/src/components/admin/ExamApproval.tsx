import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MoreVertical, 
  Eye, 
  Search, 
  Filter, 
  History,
  FileText,
  Calendar,
  ShieldCheck,
  BrainCircuit,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Trash2,
  Loader2,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  useExams, 
  useUpdateExam, 
  useDeleteExam,
  useCourses,
  type Exam 
} from '@/hooks/useManagerData'; 
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { format } from 'date-fns';

export function ExamApproval() {
  const queryClient = useQueryClient();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: courses = [] } = useCourses();
  const updateExam = useUpdateExam();
  const deleteExam = useDeleteExam();
  const { toast } = useToast();
  
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const fetchExams = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchWithAuth('/admin/exams-list') as Exam[];
      // Normalize _id → id so exam.id is always available
      setExams((data || []).map((e: any) => ({ ...e, id: e.id || e._id?.toString?.() || '' })));
    } catch (error) {
       toast({ title: 'Fetch Error', description: 'Slow network or system lag detected.', variant: 'destructive' });
    } finally {
       setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const filteredExams = (exams || []).filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || (e.approval_status || 'pending') === filter;
    return matchesSearch && matchesFilter;
  });

  const handleUpdateStatus = async (id: string, approval_status: string) => {
    try {
      const selectedExam = (exams || []).find(e => e.id === id);
      
      await updateExam.mutateAsync({ 
        id, 
        approval_status, 
        course_id: approval_status === 'approved' ? (selectedCourseId || selectedExam?.course_id) : undefined,
        status: approval_status === 'approved' ? 'ready' : 'cancelled' 
      });

      // If approved, also try to approve all questions with this topic
      if (approval_status === 'approved' && selectedExam?.title) {
        try {
          await fetchWithAuth(`/admin/question-bank/${encodeURIComponent(selectedExam.title)}/approve`, {
            method: 'PUT'
          });
        } catch (qErr) {
          console.warn('Failed to auto-approve questions for this exam:', qErr);
        }
      }

      toast({ title: 'Protocol Updated', description: `Exam has been ${approval_status}` });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['question-bank-summary'] });
      fetchExams();
    } catch (err) {
      toast({
        title: 'Operation Failed',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("PERMANENT PROTOCOL PURGE: Are you sure you want to permanently delete this assessment? This cannot be undone.")) return;
    
    try {
      await deleteExam.mutateAsync(id);
      toast({
        title: 'Protocol Purged',
        description: 'The assessment has been permanently removed from the system.',
        variant: 'destructive'
      });
      setIsDetailOpen(false);
      fetchExams();
    } catch (error) {
       toast({ title: 'System Error', description: 'Failed to delete assessment.', variant: 'destructive' });
    }
  };

  // Instant-fetch mode: Bypass full-page blocking loader
  // if (isLoading && !exams) return <div ...> is gone.
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl sm:text-3xl font-black tracking-tight text-slate-900">Quality Assurance</h2>
          <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Review & Protocol Verification for Assessments</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
           <Button 
            variant="outline" 
            size="sm" 
            className="h-9 sm:h-11 px-3 sm:px-4 rounded-xl border-slate-100 bg-white shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-400 gap-2 hover:bg-slate-50 transition-all active:scale-95"
            onClick={fetchExams}
            disabled={isLoading}
           >
             <RefreshCw className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isLoading && "animate-spin text-primary")} />
             <span className="hidden sm:inline">Manual Audit Sync</span>
             <span className="sm:hidden">Sync</span>
           </Button>

           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
              <Input 
                placeholder="Search..." 
                className="h-9 sm:h-11 w-40 sm:w-64 rounded-xl border-slate-100 bg-white shadow-sm pl-10 text-xs font-bold" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
           
           <div className="flex bg-slate-100 rounded-xl p-1 overflow-x-auto">
             {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
               <Button 
                key={f}
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                  filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                )}
                onClick={() => setFilter(f)}
               >
                 {f}
               </Button>
             ))}
           </div>
        </div>
      </div>

      <div className="grid gap-6">
         <AnimatePresence mode="popLayout">
           {filteredExams.length > 0 ? filteredExams.map((exam) => (
             <motion.div
               layout
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95 }}
               key={exam.id}
               className="group flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] bg-white border border-slate-100 hover:border-primary/20 hover:shadow-2xl transition-all duration-500"
             >
                <div className="flex items-center gap-3 sm:gap-6">
                   <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl sm:rounded-3xl bg-slate-900 overflow-hidden relative group-hover:scale-105 transition-transform duration-500 flex-shrink-0">
                      {exam.assigned_image ? (
                        <img src={exam.assigned_image} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
                           <FileText className="h-6 w-6 text-white/10" />
                        </div>
                      )}
                   </div>
                   
                   <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-800 text-base sm:text-lg leading-none">{exam.title}</h4>
                        <Badge className={cn(
                          "h-5 text-[9px] font-black uppercase border-none px-2 rounded-full",
                          exam.approval_status === 'pending' ? "bg-amber-100 text-amber-600" :
                          exam.approval_status === 'approved' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                        )}>
                          {exam.approval_status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                        <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {exam.scheduled_date ? format(new Date(exam.scheduled_date), 'MMM dd, hh:mm a') : 'Unscheduled'}</span>
                        <span className="flex items-center gap-1.5"><History className="h-3 w-3" /> {exam.duration_minutes} Mins</span>
                        <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> {exam.proctoring_enabled ? 'SECURE' : 'OPEN'}</span>
                      </div>
                   </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <Button 
                     variant="outline" 
                     className="h-10 sm:h-12 border-slate-100 rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:text-primary gap-2 transition-all hover:bg-slate-50 px-3 sm:px-4"
                    onClick={() => { setSelectedExam(exam); setIsDetailOpen(true); }}
                   >
                     <Eye className="h-4 w-4" /> <span className="hidden sm:inline">Comprehensive </span>Audit
                   </Button>
                   
                    <div className="flex gap-2">
                       {exam.approval_status === 'pending' && (
                         <>
                           <Button
                             size="sm"
                             variant="outline"
                             className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                             onClick={() => handleUpdateStatus(exam.id, 'approved')}
                           >
                             <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                           </Button>
                           <Button
                             size="sm"
                             variant="outline"
                             className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                             onClick={() => handleUpdateStatus(exam.id, 'rejected')}
                           >
                             <XCircle className="h-4 w-4 mr-1" /> Reject
                           </Button>
                         </>
                       )}
                       <Button 
                         className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-900 hover:text-white border-none shadow-none transition-all"
                         onClick={() => handleDelete(exam.id)}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
             </motion.div>
            )) : isLoading ? (
              <div className="py-24 text-center">
                 <div className="relative inline-block">
                    <div className="h-20 w-20 rounded-full border-4 border-slate-100 animate-[spin_3s_linear_infinite]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                 </div>
                 <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] mt-6 animate-pulse">Running Integrity Audit...</h4>
              </div>
            ) : (
              <div className="py-32 text-center border-4 border-dashed border-slate-400/30 rounded-[4rem] bg-slate-50/10 backdrop-blur-sm">
                 <ShieldAlert className="h-16 w-16 text-slate-900/20 mx-auto mb-6" />
                 <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Queue is Empty</h4>
                 <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-2">All protocols have been successfully reviewed</p>
              </div>
            )}
         </AnimatePresence>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl sm:rounded-[3rem] bg-white">
           <DialogHeader className="sr-only">
             <DialogTitle>Audit Assessment Protocol</DialogTitle>
             <DialogDescription>Review details before authorizing or denying.</DialogDescription>
           </DialogHeader>
           {selectedExam && (
             <div className="flex flex-col h-[700px]">
                <div className="h-40 relative bg-slate-900">
                   {selectedExam.assigned_image && (
                     <img src={selectedExam.assigned_image} className="w-full h-full object-cover opacity-60" alt="" />
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                   <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-10">
                      <h3 className="text-xl sm:text-3xl font-black text-white leading-tight">{selectedExam.title}</h3>
                      <p className="text-xs font-bold text-white/40 uppercase tracking-[0.3em] mt-1">Audit Protocol ID: {selectedExam.id.slice(0, 8)}</p>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-12 space-y-8 sm:space-y-12">
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      {[
                        { label: 'Complexity', value: selectedExam.exam_type, icon: Filter },
                        { label: 'Time Allocated', value: `${selectedExam.duration_minutes}m`, icon: Clock },
                        { label: 'Passing Mark', value: `${selectedExam.passing_marks}/${selectedExam.total_marks}`, icon: CheckCircle2 },
                        { label: 'Max Attempts', value: selectedExam.max_attempts, icon: History }
                      ].map((stat, i) => (
                        <div key={i} className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-100 space-y-1">
                           <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                              <stat.icon className="h-3 w-3" /> {stat.label}
                           </div>
                           <p className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight">{stat.value}</p>
                        </div>
                      ))}
                   </div>

                   <div className="space-y-6">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-3">
                         <ChevronRight className="h-3 w-3" /> Target Curriculum Association
                      </h4>
                      <div className="p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] bg-slate-900 border border-slate-800 space-y-4 shadow-2xl">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Associate with Active Course</Label>
                         <Select 
                            value={selectedCourseId || selectedExam.course_id || ""} 
                            onValueChange={setSelectedCourseId}
                            disabled={selectedExam.approval_status === 'approved'}
                         >
                            <SelectTrigger className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-white/5 border-white/10 text-white font-bold px-6 focus:ring-slate-700">
                               <SelectValue placeholder="Select Deployment Course..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-slate-800 bg-slate-900 text-slate-200">
                               {courses.map(course => (
                                 <SelectItem key={course.id} value={course.id} className="font-bold py-3 hover:bg-white/5 rounded-xl">
                                    {course.title}
                                 </SelectItem>
                               ))}
                            </SelectContent>
                         </Select>
                         <p className="text-[9px] font-bold text-slate-500 italic uppercase tracking-widest">
                            {selectedExam.approval_status === 'approved' 
                               ? "This protocol is locked to the curriculum above." 
                               : "Linked students will automatically receive this protocol upon authorization."}
                         </p>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-3">
                         <ShieldCheck className="h-3 w-3" /> Security & Protocol Suite
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                         {[
                           { label: 'Browser Isolation', active: selectedExam.browser_security, icon: ShieldAlert },
                           { label: 'AI Proctoring Live', active: selectedExam.proctoring_enabled, icon: Eye },
                           { label: 'Question Scrambling', active: selectedExam.shuffle_questions, icon: RefreshCw },
                           { label: 'Instant Score Reveal', active: selectedExam.show_results, icon: CheckCircle2 }
                         ].map((rule, i) => (
                           <div key={i} className="flex items-center justify-between p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-slate-100">
                              <div className="flex items-center gap-4">
                                 <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", rule.active ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-300")}>
                                    <rule.icon className="h-5 w-5" />
                                 </div>
                                 <p className="text-xs font-black uppercase tracking-widest text-slate-700">{rule.label}</p>
                              </div>
                              <Badge className={cn("border-none text-[8px] font-black uppercase rounded-full h-5 px-3", rule.active ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400")}>{rule.active ? 'Armed' : 'Inactive'}</Badge>
                           </div>
                         ))}
                      </div>
                   </div>

                   {selectedExam.description && (
                     <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-300">Candidate Instructions</h4>
                        <div className="p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] bg-slate-50 text-sm font-bold text-slate-500 leading-relaxed italic border-l-4 border-slate-200">
                           {selectedExam.description}
                        </div>
                     </div>
                   )}
                </div>

                <div className="p-4 sm:p-10 bg-slate-50/50 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                   <Button variant="ghost" className="h-12 sm:h-14 px-8 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400 hover:text-slate-900 group transition-all" onClick={() => setIsDetailOpen(false)}>
                      Close Session <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1" />
                   </Button>
                   
                    <div className="flex flex-wrap gap-2 sm:gap-4">
                       {selectedExam.approval_status === 'pending' && (
                         <>
                           <Button 
                             className="h-10 sm:h-14 px-4 sm:px-10 rounded-xl sm:rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2 sm:gap-3 shadow-xl shadow-rose-100"
                             onClick={() => handleUpdateStatus(selectedExam.id, 'rejected')}
                           >
                             <XCircle className="h-4 w-4" /> Deny Logic
                           </Button>
                           <Button 
                             className="h-10 sm:h-14 px-4 sm:px-10 rounded-xl sm:rounded-2xl pro-button-primary font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2 sm:gap-3 shadow-xl shadow-blue-200"
                             onClick={() => handleUpdateStatus(selectedExam.id, 'approved')}
                           >
                             <CheckCircle2 className="h-4 w-4" /> Authorize Session
                           </Button>
                         </>
                       )}
                       <Button 
                         className="h-10 sm:h-14 px-4 sm:px-10 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2 sm:gap-3 shadow-none border border-slate-200"
                         onClick={() => handleDelete(selectedExam.id)}
                       >
                         <Trash2 className="h-4 w-4" /> Nuke Assessment
                       </Button>
                    </div>
                </div>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}