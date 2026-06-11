import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  useExams,
  useQuestions,
  useCreateExam,
  useUpdateExam,
  useDeleteExam,
  useCreateQuestion,
  useCourses,
  useBatches,
  type Exam,
} from "@/hooks/useManagerData";
import { useInstructorRatings } from "@/hooks/useInstructorData";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { fetchWithAuth } from "@/lib/api";
import {
  Plus,
  Edit,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Settings2,
  Loader2,
  Layout,
  Rocket,
  RefreshCw,
  X,
  Zap,
  ShieldCheck,
  Dna,
  ArrowRight,
  ArrowLeft,
  Target,
  AlertCircle,
  Trophy,
  Activity,
  ShieldAlert,
  GraduationCap,
  Scale,
  PlayCircle,
  FileText,
  Star,
  Shuffle,
  Brain,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { SyncDataButton } from "../admin/data/SyncDataButton";

// ─── 1. Validation Schema ────────────────────────────────────────────────────

const examSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  exam_type: z.string().min(1, "Please select an exam category"),
  course_id: z.string().optional(),
  target_batches: z.array(z.string()).default([]),
  custom_type: z.string().optional(),
  assigned_image: z.string().optional(),
  scheduled_date: z.string().optional(),
  duration_minutes: z.coerce
    .number()
    .min(5, "Duration must be at least 5 minutes")
    .default(60),
  total_marks: z.coerce
    .number()
    .min(1, "Total marks must be at least 1")
    .default(100),
  passing_percentage: z.coerce.number().min(0).max(100).default(40),
  negative_marking: z.coerce.number().min(0).default(0),
  max_attempts: z.coerce.number().min(1).default(1),
  show_results: z.boolean().default(true),
  browser_security: z.boolean().default(false),
  shuffle_questions: z.boolean().default(true),
  proctoring_enabled: z.boolean().default(false),
  topics: z.array(z.string()).default([]),
  source_topic: z.string().optional(),
  question_count: z.coerce.number().min(1).default(10),
  marking_scheme: z.enum(["standard", "weighted", "fixed"]).default("standard"),
  exam_mode: z.enum(["automated", "manual"]).default("automated"),
  custom_fields: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
}).refine((data) => {
  if (data.exam_type === 'others' && !data.custom_type) return false;
  return true;
}, {
  message: "Please specify the custom category",
  path: ["custom_type"]
}).refine((data) => {
  if (!data.scheduled_date) return true;
  const selected = new Date(data.scheduled_date).getTime();
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getTime();
  // Allow a 2 minute buffer
  return selected >= nowIST - 120000;
}, {
  message: "Scheduled time cannot be in the past",
  path: ["scheduled_date"]
});

type ExamFormValues = z.infer<typeof examSchema>;

const parseDateTime = (dtStr: string | undefined) => {
    if (!dtStr) return { date: '', h: '12', m: '00', p: 'AM' };
    const [d, t] = dtStr.split('T');
    if (!t) return { date: d, h: '12', m: '00', p: 'AM' };
    let [hh, mm] = t.split(':');
    let hNum = parseInt(hh, 10);
    const p = hNum >= 12 ? 'PM' : 'AM';
    if (hNum === 0) hNum = 12;
    if (hNum > 12) hNum -= 12;
    return { date: d, h: String(hNum).padStart(2, '0'), m: mm, p };
};

const compileDateTime = (date: string, h: string, m: string, p: string) => {
    if (!date) return '';
    let hNum = parseInt(h, 10);
    if (isNaN(hNum)) hNum = 12;
    if (p === 'PM' && hNum < 12) hNum += 12;
    if (p === 'AM' && hNum === 12) hNum = 0;
    return `${date}T${String(hNum).padStart(2, '0')}:${m || '00'}`;
};

interface GeneratedQuestion {
  id: string;
  text: string;
  type: string;
  options: { text: string; is_correct: boolean }[];
  correct_answer: string;
  difficulty: string;
}

// ─── 2. Internal Components ──────────────────────────────────────────────────

function getImageSrc(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  return `/s3/public/${path}`;
}

