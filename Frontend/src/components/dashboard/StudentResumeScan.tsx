import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Zap, 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle, 
  Trophy, 
  TrendingUp, 
  BrainCircuit, 
  ShieldCheck,
  History,
  Info,
  Calendar,
  ChevronRight,
  Target,
  Layout,
  Lightbulb,
  AlertCircle,
  X
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface ScanResult {
  _id: string;
  score: number;
  analysis: {
    missing_keywords: string[];
    formatting_issues: string[];
    suggestions: string[];
  };
  file_name: string;
  created_at: string;
}

export function StudentResumeScan() {
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch scan history
  const { data: history = [], isLoading: historyLoading } = useQuery<ScanResult[]>({
    queryKey: ['my-resume-scans'],
    queryFn: async () => {
      return await fetchWithAuth('/data/resumescans?limit=10&sort=created_at&order=desc');
    }
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      if (!file && !resumeText) throw new Error("Please provide a resume.");
      
      const formData = new FormData();
      if (file) formData.append('resume', file);
      if (resumeText) formData.append('text', resumeText);

      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://loyola-lms.onrender.com/api'}/student/scan-resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Scan failed");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Scan Complete!",
        description: `Analysis finished. Score: ${data.scan.score}/100`,
      });
      queryClient.invalidateQueries({ queryKey: ['my-resume-scans'] });
      setFile(null);
      setResumeText("");
    },
    onError: (error: Error) => {
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
        toast({
          title: "Invalid File Type",
          description: "Please upload your resume in PDF format only.",
          variant: "destructive",
        });
        e.target.value = ""; // Clear the input
        return;
      }
      setFile(selectedFile);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header Section */}
      <div className="grid lg:grid-cols-2 gap-8 items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="space-y-6">
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none font-black px-4 py-1 tracking-widest uppercase text-[10px]">
             3 Premium Scanning Chances
          </Badge>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
            Analyze Your Resume <br /> & Beat the Bot
          </h2>
          <p className="text-slate-600 font-medium text-lg leading-relaxed">
            Upload your resume and let our AI provide detailed feedback on how well it will perform in Applicant Tracking Systems.
          </p>
          
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
             <div className="h-12 w-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary">
                <Zap className="h-6 w-6" />
             </div>
             <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Scanning Status</p>
                <div className="flex items-center gap-2">
                   <p className="text-2xl font-black text-slate-900">{Math.max(0, 3 - history.length)} Left</p>
                   <Badge className="bg-amber-500 text-white text-[8px] h-4">BASIC</Badge>
                </div>
             </div>
          </div>
        </div>
        
        <div className="bg-white p-8 rounded-[2.5rem] text-slate-900 shadow-2xl shadow-slate-200/60 border border-slate-100 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
              <ShieldCheck className="h-32 w-32 text-primary" />
           </div>
           
           <div className="relative z-10 space-y-6">
              <h3 className="text-xl font-black flex items-center gap-2 text-slate-900">
                 <Upload className="h-5 w-5 text-primary" />
                 Instant Upload
              </h3>
              
              <div className="space-y-4">
                 <div className="relative">
                    <input 
                      type="file" 
                      id="resume-upload" 
                      hidden 
                      onChange={handleFileChange}
                       accept=".pdf"
                    />
                    <label 
                      htmlFor="resume-upload"
                      className="flex flex-col items-center justify-center py-10 px-6 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 hover:border-primary/30 transition-all group/upload"
                    >
                      {file ? (
                        <div className="flex items-center gap-3">
                           <FileText className="h-10 w-10 text-primary" />
                           <span className="font-black text-slate-900 truncate max-w-[200px]">{file.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 text-slate-300 mb-3 group-hover/upload:text-primary transition-colors" />
                          <p className="font-black text-slate-900 uppercase text-xs tracking-widest">Only PDF Files Allowed</p>
                          <p className="text-[10px] text-slate-600 font-bold mt-1">Up to 5MB total size</p>
                        </>
                      )}
                    </label>
                 </div>
                 
                 <div className="text-center py-2 relative">
                    <span className="px-4 bg-white text-slate-700 text-[10px] font-black uppercase tracking-[0.3em] relative z-10">Or Paste Text</span>
                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-100"></div>
                 </div>

                 <textarea 
                   placeholder="Or type/paste your resume content here..."
                   className="w-full h-28 bg-slate-50/50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary/30 focus:outline-none transition-all resize-none placeholder:text-slate-400"
                   value={resumeText}
                   onChange={(e) => setResumeText(e.target.value)}
                 />

                 <Button 
                   className="w-full h-16 bg-slate-900 hover:bg-black text-white font-black text-lg italic tracking-tighter rounded-2xl shadow-2xl shadow-slate-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                   disabled={(!file && !resumeText) || scanMutation.isPending || history.length >= 3}
                   onClick={() => scanMutation.mutate()}
                 >
                   {history.length >= 3 ? (
                     "NO CHANCES LEFT"
                   ) : scanMutation.isPending ? (
                     <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> ANALYZING...</>
                   ) : (
                     <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-amber-400 fill-amber-400" />
                        CALCULATE ATS SCORE
                     </div>
                   )}
                 </Button>
                 
                 <p className="text-[10px] text-center text-slate-500 font-black uppercase tracking-widest opacity-80">
                    Professional AI Review • Secure & Confidential
                 </p>
              </div>
           </div>
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
           <div>
              <h3 className="text-2xl font-black text-slate-900">Analysis History</h3>
              <p className="font-medium text-slate-500">Track your resume improvements over time</p>
           </div>
           <Badge variant="outline" className="h-8 rounded-full border-slate-200 bg-white px-4 font-bold shrink-0">
              {history.length} Previous Analysis
           </Badge>
        </div>

        {historyLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
             {[1, 2].map(i => <Skeleton key={i} className="h-64 w-full rounded-3xl" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[2.5rem] shadow-sm border border-slate-100 text-slate-400">
             <History className="h-16 w-16 mb-4 opacity-10" />
             <p className="text-lg font-bold">No History Found</p>
             <p className="text-sm">Start your first scan to see results here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
             {history.map((scan) => (
                <Card key={scan._id} className="pro-card border-none shadow-xl shadow-slate-200/40 bg-white overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                   <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100 p-5 sm:p-6">
                      <div className="flex flex-col xs:flex-row justify-between items-start gap-4">
                         <div className="space-y-1 min-w-0 flex-1">
                            <CardTitle className="text-lg font-black text-slate-900 truncate">
                               {scan.file_name}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest text-slate-400">
                               <Calendar className="h-3 w-3" />
                               {format(new Date(scan.created_at), 'MMMM dd, yyyy')}
                            </CardDescription>
                         </div>
                         <div className={`h-14 w-14 rounded-2xl flex flex-col items-center justify-center font-black text-lg shadow-inner shrink-0 ${
                            scan.score >= 80 ? 'bg-emerald-100 text-emerald-700' : 
                            scan.score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                         }`}>
                            <span className="text-[8px] leading-none opacity-60">SCORE</span>
                            {scan.score}
                         </div>
                      </div>
                   </CardHeader>
                   <CardContent className="p-5 sm:p-6 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                         <div className="space-y-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <BrainCircuit className="h-3 w-3" /> Missing Keywords
                           </p>
                           <div className="flex flex-wrap gap-1">
                              {scan.analysis.missing_keywords?.slice(0, 3).map((kw, i) => (
                                <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[8px] font-bold px-1.5 h-4">
                                   {kw}
                                </Badge>
                              ))}
                              {scan.analysis.missing_keywords?.length > 3 && (
                                <span className="text-[8px] font-black text-slate-400">+{scan.analysis.missing_keywords.length - 3} More</span>
                              )}
                           </div>
                         </div>
                         <div className="space-y-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <TrendingUp className="h-3 w-3" /> Top Advice
                           </p>
                           <p className="text-[11px] font-bold text-slate-600 line-clamp-2 italic leading-relaxed">
                              &ldquo;{scan.analysis.suggestions?.[0] || 'Keep optimizing your content'}&rdquo;
                           </p>
                         </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                         <div className="flex -space-x-2">
                            {[FileText, CheckCircle, Info].map((Icon, i) => (
                              <div key={i} className="h-7 w-7 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                 <Icon className="h-3 w-3 text-slate-400" />
                              </div>
                            ))}
                         </div>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           onClick={() => setSelectedScan(scan)}
                           className="font-bold text-accent hover:text-accent hover:bg-accent/5 text-[10px] h-8 px-3"
                         >
                            View Detailed Analysis <ChevronRight className="ml-1 h-3 w-3" />
                         </Button>
                      </div>
                   </CardContent>
                </Card>
             ))}
          </div>
        )}
      </div>

      {/* Analysis Modal */}
      <Dialog open={!!selectedScan} onOpenChange={(open) => !open && setSelectedScan(null)}>
        <DialogContent className="max-w-3xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl [&>button:last-child]:hidden">
           {selectedScan && (
             <div className="relative animate-in fade-in zoom-in duration-300">
               <button 
                 onClick={() => setSelectedScan(null)}
                 className="absolute top-6 right-6 z-50 h-10 w-10 rounded-full bg-black/10 hover:bg-black/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-90"
               >
                 <X className="h-5 w-5" />
               </button>
               <div className={`p-10 flex flex-col items-center justify-center text-white relative overflow-hidden ${
                  selectedScan.score >= 80 ? 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600' : 
                  selectedScan.score >= 60 ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600' : 
                  'bg-gradient-to-br from-rose-600 via-rose-500 to-pink-600'
               }`}>
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                  
                  <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                     <div className="h-28 w-28 rounded-full bg-white/20 backdrop-blur-xl flex flex-col items-center justify-center border-4 border-white/30 shadow-2xl animate-in zoom-in duration-500">
                        <span className="text-[10px] font-black tracking-[0.3em] opacity-80 uppercase leading-none mb-1">ATS Score</span>
                        <span className="text-5xl font-black">{selectedScan.score}</span>
                     </div>
                     <div className="space-y-1">
                        <h3 className="text-3xl font-black tracking-tight">{selectedScan.file_name}</h3>
                        <p className="text-white/80 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                           <ShieldCheck className="h-4 w-4" /> Comprehensive AI Audit
                        </p>
                     </div>
                  </div>
               </div>

               <div className="p-8 space-y-10 bg-slate-50/50 max-h-[50vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-5">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm">
                              <Target className="h-6 w-6" />
                           </div>
                           <div>
                              <h4 className="text-xl font-black text-slate-900 leading-tight">Missing Keywords</h4>
                              <p className="text-xs font-bold text-slate-500">Add these to your skills section</p>
                           </div>
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-2 p-6 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
                        {selectedScan.analysis.missing_keywords?.map((kw, i) => (
                           <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                              <Badge className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 font-bold px-4 py-2 text-sm rounded-xl">{kw}</Badge>
                           </motion.div>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-sm">
                           <Layout className="h-6 w-6" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 leading-tight">Formatting & Layout Audit</h4>
                     </div>
                     <div className="space-y-3">
                        {selectedScan.analysis.formatting_issues?.map((issue, i) => (
                           <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-start gap-4 bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm">
                              <div className="mt-1 h-6 w-6 rounded-full bg-amber-50 flex items-center justify-center shrink-0 text-amber-500 font-black text-xs">!</div>
                              <span className="text-sm font-bold text-slate-700 leading-relaxed">{issue}</span>
                           </motion.div>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                           <Lightbulb className="h-6 w-6" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 leading-tight">Expert Improvements</h4>
                     </div>
                     <div className="space-y-4">
                        {selectedScan.analysis.suggestions?.map((sug, i) => (
                           <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="flex items-start gap-5 bg-gradient-to-r from-white to-slate-50 p-6 rounded-[2rem] border border-primary/5 shadow-sm">
                              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><ChevronRight className="h-5 w-5" /></div>
                              <div className="space-y-1">
                                 <p className="text-[9px] font-black text-primary uppercase tracking-widest opacity-60">Step {i + 1}</p>
                                 <span className="text-sm font-black text-slate-800 leading-relaxed block">{sug}</span>
                              </div>
                           </motion.div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                     <Zap className="h-3 w-3 text-primary" /> Multi-Agent AI Analysis
                  </div>
                  <Button onClick={() => setSelectedScan(null)} className="bg-slate-900 text-white rounded-2xl px-10 h-14 font-black hover:bg-slate-800 shadow-xl transition-all">
                     Close Analysis
                  </Button>
               </div>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}