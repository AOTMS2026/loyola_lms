import { useState, useEffect, Fragment } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useLiveMonitoring, MonitoringEnrollment, MonitoringResult, useAdminData } from '@/hooks/useAdminData';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api';
import {
    Users, Search, Activity, BookOpen, Trophy, 
    Clock, Mail, ChevronRight, TrendingUp, BarChart, 
    Calendar, CheckCircle2, AlertCircle, Eye, Download, Video, FileText, Trash2,
    ChevronDown, ChevronUp, GraduationCap, Layout,
    Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart as ReBarChart, Bar, Cell
} from 'recharts';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from '@/components/ui/scroll-area';
import { SyncDataButton } from './data/SyncDataButton';

interface Batch {
    id: string;
    batch_name: string;
    course_id: string;
    instructor_id: string;
}

interface RichCourse {
    id: string;
    title: string;
    instructor_ids?: string[];
    instructor_id?: string;
    instructors?: { id: string; user_id?: string }[];
}

interface DetailedMonitoringResult extends MonitoringResult {
    batchName?: string;
}

interface LiveMonitoringProps {
    onSync?: () => void;
    loading?: boolean;
}

export function LiveMonitoring({ onSync, loading: parentLoading = false }: LiveMonitoringProps) {
    const { userRole } = useAuth();
    const { data, loading: monitorLoading, refresh, deleteEnrollment, deleteExamResult } = useLiveMonitoring();
    const { profiles, courses, loading: adminLoading } = useAdminData(userRole);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('instructors'); // Default to instructors
    const [expandedInst, setExpandedInst] = useState<string[]>([]);
    const [selectedBatchResults, setSelectedBatchResults] = useState<DetailedMonitoringResult[] | null>(null);
    const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
    
    // Additional data for robust matching
    const [batches, setBatches] = useState<Batch[]>([]);
    const [richCourses, setRichCourses] = useState<RichCourse[]>([]);
    const [additionalDataLoading, setAdditionalDataLoading] = useState(true);

    useEffect(() => {
        const loadAdditionalData = async () => {
            try {
                const [batchesData, richCoursesData] = await Promise.all([
                    fetchWithAuth('/data/batches'),
                    fetchWithAuth('/admin/courses-with-instructors')
                ]);
                setBatches((batchesData as Batch[]) || []);
                setRichCourses((richCoursesData as RichCourse[]) || []);
            } catch (err) {
                console.error("Failed to load matching data", err);
            } finally {
                setAdditionalDataLoading(false);
            }
        };
        loadAdditionalData();
    }, []);

    const loading = monitorLoading || adminLoading || additionalDataLoading;

    if (loading && !data) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-64 rounded-xl" />
                    <Skeleton className="h-10 w-48 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
                </div>
                <Skeleton className="h-[500px] w-full rounded-3xl" />
            </div>
        );
    }

    const rawEnrollments = data?.enrollments || [];
    const results = data?.results || [];

    // UNIQUE ENROLLMENTS - De-duplicate by email and course
    const enrollments = Array.from(new Map(rawEnrollments.map(e => [`${e.email}-${e.course}`, e])).values());

    // Aggregate Instructors
    const instructorProfiles = profiles.filter(p => p.role?.toLowerCase() === 'instructor');
    
    const instructorStats = instructorProfiles.map(inst => {
        // Find all courses associated with this instructor through multiple sources
        const assignedCoursesFromAdmin = courses.filter(c => 
            c.instructor_id === inst.id || 
            c.instructor_name === (inst.full_name || '') ||
            (inst.email && c.instructor_email === inst.email)
        );
        
        const assignedCoursesFromRich = richCourses.filter(c => 
            c.instructor_ids?.includes(inst.id) ||
            c.instructor_id === inst.id ||
            c.instructors?.some((i: { id: string; user_id?: string }) => i.id === inst.id || i.user_id === inst.id)
        );

        // Find all batches assigned to this instructor
        const assignedBatches = batches.filter(b => 
            b.instructor_id === inst.id || 
            b.instructor_id === inst.user_id
        );

        // Get unique courses from all sources
        const allAssociatedCourseIds = new Set([
            ...assignedCoursesFromAdmin.map(c => c.id),
            ...assignedCoursesFromRich.map(c => c.id),
            ...assignedBatches.map(b => b.course_id)
        ]);

        const instructorCourses = courses.filter(c => allAssociatedCourseIds.has(c.id));
        
        const instBatches = instructorCourses.map(course => {
            // Find batch info if available
            const batchInfo = assignedBatches.find(b => b.course_id === course.id);
            const batchName = batchInfo ? `${course.title} (${batchInfo.batch_name})` : course.title;

            // Match enrollments specifically to this course
            const batchEnrollments = enrollments.filter(e => 
                e.course.toLowerCase().trim() === course.title.toLowerCase().trim()
            );

            const batchResults = results.filter(r => 
                batchEnrollments.some(e => e.email === r.email)
            );
            
            return {
                id: batchInfo?.id || course.id,
                name: batchName,
                courseTitle: course.title,
                studentCount: batchEnrollments.length,
                avgProgress: batchEnrollments.length > 0
                    ? Math.round(batchEnrollments.reduce((acc, e) => acc + e.progress, 0) / batchEnrollments.length)
                    : 0,
                avgPerformance: batchResults.length > 0
                    ? Math.round(batchResults.reduce((acc, r) => acc + r.percentage, 0) / batchResults.length)
                    : 0,
                results: batchResults,
                students: Array.from(new Map(batchEnrollments.map(e => [e.email, e])).values())
            };
        }).filter(b => b.studentCount > 0);

        return {
            ...inst,
            batches: instBatches,
            totalStudents: instBatches.reduce((acc, b) => acc + b.studentCount, 0),
            overallProgress: instBatches.length > 0 
                ? Math.round(instBatches.reduce((acc, b) => acc + b.avgProgress, 0) / instBatches.length)
                : 0,
            overallPerformance: instBatches.length > 0
                ? Math.round(instBatches.reduce((acc, b) => acc + b.avgPerformance, 0) / instBatches.length)
                : 0
        };
    });

    const emailToProfileMap = new Map(profiles.map(p => [(p.email || '').toLowerCase(), p]));

    const filteredInstructors = instructorStats.filter(inst => 
        inst.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredEnrollments = enrollments.filter(e => 
        e.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredResults = results.filter(r => 
        r.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.test_title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleExpand = (id: string) => {
        setExpandedInst(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleViewResults = (results: MonitoringResult[], batchName: string) => {
        setSelectedBatchResults(results.map(r => ({ ...r, batchName })));
        setIsResultsModalOpen(true);
    };

    // Global Stats for header
    const totalEnrollments = enrollments.length;
    const avgProgress = totalEnrollments > 0 
        ? Math.round(enrollments.reduce((acc, e) => acc + (e.progress || 0), 0) / totalEnrollments) 
        : 0;
    const completedExams = results.length;
    const avgScore = completedExams > 0 
        ? Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / completedExams) 
        : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row items-center lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4 w-full">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner flex-shrink-0">
                        <Activity className="h-5 w-5 sm:h-7 sm:w-7" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase font-sans leading-none">
                            Platform <span className="text-primary font-medium tracking-normal capitalize italic">Insights</span>
                        </h1>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time engagement and progress tracking</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:flex-none">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Search Student, Course..." 
                            className="h-12 w-full lg:w-80 pl-11 rounded-2xl border-none bg-white shadow-xl shadow-slate-200/20 focus:ring-primary/20 transition-all font-medium text-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <SyncDataButton 
                        onSync={onSync || (() => refresh())} 
                        isLoading={parentLoading || monitorLoading || adminLoading} 
                        className="h-12 px-6 rounded-2xl bg-white shadow-xl shadow-slate-200/10 hover:bg-slate-50"
                    />
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <StatsCard title="Overall Progress" value={`${avgProgress}%`} icon={<BookOpen className="h-5 w-5" />} color="blue" description="Average course completion" />
                <StatsCard title="Active Students" value={totalEnrollments} icon={<Users className="h-5 w-5" />} color="indigo" description="Enrolled & active learners" />
                <StatsCard title="Tests Taken" value={results.filter(r => new Date(r.submitted_at) > new Date(Date.now() - 24*60*60*1000)).length} icon={<Trophy className="h-5 w-5" />} color="amber" description="Exams in the last 24 hours" />
                <StatsCard title="Average Score" value={`${avgScore}%`} icon={<TrendingUp className="h-5 w-5" />} color="emerald" description="Average across all assessments" />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="overflow-x-auto pb-2 scrollbar-hide">
                    <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 inline-flex min-w-max">
                        <TabsTrigger value="instructors" className="rounded-xl px-4 sm:px-8 h-9 sm:h-10 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary font-black uppercase text-[10px] tracking-widest whitespace-nowrap">
                            Instructors View
                        </TabsTrigger>
                        <TabsTrigger value="courses" className="rounded-xl px-4 sm:px-8 h-9 sm:h-10 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary font-black uppercase text-[10px] tracking-widest whitespace-nowrap">
                            Global Progress
                        </TabsTrigger>
                        <TabsTrigger value="exams" className="rounded-xl px-4 sm:px-8 h-9 sm:h-10 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary font-black uppercase text-[10px] tracking-widest whitespace-nowrap">
                            Live Performance
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Instructor View Tab */}
                <TabsContent value="instructors" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="pro-card border-none shadow-2xl shadow-slate-200/20 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-5 sm:p-8 pb-4">
                            <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Instructor Analytics
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm font-medium italic uppercase tracking-widest text-slate-400">Instructor progress and assessment overview</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto scrollbar-thin">
                                <table className="w-full text-left min-w-[900px]">
                                    <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <tr>
                                            <th className="px-5 sm:px-8 py-4 whitespace-nowrap w-10"></th>
                                            <th className="px-5 sm:px-8 py-4 whitespace-nowrap">Instructor Name</th>
                                            <th className="px-5 sm:px-8 py-4 whitespace-nowrap">Active Batches</th>
                                            <th className="px-5 sm:px-8 py-4 whitespace-nowrap">Total Students</th>
                                            <th className="px-5 sm:px-8 py-4 whitespace-nowrap">Course Progress</th>
                                            <th className="px-5 sm:px-8 py-4 text-right whitespace-nowrap">Avg Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredInstructors.map((inst) => (
                                            <Fragment key={inst.id}>

                                                <tr key={inst.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => toggleExpand(inst.id)}>
                                                    <td className="px-8 py-5">
                                                        {expandedInst.includes(inst.id) ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <Avatar className="h-10 w-10 rounded-xl border border-slate-100">
                                                                <AvatarImage src={inst.avatar_url || ''} />
                                                                <AvatarFallback className="bg-primary/10 text-primary font-black uppercase text-xs">
                                                                    {inst.full_name?.[0]}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="text-sm font-black text-slate-900 tracking-tight">{inst.full_name}</div>
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{inst.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <Badge variant="outline" className="rounded-lg px-2 shadow-sm border-slate-200 text-slate-600 font-bold">
                                                            {inst.batches.length || 0} Batches
                                                        </Badge>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-3 w-3 text-slate-300" />
                                                            <span className="text-sm font-bold text-slate-600">{inst.totalStudents}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="w-32 space-y-1.5">
                                                            <div className="flex justify-between text-[9px] font-black uppercase">
                                                                <span className="text-slate-400">Progression</span>
                                                                <span className="text-primary">{inst.overallProgress}%</span>
                                                            </div>
                                                            <Progress value={inst.overallProgress} className="h-1 rounded-full" />
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black ${inst.overallPerformance >= 70 ? 'bg-emerald-50 text-emerald-600' : inst.overallPerformance >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                                            <Trophy className="h-3 w-3" />
                                                            {inst.overallPerformance}%
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedInst.includes(inst.id) && (
                                                    <tr className="bg-slate-50/30">
                                                        <td colSpan={6} className="px-5 sm:px-8 py-0">
                                                            <div className="py-8 space-y-6">
                                                                <div className="flex items-center justify-between px-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                                            <Layout className="h-4 w-4 text-primary" />
                                                                        </div>
                                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                            Batch Details & Student Enrollment
                                                                        </div>
                                                                    </div>
                                                                    <Badge className="bg-white text-slate-400 border-slate-200 text-[9px] font-black uppercase">
                                                                        ID: {inst.id.slice(0, 8)}
                                                                    </Badge>
                                                                </div>

                                                                {inst.batches.length === 0 ? (
                                                                    <div className="mx-4 p-12 text-center bg-white border-2 border-dashed border-slate-100 rounded-[2rem]">
                                                                        <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No active batch assignments detected</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 px-4">
                                                                        {inst.batches.map(batch => (
                                                                            <Card key={batch.id} className="bg-white border-slate-200/60 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group/batch">
                                                                                <div className="flex justify-between items-start mb-4">
                                                                                    <div className="space-y-1">
                                                                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate w-40">{batch.name}</h4>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Users className="h-3 w-3 text-slate-300" />
                                                                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{batch.studentCount} Students</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <Button 
                                                                                        variant="ghost" 
                                                                                        size="sm" 
                                                                                        className="h-8 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-black text-[9px] uppercase tracking-widest px-3"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleViewResults(batch.results, batch.name);
                                                                                        }}
                                                                                    >
                                                                                        Performance
                                                                                    </Button>
                                                                                </div>
                                                                                
                                                                                <div className="space-y-2">
                                                                                    <div className="flex justify-between text-[8px] font-black uppercase">
                                                                                        <span className="text-slate-400">Progression</span>
                                                                                        <span className="text-primary">{batch.avgProgress}%</span>
                                                                                    </div>
                                                                                    <Progress value={batch.avgProgress} className="h-1.5 rounded-full" />
                                                                                </div>
                                                                                
                                                                                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-50">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <div className={`h-2 w-2 rounded-full ${batch.avgPerformance >= 70 ? 'bg-emerald-500' : batch.avgPerformance >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                                                                        <span className="text-[9px] font-black uppercase text-slate-500">Score: {batch.avgPerformance}%</span>
                                                                                    </div>
                                                                                    <div className="flex -space-x-2">
                                                                                        {batch.students.slice(0, 3).map((s, idx) => {
                                                                                            const profile = emailToProfileMap.get((s.email || '').toLowerCase());
                                                                                            return (
                                                                                                <Avatar key={idx} className="h-5 w-5 border-2 border-white">
                                                                                                    <AvatarImage src={profile?.avatar_url || ''} />
                                                                                                    <AvatarFallback className="bg-slate-100 text-[8px] font-black">{s.student[0]}</AvatarFallback>
                                                                                                </Avatar>
                                                                                            );
                                                                                        })}
                                                                                        {batch.studentCount > 3 && (
                                                                                            <div className="h-5 w-5 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[7px] font-black text-slate-400">
                                                                                                +{batch.studentCount - 3}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </Card>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        ))}

                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Course Progress Tab */}
                <TabsContent value="courses" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="pro-card border-none shadow-2xl shadow-slate-200/20 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-5 sm:p-8 pb-4">
                            <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Active Enrollment Streams</CardTitle>
                            <CardDescription className="text-xs sm:text-sm font-medium italic uppercase tracking-widest text-slate-400">Tracking completion depth across the curriculum</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto scrollbar-thin">
                                <table className="w-full text-left min-w-[900px]">
                                    <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <tr>
                                            <th className="px-5 sm:px-8 py-4 whitespace-nowrap">Student Name</th>
                                            <th className="px-5 sm:px-8 py-4 whitespace-nowrap">Course Name</th>
                                            <th className="px-5 sm:px-8 py-4 whitespace-nowrap">Completion Progress</th>
                                            <th className="px-5 sm:px-8 py-4 text-center whitespace-nowrap">Recent Activity</th>
                                            <th className="px-5 sm:px-8 py-4 text-right whitespace-nowrap">Dashboard</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredEnrollments.map((en, i) => (
                                            <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <Avatar className="h-10 w-10 border border-slate-100 shadow-sm">
                                                            <AvatarImage src={emailToProfileMap.get((en.email || '').toLowerCase())?.avatar_url || ''} />
                                                            <AvatarFallback className="bg-slate-100 text-xs font-black text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                                                {en.student[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="text-sm font-black text-slate-900">{en.student}</div>
                                                            <div className="text-[10px] font-bold text-slate-400">{en.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200/50">
                                                        <BookOpen className="h-3 w-3" />
                                                        <span className="text-xs font-bold">{en.course}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="w-48 space-y-2">
                                                        <div className="flex justify-between items-center text-[10px] font-black uppercase font-sans">
                                                            <span className={en.progress === 100 ? "text-emerald-500" : "text-primary"}>
                                                                {en.progress === 100 ? "COMPLETED" : "IN PROGRESS"}
                                                            </span>
                                                            <span className="text-slate-900">{en.progress}%</span>
                                                        </div>
                                                        <Progress 
                                                            value={en.progress} 
                                                            className={`h-1.5 rounded-full ${en.progress === 100 ? '[&>div]:bg-emerald-500' : ''}`}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <div className="text-xs font-black text-slate-900 flex items-center justify-center gap-2 uppercase tracking-tighter">
                                                       <Clock className="h-3 w-3 text-slate-400" />
                                                       {formatDate(en.last_accessed)}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                        onClick={() => {
                                                            if (window.confirm('Permanently delete this enrollment?')) {
                                                                deleteEnrollment(en.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredEnrollments.length === 0 && (
                                <div className="py-20 text-center flex flex-col items-center gap-4">
                                    <AlertCircle className="h-12 w-12 text-slate-200" />
                                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No active streams found</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Exam Performance Tab */}
                <TabsContent value="exams" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Results Table - Spans 2 */}
                        <Card className="lg:col-span-2 pro-card border-none shadow-2xl shadow-slate-200/20 rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-5 sm:p-8 pb-4">
                                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Test Submission History</CardTitle>
                                <CardDescription className="text-xs sm:text-sm font-medium italic uppercase tracking-widest text-slate-400">Complete student assessment and score logs</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto scrollbar-thin">
                                    <table className="w-full text-left min-w-[750px]">
                                        <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <tr>
                                                <th className="px-8 py-4 text-left whitespace-nowrap">Student Information</th>
                                                <th className="px-8 py-4 text-left whitespace-nowrap">Assessment Title</th>
                                                <th className="px-8 py-4 text-left whitespace-nowrap">Test Score</th>
                                                <th className="px-8 py-4 text-left whitespace-nowrap">Submission Date</th>
                                                <th className="px-8 py-4 text-right whitespace-nowrap">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredResults.map((r, i) => (
                                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-8 py-5 align-middle">
                                                        <div className="flex items-center gap-4">
                                                            <Avatar className="h-10 w-10 border border-slate-100 shadow-sm">
                                                                <AvatarImage src={emailToProfileMap.get((r.email || '').toLowerCase())?.avatar_url || ''} />
                                                                <AvatarFallback className="bg-slate-100 text-xs font-black text-slate-400">
                                                                    {r.student[0]}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="text-sm font-black text-slate-900">{r.student}</div>
                                                                <div className="text-[10px] font-bold text-slate-400 tracking-tighter">{r.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 align-middle">
                                                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${r.type === 'live' ? 'bg-rose-50 text-rose-600 border border-rose-100/50' : 'bg-indigo-50 text-indigo-600 border border-indigo-100/50'}`}>
                                                            {r.type === 'live' ? <Activity className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                                            {r.test_title.toUpperCase().includes('SYSTEM GENERATED') ? 'Main Test' : r.test_title}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 align-middle">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-black shadow-inner border ${r.percentage >= 75 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : r.percentage >= 40 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                                {r.percentage}%
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-400">
                                                                <span className="text-slate-900 font-black">{r.score}/{r.total}</span> Points
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-left align-middle">
                                                        <div className="text-xs font-black text-slate-900 uppercase tracking-tighter">{formatDate(r.submitted_at)}</div>
                                                        <div className="text-[8px] font-black text-slate-300 tracking-[0.2em] mt-1 uppercase">REF: {r.id.toString().slice(-6)}</div>
                                                    </td>
                                                    <td className="px-8 py-5 align-middle text-right">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                            onClick={() => {
                                                                if (window.confirm('Permanently delete this test result?')) {
                                                                    deleteExamResult(r.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {filteredResults.length === 0 && (
                                    <div className="py-20 text-center flex flex-col items-center gap-4">
                                        <Trophy className="h-12 w-12 text-slate-200" />
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No submission records</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Analysis Sidebar */}
                        <div className="space-y-6">
                            <Card className="pro-card border-none shadow-2xl shadow-slate-200/20 rounded-[2.5rem]">
                                <CardHeader>
                                    <CardTitle className="text-lg font-black text-slate-900 uppercase font-sans">Grade <span className="text-primary">Distribution</span></CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[250px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ReBarChart data={calculateDistribution(results)}>
                                                <XAxis dataKey="range" hide />
                                                <Tooltip 
                                                    cursor={{fill: 'rgba(0,0,0,0.02)'}} 
                                                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                                                />
                                                <Bar dataKey="students" radius={[6, 6, 0, 0]}>
                                                    {calculateDistribution(results).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </ReBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <DistributionRef color="#ec4899" label="0-40%" />
                                        <DistributionRef color="#f59e0b" label="40-75%" />
                                        <DistributionRef color="#10b981" label="75-100%" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="pro-card border-none shadow-2xl shadow-slate-200/20 rounded-[2.5rem] bg-white overflow-hidden relative group">
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-all duration-700 blur-3xl -z-0" />
                                <CardHeader className="relative z-10">
                                    <CardTitle className="text-lg font-black uppercase font-sans tracking-wider text-slate-900">Top <span className="text-primary">Performers</span></CardTitle>
                                </CardHeader>
                                <CardContent className="relative z-10 space-y-4">
                                    {results.sort((a,b) => b.percentage - a.percentage).slice(0, 3).map((top, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-[1.5rem] bg-slate-50 border border-slate-100/50 hover:bg-white hover:shadow-md transition-all group/performer">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <Avatar className="h-10 w-10 border border-slate-100 shadow-sm rounded-xl">
                                                        <AvatarImage src={emailToProfileMap.get((top.email || '').toLowerCase())?.avatar_url || ''} />
                                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-black italic">
                                                            {top.student?.[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[8px] font-black text-white border-2 border-white shadow-sm">
                                                        #{i+1}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-slate-900 truncate w-32">{top.student}</div>
                                                    <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mt-1">
                                                        {top.test_title.toUpperCase().includes('SYSTEM GENERATED') ? 'Main Assessment' : top.test_title}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xl font-black text-emerald-500">{top.percentage}%</div>
                                        </div>
                                    ))}
                                </CardContent>
                                <Trophy className="absolute -bottom-8 -right-8 h-32 w-32 text-slate-100 rotate-12 -z-0" />
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Results Modal */}
            <Dialog open={isResultsModalOpen} onOpenChange={setIsResultsModalOpen}>
                <DialogContent className="max-w-3xl bg-white/95 backdrop-blur-xl border-slate-200/60 shadow-2xl rounded-[2.5rem] p-0 overflow-hidden pro-modal border-none">
                    <DialogHeader className="p-8 pb-4">
                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center border border-indigo-200 shadow-inner">
                                <Trophy className="h-6 w-6 text-indigo-600" />
                            </div>
                            Batch <span className="text-primary italic">Performance</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">
                           Mock test results for students in {selectedBatchResults?.[0]?.batchName || 'current batch'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="px-8 pb-8">
                        <ScrollArea className="h-[450px] pr-4">
                            {!selectedBatchResults || selectedBatchResults.length === 0 ? (
                                <div className="py-20 text-center flex flex-col items-center gap-4">
                                    <AlertCircle className="h-12 w-12 text-slate-200" />
                                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No submission records for this batch</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {selectedBatchResults.map((r, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:bg-white transition-all group">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-10 w-10 border border-slate-100 shadow-sm rounded-xl">
                                                    <AvatarImage src={emailToProfileMap.get((r.email || '').toLowerCase())?.avatar_url || ''} />
                                                    <AvatarFallback className="bg-slate-100 text-xs font-black text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                                        {r.student?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="text-sm font-black text-slate-900">{r.student}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.test_title}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <div className="text-xs font-black text-slate-900 uppercase tracking-tighter">{formatDate(r.submitted_at)}</div>
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Score: {r.score}/{r.total}</div>
                                                </div>
                                                <div className={`h-12 w-12 rounded-2xl flex flex-col items-center justify-center text-xs font-black border shadow-sm ${r.percentage >= 75 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : r.percentage >= 40 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                    <span>{r.percentage}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                    
                    <div className="bg-slate-50/50 p-6 border-t border-slate-100 flex justify-end">
                        <Button variant="ghost" className="rounded-xl font-black uppercase tracking-widest text-[10px]" onClick={() => setIsResultsModalOpen(false)}>
                            Close Report
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatsCard({ title, value, icon, color, description }: { title: string, value: string | number, icon: React.ReactNode, color: string, description: string }) {
    const colors: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100",
    };

    return (
        <Card className="pro-card border-none shadow-xl shadow-slate-200/10 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shadow-inner ${colors[color] || colors.blue}`}>
                        {icon}
                    </div>
                    <Activity className="h-4 w-4 text-slate-200 group-hover:text-primary transition-colors" />
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</p>
                    <h3 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight font-sans">{value}</h3>
                    <p className="text-[10px] font-bold text-slate-400">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function DistributionRef({ color, label }: { color: string, label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
    );
}

function formatDate(date: string) {
    if (!date) return 'Just now';
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function calculateDistribution(results: MonitoringResult[]) {
    const dist = [
        { range: '0-40', students: 0, color: '#ec4899' },
        { range: '40-75', students: 0, color: '#f59e0b' },
        { range: '75-100', students: 0, color: '#10b981' }
    ];

    results.forEach(r => {
        if (r.percentage < 40) dist[0].students++;
        else if (r.percentage < 75) dist[1].students++;
        else dist[2].students++;
    });

    return dist;
}