function ExamCard({
  exam,
  onUpdate,
  onDelete,
  onConfigure,
  isPast,
  userRole,
  onEdit,
}: {
  exam: Exam;
  onUpdate: (params: {
    id: string;
    status?: string;
    approval_status?: string;
  }) => void;
  onDelete: (id: string) => void;
  onConfigure?: (exam: Exam) => void;
  isPast?: boolean;
  userRole?: string | null;
  onEdit?: (exam: Exam) => void;
}) {
  const isPending = exam.approval_status === "pending";
  const isRejected = exam.approval_status === "rejected";
  const imgSource = getImageSrc(exam.assigned_image);

  return (
    <motion.div
      layout
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group h-full flex flex-col rounded-[2.5rem] border border-slate-100 bg-white shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden cursor-pointer",
        isPast && "opacity-75 grayscale-[0.2]",
      )}
      onClick={() => onConfigure?.(exam)}
    >
      <div className="h-44 relative bg-slate-50 overflow-hidden border-b border-slate-50">
        {imgSource ? (
          <img
            src={imgSource}
            className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-transform duration-700"
            alt={exam.title}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <Layout className="h-10 w-10 text-slate-200" />
          </div>
        )}

        <div className="absolute inset-0 bg-white/10 group-hover:bg-transparent transition-all duration-500 opacity-0 group-hover:opacity-100 backdrop-blur-[2px]" />

        <div className="absolute top-4 right-4 flex flex-col gap-2 scale-90 origin-top-right">
          <Badge className="bg-white hover:bg-white text-slate-900 border border-slate-100 text-[9px] font-bold uppercase tracking-widest h-6 rounded-full px-3 shadow-sm">
            {exam.exam_type}
          </Badge>
          <Badge
            className={cn(
              "border-none text-[9px] font-bold uppercase tracking-widest h-6 rounded-full px-3",
              isPending
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                : isRejected
                  ? "bg-rose-500 text-white"
                  : exam.status === "active"
                    ? "bg-slate-900 text-white animate-pulse"
                    : "bg-slate-900 text-white",
            )}
          >
            {isPending
              ? "Under review"
              : isRejected
                ? "Rejected"
                : exam.approval_status === "approved"
                  ? "Approved"
                  : exam.status || "Draft"}
          </Badge>
        </div>
      </div>

      <div className="p-4 sm:p-8 flex flex-col justify-between flex-1 space-y-4">
        <div className="space-y-3">
          <h4 className="font-bold text-base sm:text-xl text-slate-900 leading-tight transition-colors line-clamp-2 uppercase tracking-tighter">
            {exam.title}
          </h4>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[8px] font-black text-slate-900 uppercase tracking-widest">
            <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200">
              <Clock className="h-2.5 w-2.5 text-slate-900" /> {exam.duration_minutes}m
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200">
              <Target className="h-2.5 w-2.5 text-slate-900" /> {exam.total_marks}pts
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200">
              <ShieldAlert className="h-2.5 w-2.5 text-rose-600" /> -{exam.negative_marking || 0}
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200">
              <RefreshCw className="h-2.5 w-2.5 text-slate-900" /> {exam.max_attempts}x
            </span>
            <span className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded-lg border", exam.shuffle_questions ? "bg-emerald-100 border-emerald-200 text-emerald-900 font-black" : "bg-slate-100 border-slate-200 text-slate-900")}>
              <Shuffle className="h-2.5 w-2.5" /> {exam.shuffle_questions ? "Shuffled" : "Fixed"}
            </span>
          </div>

          {exam.custom_fields && exam.custom_fields.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
               {exam.custom_fields.slice(0, 3).map((f, i: number) => (
                 <Badge key={i} variant="outline" className="text-[7px] font-black uppercase tracking-tighter h-5 border-slate-200 text-slate-900 px-1.5 rounded-sm">
                    {f.label}: {f.value}
                 </Badge>
               ))}
               {exam.custom_fields.length > 3 && <span className="text-[7px] font-bold text-slate-300">+{exam.custom_fields.length - 3}</span>}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-900 uppercase tracking-widest pt-1">
             <CalendarIcon className="h-3 w-3" />
             {exam.scheduled_date && !isNaN(new Date(exam.scheduled_date).getTime())
               ? format(new Date(exam.scheduled_date), "MMM dd, hh:mm a")
               : "Unscheduled"}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
          {!isPast && exam.approval_status === "approved" && (
            <div className="flex flex-col xl:flex-row flex-1 gap-2">
              <div className="flex flex-col flex-1 xl:flex-[2] gap-1">
                <div className="px-4 h-11 bg-emerald-50 border border-emerald-100 rounded-xl xl:rounded-2xl flex items-center justify-center gap-2">
                   <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                   <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest">Protocol Approved</span>
                </div>
                {(exam as any).approved_by_info && (
                  <div className="flex items-center gap-1 px-1">
                    <span className="text-[9px] font-bold text-slate-600">
                      By: <span className="text-slate-800">{(exam as any).approved_by_info.full_name}</span>
                    </span>
                    {(exam as any).approved_by_info.roll_number && (
                      <span className="text-[9px] font-black text-primary uppercase">
                        · {(exam as any).approved_by_info.roll_number}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                className="flex-1 h-11 xl:h-12 rounded-xl xl:rounded-2xl border-slate-200 text-slate-900 hover:bg-slate-50 font-black text-[9px] uppercase tracking-widest transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigure?.(exam);
                }}
              >
                View Analysis
              </Button>
            </div>
          )}
          {exam.approval_status === "pending" && (
            <div className="flex flex-1 gap-2">
              <Button
                className="flex-1 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({
                    id: exam.id,
                    approval_status: "approved",
                    status: "ready",
                  });
                }}
              >
                Approve
              </Button>
              <Button
                className="flex-1 h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ id: exam.id, approval_status: "rejected" });
                }}
              >
                Reject
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-11 xl:h-12 w-11 xl:w-12 rounded-xl xl:rounded-2xl text-slate-900 hover:text-primary hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(exam);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 xl:h-12 w-11 xl:w-12 rounded-xl xl:rounded-2xl text-slate-900 hover:text-destructive hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(exam.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function ExamCardSkeleton() {
  return (
    <div className="relative group">
      <Card className="h-full rounded-[2.5rem] border-slate-100 bg-white/50 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="aspect-video relative overflow-hidden bg-slate-100">
          <Skeleton className="h-full w-full" />
        </div>
        <CardHeader className="space-y-4 p-6 sm:p-8">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 sm:px-8 pb-8 space-y-6">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6 w-16 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 3. Main Horizontal Scheduler ──────────────────────────────────────────

interface ExamSchedulerProps {
  onNavigateToRepository?: () => void;
  onSync?: () => void;
  loading?: boolean;
}

export function ExamScheduler({ onNavigateToRepository, onSync, loading: parentLoading = false }: ExamSchedulerProps) {
  const { user, userRole } = useAuth();
  const { data: rawRatings } = useInstructorRatings();
  const ratings = useMemo(() => Array.isArray(rawRatings) ? rawRatings : [], [rawRatings]);
  const { toast } = useToast();
  const { data: rawExams, isLoading, refetch } = useExams();
  const exams = useMemo(() =>
    (Array.isArray(rawExams) ? rawExams : []).map((e: any) => ({
      ...e,
      id: e.id || e._id?.toString?.() || ''
    })),
  [rawExams]);
  const { data: rawQuestions } = useQuestions();
  const questions = useMemo(() => Array.isArray(rawQuestions) ? rawQuestions : [], [rawQuestions]);
  const createExam = useCreateExam();
  const updateExam = useUpdateExam();
  const deleteExam = useDeleteExam();
  const { data: rawCourses } = useCourses();
  const courses = useMemo(() => Array.isArray(rawCourses) ? rawCourses : [], [rawCourses]);
  const { data: rawBatches } = useBatches();
  // Only show batches belonging to this instructor (for instructors), all batches for admin/manager
  const batches = useMemo(() => {
    const all = Array.isArray(rawBatches) ? rawBatches : [];
    if (userRole === 'instructor' && user?.id) {
      return all.filter(b => b.instructor_id === user.id || b.instructor_id?.toString() === user.id);
    }
    return all;
  }, [rawBatches, user?.id, userRole]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<
    GeneratedQuestion[]
  >([]);
  const [isOtherType, setIsOtherType] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [activeStatusTab, setActiveStatusTab] = useState(() =>
    // Default to 'approved' if useful; user can switch tabs
    "approved"
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      description: "",
      exam_type: "mock",
      assigned_image: "",
      duration_minutes: 60,
      total_marks: 100,
      passing_percentage: 40,
      negative_marking: 0,
      max_attempts: 1,
      show_results: true,
      browser_security: false,
      shuffle_questions: true,
      proctoring_enabled: false,
      topics: [],
      scheduled_date: "",
      source_topic: "",
      question_count: 10,
      marking_scheme: "standard",
      exam_mode: "automated",
      course_id: "",
      target_batches: [],
      custom_fields: [{ label: "Exam Type", value: "Standard" }],
    },
  });

  const customFields = form.watch("custom_fields") || [];

  const addCustomField = () => {
    form.setValue("custom_fields", [...customFields, { label: "", value: "" }]);
  };

  const removeCustomField = (index: number) => {
    const updated = [...customFields];
    updated.splice(index, 1);
    form.setValue("custom_fields", updated);
  };

  const updateCustomField = (index: number, key: 'label' | 'value', val: string) => {
    const updated = [...customFields];
    updated[index][key] = val;
    form.setValue("custom_fields", updated);
  };

  const onDropPoster = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const url = e.dataTransfer.getData("text/plain");
      if (url && (url.startsWith("http") || url.startsWith("data:"))) {
        form.setValue("assigned_image", url);
        toast({ title: "Visual Identity Attached" });
        return;
      }
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        try {
          setIsUploadingImage(true);
          const formData = new FormData();
          formData.append("file", file);
          
          const res = await fetchWithAuth<{ url: string }>("/upload", {
            method: "POST",
            body: formData,
          });
          
          form.setValue("assigned_image", res.url);
          toast({ title: "Visual Artwork Optimized & Secured" });
        } catch (error) {
          console.error("Image upload failed:", error);
          toast({ title: "Optimization Failed", variant: "destructive" });
        } finally {
          setIsUploadingImage(false);
        }
      }
    },
    [form, toast],
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      try {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append("file", file);
        
        const res = await fetchWithAuth<{ url: string }>("/upload", {
          method: "POST",
          body: formData,
        });
        
        form.setValue("assigned_image", res.url);
        toast({ title: "Visual Artwork Optimized & Secured" });
      } catch (error) {
        console.error("Image upload failed:", error);
        toast({ title: "Optimization Failed", variant: "destructive" });
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const onSubmitProfile = async (data: ExamFormValues) => {
    if (!user?.id) return;
    try {
      const passing_marks = Math.round(
        (data.total_marks * data.passing_percentage) / 100,
      );
      
      const { custom_type, ...restData } = data;
      const final_exam_type = data.exam_type === 'others' ? custom_type : data.exam_type;

      const scheduled_date_val = (() => {
        if (!data.scheduled_date) return new Date().toISOString();
        const parts = data.scheduled_date.split('T');
        if (parts.length < 2) return new Date(data.scheduled_date).toISOString();
        const [datePart, timePart] = parts;
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes).toISOString();
      })();

      if (editingExam) {
        await updateExam.mutateAsync({
          id: editingExam.id,
          ...(restData as Omit<Exam, "id" | "created_at">),
          exam_type: final_exam_type || restData.exam_type,
          course_id: data.course_id || null,
          target_batches: data.target_batches,
          passing_marks,
          scheduled_date: scheduled_date_val,
        });
        setEditingExam(null);
        toast({ title: "Architecture Successfully Updated" });
      } else {
        await createExam.mutateAsync({
          ...(restData as Omit<Exam, "id" | "created_at">),
          exam_type: final_exam_type || restData.exam_type,
          course_id: data.course_id || null,
          target_batches: data.target_batches,
          passing_marks,
          status: "draft",
          approval_status: "pending",
          created_by: user.id || "",
          scheduled_date: scheduled_date_val,
        });
        setIsAddOpen(false);
        setActiveStatusTab("pending"); // Ensure we show the pending section immediately
        toast({ title: "Architecture Successfully Committed" });
      }
      form.reset();
    } catch (error) {
      console.error(error);
    }
  };

  const minDateTime = useMemo(() => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }, [isAddOpen, editingExam]);

  const pendingExams = useMemo(
    () => exams.filter((e) => e.approval_status === "pending"),
    [exams],
  );
  const approvedExams = useMemo(
    () => exams.filter((e) => e.approval_status === "approved"),
    [exams],
  );
  const rejectedExams = useMemo(
    () => exams.filter((e) => e.approval_status === "rejected"),
    [exams],
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between gap-6">
        <SyncDataButton 
          onSync={onSync || (() => refetch())} 
          isLoading={parentLoading || isLoading} 
          className="h-14 px-8 rounded-2xl bg-white/50 backdrop-blur-sm border-slate-100 shadow-xl"
        />
        <Dialog
          open={isAddOpen || !!editingExam}
          onOpenChange={(val) => {
            if (!val) {
              setIsAddOpen(false);
              setEditingExam(null);
              setIsOtherType(false);
              form.reset({
                title: "",
                description: "",
                exam_type: "mock",
                assigned_image: "",
                duration_minutes: 60,
                total_marks: 100,
                passing_percentage: 40,
                negative_marking: 0,
                max_attempts: 1,
                show_results: true,
                browser_security: false,
                shuffle_questions: true,
                proctoring_enabled: false,
                topics: [],
                scheduled_date: "",
                source_topic: "",
                question_count: 10,
                marking_scheme: "standard",
                exam_mode: "automated",
                course_id: "",
                target_batches: [],
                custom_fields: [{ label: "Exam Type", value: "Standard" }],
              });
            } else {
              setIsAddOpen(true);
              if (!editingExam) {
                 const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
                 const currentIST = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                 form.setValue("scheduled_date", currentIST);
              }
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="rounded-xl sm:rounded-2xl h-11 sm:h-14 px-6 sm:px-12 bg-white hover:bg-slate-50 text-black border-2 border-slate-100 font-black uppercase tracking-[0.2em] text-[10px] gap-3 shadow-xl hover:shadow-2xl hover:border-black transition-all duration-500 hover:scale-[1.02] active:scale-95 group">
              <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-500" />
              Commence Scheduling
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-[640px] p-0 overflow-hidden border-none shadow-[0_0_80px_rgba(0,0,0,0.15)] rounded-[2rem] bg-white flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <DialogHeader className="pt-12 sm:pt-10 px-6 sm:px-8 pb-6 border-b border-slate-50 bg-white/50 backdrop-blur-sm sticky top-0 z-20">


                <div className="space-y-1 text-left">
                  <DialogTitle className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                     <span className="bg-gradient-to-r from-slate-900 to-primary bg-clip-text text-transparent">
                       {editingExam ? "Edit" : "Setup"}
                     </span>
                     <span className="text-primary italic">
                       {editingExam ? "Exam Settings" : "New Exam"}
                     </span>
                  </DialogTitle>
                  <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Configure your assessment settings
                  </DialogDescription>
                </div>
              </DialogHeader>

                <div className="flex-1 overflow-y-auto scrollbar-hide p-0 bg-white">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmitProfile)} className="p-6 sm:p-8 space-y-10">
                      
                      {/* Image Upload Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">Exam Banner Image</Label>
                          {form.watch("assigned_image") && (
                            <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">Image Selected</Badge>
                          )}
                        </div>
                        <div
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={onDropPoster}
                          className={cn(
                            "relative aspect-video sm:aspect-[21/9] rounded-[2rem] border-2 border-dashed transition-all duration-500 overflow-hidden flex flex-col items-center justify-center gap-4 group",
                            form.watch("assigned_image")
                              ? "border-emerald-500/50 bg-emerald-50/10"
                              : "border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-primary/50"
                          )}
                        >
                          {isUploadingImage ? (
                            <div className="flex flex-col items-center gap-3">
                              <Loader2 className="h-10 w-10 text-primary animate-spin" />
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Optimizing Media...</p>
                            </div>
                          ) : form.watch("assigned_image") ? (
                            <div className="absolute inset-0 group/img">
                              <img
                                src={getImageSrc(form.watch("assigned_image")) || ""}
                                className="w-full h-full object-cover"
                                alt="Exam Poster"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 px-6"
                                  onClick={() => form.setValue("assigned_image", "")}
                                >
                                  Remove Artwork
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors">
                                <ImageIcon className="h-6 w-6" />
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DRAG & DROP OR</p>
                                <input type="file" id="exam-poster" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                <button
                                  type="button"
                                  onClick={() => document.getElementById("exam-poster")?.click()}
                                  className="text-primary font-black uppercase text-[10px] tracking-widest hover:underline mt-1"
                                >
                                  Choose Image
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-800">Exam Title</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g. AWS Solution Architect Mock" 
                                  className="h-14 rounded-2xl border-slate-300 bg-white focus:bg-white focus:ring-primary/10 transition-all font-bold text-sm text-slate-900 shadow-sm"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="scheduled_date"
                          render={({ field }) => {
                            const { date, h, m, p } = parseDateTime(field.value);
                            const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
                            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                            const isToday = date === todayStr;
                            
                            const currentHour24 = now.getHours();
                            const currentMinute = now.getMinutes();
                            
                            const currentP = currentHour24 >= 12 ? 'PM' : 'AM';
                            let currentHNum = currentHour24 % 12;
                            if (currentHNum === 0) currentHNum = 12;
                            
                            const availablePeriods = isToday ? ["AM", "PM"].filter(per => {
                                if (currentP === 'PM') return per === 'PM';
                                return true;
                            }) : ["AM", "PM"];
                            
                            const hours = Array.from({length: 12}, (_, i) => String(i === 0 ? 12 : i).padStart(2, '0'));
                            const availableHours = isToday && p === currentP ? hours.filter(hr => {
                                let hrNum = parseInt(hr, 10);
                                let currNum = currentHNum;
                                if (hrNum === 12) hrNum = 0;
                                let checkCurrNum = currNum === 12 ? 0 : currNum;
                                return hrNum >= checkCurrNum;
                            }) : hours;
                          
                            const mins = Array.from({length: 60}, (_, i) => String(i).padStart(2, '0'));
                            const availableMins = isToday && p === currentP && parseInt(h,10) === currentHNum 
                              ? mins.filter(mn => parseInt(mn, 10) >= currentMinute) 
                              : mins;

                            return (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-800">Date & Time</FormLabel>
                                <FormControl>
                                  <div className="flex flex-col gap-2.5 w-full">
                                    <div className="relative w-full">
                                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                      <Input 
                                        type="date" 
                                        min={todayStr}
                                        value={date}
                                        onChange={(e) => field.onChange(compileDateTime(e.target.value, h, m, p))}
                                        className="h-14 rounded-2xl border-slate-300 bg-white pl-10 font-bold text-slate-900 shadow-sm w-full"
                                      />
                                    </div>
                                    <div className="flex gap-2 w-full">
                                      <Select 
                                        value={availableHours.includes(h) ? h : ""} 
                                        onValueChange={(val) => field.onChange(compileDateTime(date, val, m, p))}
                                      >
                                        <SelectTrigger className="h-14 flex-1 rounded-2xl border-slate-300 bg-white font-bold text-slate-900 shadow-sm">
                                          <SelectValue placeholder="HH" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                          {availableHours.map(hr => (
                                            <SelectItem key={hr} value={hr} className="font-bold">{hr}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                            
                                      <Select 
                                        value={availableMins.includes(m) ? m : ""} 
                                        onValueChange={(val) => field.onChange(compileDateTime(date, h, val, p))}
                                      >
                                        <SelectTrigger className="h-14 flex-1 rounded-2xl border-slate-300 bg-white font-bold text-slate-900 shadow-sm">
                                          <SelectValue placeholder="MM" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                          {availableMins.map(mn => (
                                            <SelectItem key={mn} value={mn} className="font-bold">{mn}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                            
                                      <Select 
                                        value={availablePeriods.includes(p) ? p : ""} 
                                        onValueChange={(val) => field.onChange(compileDateTime(date, h, m, val))}
                                      >
                                        <SelectTrigger className="h-14 w-[85px] rounded-2xl border-slate-300 bg-white font-bold text-slate-900 shadow-sm">
                                          <SelectValue placeholder="AM/PM" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availablePeriods.map(per => (
                                            <SelectItem key={per} value={per} className="font-bold">{per}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="course_id"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-800">Assign to Course</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-14 rounded-2xl border-slate-300 bg-white font-bold text-sm text-slate-900 shadow-sm">
                                    <SelectValue placeholder="Select Course (Optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                  <SelectItem value="none" className="font-bold py-3 uppercase text-[10px] tracking-widest opacity-50">General / None</SelectItem>
                                  {courses.map(course => (
                                    <SelectItem key={course.id} value={course.id} className="font-bold py-3 uppercase text-[10px] tracking-widest">
                                      {course.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <div className="space-y-2">
                           <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-800">Target Batches</FormLabel>
                           <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 max-h-[120px] overflow-y-auto custom-scrollbar min-h-[50px] content-start">
                              {batches.length === 0 ? (
                                <p className="text-[8px] font-bold text-slate-400 uppercase">No batches defined</p>
                              ) : batches.map(batch => (
                                <Badge 
                                  key={batch.id}
                                  variant="outline"
                                  onClick={() => {
                                    const current = form.getValues("target_batches") || [];
                                    const next = current.includes(batch.id) 
                                      ? current.filter(id => id !== batch.id)
                                      : [...current, batch.id];
                                    form.setValue("target_batches", next);
                                  }}
                                  className={cn(
                                    "cursor-pointer font-black text-[8px] uppercase tracking-widest h-7 px-3 rounded-lg transition-all",
                                    (form.watch("target_batches") || []).includes(batch.id)
                                    ? "bg-slate-900 text-white border-slate-900 shadow-md scale-105"
                                    : "bg-white text-slate-400 hover:border-slate-400"
                                  )}
                                >
                                  {batch.batch_name}
                                </Badge>
                              ))}
                           </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="exam_type"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-800">Exam Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-14 rounded-2xl border-slate-300 bg-white font-bold text-sm text-slate-900 shadow-sm">
                                    <SelectValue placeholder="Select Category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                  <SelectItem value="mock" className="font-bold py-3 uppercase text-[10px] tracking-widest">Mock Portal</SelectItem>
                                  <SelectItem value="certification" className="font-bold py-3 uppercase text-[10px] tracking-widest">Certification Portal</SelectItem>
                                  <SelectItem value="live" className="font-bold py-3 uppercase text-[10px] tracking-widest">Live Assessment</SelectItem>
                                  <SelectItem value="others" className="font-bold py-3 uppercase text-[10px] tracking-widest">Others</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <AnimatePresence>
                                {form.watch("exam_type") === "others" && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: "auto" }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    className="pt-4 px-1 pb-2 overflow-hidden"
                                  >
                                    <FormField
                                      control={form.control}
                                      name="custom_type"
                                      render={({ field }) => (
                                        <FormItem className="space-y-2">
                                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary italic">Specify Custom Category</FormLabel>
                                          <FormControl>
                                            <Input 
                                              placeholder="Enter custom category name..." 
                                              className="h-12 px-4 rounded-xl border-primary/20 bg-primary/5 focus:bg-white focus:ring-primary/10 transition-all font-bold text-sm text-slate-900 shadow-inner"
                                              {...field} 
                                            />
                                          </FormControl>
                                          <FormMessage className="text-[9px] font-bold uppercase tracking-widest" />
                                        </FormItem>
                                      )}
                                    />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Technical Parameters */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <FormField
                          control={form.control}
                          name="duration_minutes"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-800">Duration (Minutes)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                  <Input type="number" className="h-14 rounded-2xl border-slate-300 bg-white pl-11 font-bold text-slate-900 shadow-sm" {...field} />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="negative_marking"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-800">Negative Marks</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500" />
                                  <Input type="number" step="0.25" className="h-14 rounded-2xl border-slate-300 bg-white pl-11 font-bold text-slate-900 shadow-sm" {...field} />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="total_marks"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-800">Final Marks</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                                  <Input type="number" className="h-14 rounded-2xl border-slate-300 bg-white pl-11 font-bold text-slate-900 shadow-sm" {...field} />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Shuffle & Security */}
                      <div className="p-5 sm:p-6 rounded-[2rem] bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-primary/40 transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-primary transition-colors focus-within:ring-2 focus-within:ring-primary/20">
                            <Shuffle className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                          <div>
                            <h4 className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-900">Shuffle Questions</h4>
                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Randomize the order for each student</p>
                          </div>
                        </div>
                        <FormField
                          control={form.control}
                          name="shuffle_questions"
                          render={({ field }) => (
                            <div className="w-full sm:w-auto flex justify-end">
                              <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" />
                            </div>
                          )}
                        />
                      </div>

                      {/* Guidelines Section (Optional but kept for description) */}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-800">Exam Instructions</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Core logic for candidates..." 
                                className="min-h-[120px] rounded-2xl border-slate-300 bg-white p-6 font-medium text-slate-900 text-xs italic resize-none shadow-sm"
                                {...field} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Command Actions */}
                      <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          className="h-14 flex-1 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                          onClick={() => {
                            setIsAddOpen(false);
                            setEditingExam(null);
                          }}
                        >
                          Abort
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createExam.isPending || updateExam.isPending}
                          className="h-14 flex-[2] rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-2 group"
                        >
                          {(createExam.isPending || updateExam.isPending) ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <span>{editingExam ? "Update Exam" : "Create Exam"}</span>
                              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs 
        value={activeStatusTab} 
        onValueChange={setActiveStatusTab} 
        className="w-full"
      >
        <TabsList className="mb-6 sm:mb-12 h-auto sm:h-20 rounded-2xl sm:rounded-[2.5rem] bg-white border border-slate-100 p-1.5 sm:p-2 shadow-sm flex flex-wrap sm:flex-nowrap items-center gap-1 sm:gap-2">
          {["pending", "approved", "rejected"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex-1 h-10 sm:h-full rounded-xl sm:rounded-full font-bold text-[8px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest text-slate-300 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all duration-500 whitespace-nowrap"
            >
              {tab === "pending"
                ? `Pending (${pendingExams.length})`
                : tab === "approved"
                  ? `Approved (${approvedExams.length})`
                  : `Rejected (${rejectedExams.length})`}
            </TabsTrigger>
          ))}
        </TabsList>
        {["pending", "approved", "rejected"].map((tabVal) => (
          <TabsContent
            key={tabVal}
            value={tabVal}
            className="focusVisible:outline-none"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-10 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            >
              {(() => {
                const list =
                  tabVal === "pending"
                    ? pendingExams
                    : tabVal === "approved"
                      ? approvedExams
                      : rejectedExams;

                if (isLoading) {
                  return Array.from({ length: 6 }).map((_, i) => (
                    <ExamCardSkeleton key={i} />
                  ));
                }

                if (list.length === 0)
                  return (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="col-span-full py-32 text-center"
                    >
                      <div className="relative inline-block">
                        <motion.div
                          animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.1, 0.3, 0.1] 
                          }}
                          transition={{ duration: 4, repeat: Infinity }}
                          className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"
                        />
                        <div className="relative h-24 w-24 bg-white rounded-full flex items-center justify-center shadow-xl border border-slate-100 mx-auto mb-8">
                           <Loader2 className="h-10 w-10 text-slate-200 animate-[spin_8s_linear_infinite]" />
                           <Rocket className="absolute h-8 w-8 text-slate-900/10" />
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 uppercase tracking-[0.2em] italic">
                        No Records Found
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">
                        Catalogue index is currently empty
                      </p>
                    </motion.div>
                  );

                return list.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    userRole={userRole}
                    onUpdate={(p) => updateExam.mutate({ id: p.id, ...p })}
                    onDelete={(id) => deleteExam.mutate(id)}
                    onConfigure={() => onNavigateToRepository?.()}
                    onEdit={(examToEdit) => {
                      let dateStr = "";
                      if (examToEdit.scheduled_date) {
                        try {
                           const d = new Date(examToEdit.scheduled_date);
                           const istStr = d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
                           const localD = new Date(istStr);
                           dateStr = `${localD.getFullYear()}-${String(localD.getMonth() + 1).padStart(2, '0')}-${String(localD.getDate()).padStart(2, '0')}T${String(localD.getHours()).padStart(2, '0')}:${String(localD.getMinutes()).padStart(2, '0')}`;
                        } catch(e) {
                           console.error("Invalid date", examToEdit.scheduled_date);
                        }
                      }
                      
                      const passedTargetBatches = Array.isArray(examToEdit.target_batches) 
                         ? examToEdit.target_batches 
                         : typeof examToEdit.target_batches === 'string' 
                            ? [examToEdit.target_batches] 
                            : [];

                      form.reset({
                        title: examToEdit.title || "",
                        description: examToEdit.description || "",
                        exam_type: examToEdit.exam_type || "mock",
                        assigned_image: examToEdit.assigned_image || "",
                        duration_minutes: examToEdit.duration_minutes || 60,
                        total_marks: examToEdit.total_marks || 100,
                        passing_percentage: examToEdit.passing_marks && examToEdit.total_marks 
                          ? Math.round((examToEdit.passing_marks / examToEdit.total_marks) * 100) 
                          : 40,
                        negative_marking: examToEdit.negative_marking || 0,
                        max_attempts: examToEdit.max_attempts || 1,
                        show_results: examToEdit.show_results ?? true,
                        browser_security: examToEdit.browser_security ?? false,
                        shuffle_questions: examToEdit.shuffle_questions ?? true,
                        proctoring_enabled: examToEdit.proctoring_enabled ?? false,
                        topics: examToEdit.topics || [],
                        scheduled_date: dateStr,
                        course_id: examToEdit.course_id || "",
                        target_batches: passedTargetBatches,
                        custom_fields: examToEdit.custom_fields || [{ label: "Exam Type", value: "Standard" }],
                        source_topic: examToEdit.source_topic || "",
                        question_count: examToEdit.total_questions || 10,
                        marking_scheme: "standard",
                        exam_mode: "automated"
                      });
                      setEditingExam(examToEdit);
                    }}
                  />
                ));
              })()}
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}