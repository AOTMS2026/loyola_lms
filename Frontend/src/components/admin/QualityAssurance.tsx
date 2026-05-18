import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { fetchWithAuth } from '@/lib/api';
import { Loader2, Trash2, AlertTriangle, Database, Users, BookOpen, FileQuestion, GraduationCap, ShieldCheck, MessageSquare, Eye, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SyncDataButton } from "./data/SyncDataButton";

interface DataSummary {
    users: number;
    courses: number;
    enrollments: number;
    questionBanks: number;
    exams: number;
    conversations: number;
    messages: number;
    pendingCourses: number;
    pendingEnrollments: number;
    pendingExams: number;
    highPriorityEvents: number;
    roleCounts?: Record<string, number>;
}

interface DeletionStats {
    users: number;
    courses: number;
    enrollments: number;
    questionBanks: number;
    exams: number;
    conversations: number;
    messages: number;
}

interface QualityAssuranceProps {
    onSync?: () => void;
    loading?: boolean;
}

export function QualityAssurance({ onSync, loading: parentLoading = false }: QualityAssuranceProps) {
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [summary, setSummary] = useState<DataSummary>({
        users: 0,
        courses: 0,
        enrollments: 0,
        questionBanks: 0,
        exams: 0,
        conversations: 0,
        messages: 0,
        pendingCourses: 0,
        pendingEnrollments: 0,
        pendingExams: 0,
        highPriorityEvents: 0
    });
    const { toast } = useToast();

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedDataType, setSelectedDataType] = useState<string | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [showViewDialog, setShowViewDialog] = useState(false);
    const [viewingDataType, setViewingDataType] = useState<string | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [activeTab, setActiveTab] = useState('users');

    interface QuestionBankItem {
        id?: string;
        _id?: string;
        topic: string;
        question_text: string;
        created_by?: string;
    }

    interface UserItem {
        id?: string;
        _id?: string;
        full_name?: string;
        email?: string;
        user_id?: { _id: string; full_name?: string; email?: string } | string;
    }

    const dataTypes = [
        { id: 'users', label: 'Users', icon: Users, description: 'All user accounts and profiles', color: 'bg-red-500' },
        { id: 'courses', label: 'Courses', icon: BookOpen, description: 'All courses and content', color: 'bg-orange-500' },
        { id: 'enrollments', label: 'Enrollments', icon: GraduationCap, description: 'Student enrollments and progress', color: 'bg-blue-500' },
        { id: 'questionBanks', label: 'Question Banks', icon: FileQuestion, description: 'All question banks and questions', color: 'bg-purple-500' },
        { id: 'exams', label: 'Exams', icon: ShieldCheck, description: 'Exams, schedules, and results', color: 'bg-indigo-500' },
        { id: 'conversations', label: 'Conversations', icon: MessageSquare, description: 'Chat conversations and messages', color: 'bg-green-500' },
    ];

    const dataTypeLabels: Record<string, string> = {
        users: 'Users',
        courses: 'Courses',
        enrollments: 'Enrollments',
        questionBanks: 'Question Banks',
        exams: 'Exams',
        conversations: 'Conversations'
    };

    const fetchSummary = async (showToast = false) => {
        try {
            setLoading(true);
            const counts = await fetchWithAuth('/admin/data-summary') as DataSummary;
            setSummary(counts);
            if (showToast) {
                toast({ title: "System Audit Complete", description: "Database summary has been synchronized." });
            }
        } catch (err) {
            console.error('Failed to fetch data summary', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
        const interval = setInterval(() => fetchSummary(), 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const handleDeleteClick = (dataType: string) => {
        setSelectedDataType(dataType);
        setDeleteConfirmText('');
        setShowDeleteDialog(true);
    };

    const handleViewClick = async (dataType: string) => {
        setViewingDataType(dataType);
        setShowViewDialog(true);
        setLoadingData(true);
        
        try {
            let endpoint = '';
            switch (dataType) {
                case 'users':
                    endpoint = '/admin/users-list';
                    break;
                case 'courses':
                    endpoint = '/admin/courses-list';
                    break;
                case 'enrollments':
                    endpoint = '/admin/enrollments-list';
                    break;
                case 'questionBanks':
                    endpoint = '/data/question_bank';
                    break;
                case 'exams':
                    endpoint = '/admin/exams-list';
                    break;
                case 'conversations':
                    endpoint = '/admin/conversations';
                    break;
                default:
                    endpoint = `/data/${dataType}`;
            }
            const data = await fetchWithAuth(endpoint);
            setDataList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch data', err);
            setDataList([]);
        } finally {
            setLoadingData(false);
        }
    };

    interface BaseDataItem {
        id?: string;
        _id?: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
    }

    const [dataList, setDataList] = useState<BaseDataItem[]>([]);

    const handleIndividualDelete = async (item: BaseDataItem) => {
        const id = getItemId(item, viewingDataType || '');
        if (!id || id === 'N/A') return;
        
        if (!window.confirm(`Are you sure you want to permanently delete this ${viewingDataType} record?`)) return;

        try {
            setLoadingData(true);
            let endpoint = `/data/${viewingDataType === 'questionBanks' ? 'question_bank' : viewingDataType === 'enrollments' ? 'course_enrollments' : viewingDataType}/${id}`;
            
            // Map common types to generic backend tables if needed
            if (viewingDataType === 'users') endpoint = `/data/users/${id}`;
            
            await fetchWithAuth(endpoint, { method: 'DELETE' });
            
            toast({ title: "Record Deleted", description: "The item has been permanently removed." });
            
            // Optimistic update
            setDataList(prev => prev.filter(i => getItemId(i, viewingDataType || '') !== id));
            fetchSummary();
        } catch (err) {
            toast({
                title: 'Deletion Failed',
                description: err instanceof Error ? err.message : 'Failed to delete record',
                variant: 'destructive'
            });
        } finally {
            setLoadingData(false);
        }
    };

    const confirmDelete = async () => {
        if (!selectedDataType || deleteConfirmText !== 'DELETE') return;

        try {
            setDeleting(true);
            await fetchWithAuth(`/admin/permanent-delete/${selectedDataType}`, {
                method: 'DELETE'
            });

            toast({
                title: "Data Permanently Deleted",
                description: `All ${dataTypeLabels[selectedDataType]} data has been permanently removed.`
            });

            setShowDeleteDialog(false);
            fetchSummary();
        } catch (err) {
            toast({
                title: 'Deletion Failed',
                description: err instanceof Error ? err.message : 'Failed to delete data',
                variant: 'destructive'
            });
        } finally {
            setDeleting(false);
        }
    };

    const getDisplayValue = (item: BaseDataItem, dataType: string): string => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const i = item as any;
        switch (dataType) {
            case 'users': {
                return i.full_name || i.email || (typeof i.user_id === 'object' ? i.user_id?.full_name : i.user_id?.toString()) || 'Unknown';
            }
            case 'courses':
                return i.title || i.name || 'Untitled Course';
            case 'enrollments':
                return `${i.user_name || i.user_id?.full_name || 'Student'} - ${i.course_title || i.course_id?.title || 'Course'}`;
            case 'questionBanks':
            case 'question_bank':
                return i.topic || i.question_text?.substring(0, 50) || 'Question';
            case 'exams':
                return i.title || i.topic || 'Untitled Exam';
            case 'conversations':
                return i.id?.toString() || 'Conversation';
            default:
                return i.title || i.name || i.topic || 'Record';
        }
    };

    const getItemId = (item: BaseDataItem, dataType: string): string => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const i = item as any;
        if (dataType === 'users') {
            const uId = i.user_id?._id || i.user_id || i._id;
            return typeof uId === 'object' ? uId.toString() : String(uId || '');
        }
        return i.id || i._id?.toString() || i.user_id?.toString() || i.course_id?.toString() || 'N/A';
    };

    if (loading && summary.users === 0 && summary.courses === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading data summary...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Premium slate-900 High-Contrast Banner */}
            <div className="relative overflow-hidden rounded-[2.5rem] p-6 sm:p-10 bg-white border border-slate-200/80 shadow-xl">
                <div className="absolute top-0 right-0 -mr-24 -mt-24 h-64 w-64 bg-primary/10 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-3">
                        <Badge className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-none px-3.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full">
                            System Control Hub
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase italic leading-none text-slate-900">
                            Quality <span className="text-primary not-italic">Assurance</span>
                        </h2>
                        <p className="text-slate-500 text-xs sm:text-sm font-semibold max-w-xl">
                            Perform database audits, inspect low-level table entries, and permanently purge redundant test registries.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 self-start md:self-auto flex-wrap">
                        <Badge variant="destructive" className="h-8 px-3.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider rounded-xl bg-red-50 text-red-600 border border-red-100 shadow-sm">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Destructive Mode
                        </Badge>
                        <SyncDataButton 
                            onSync={onSync || (() => fetchSummary(true))} 
                            isLoading={parentLoading || loading} 
                            className="h-11 px-5 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Warning Alert Banner */}
            <Card className="border border-red-500/15 bg-red-500/5 backdrop-blur-md rounded-3xl overflow-hidden shadow-md">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="h-11 w-11 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0 border border-red-500/20">
                            <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-black text-red-950 text-xs sm:text-sm uppercase tracking-wider">Critical System Warning: Permanent Purges</h4>
                            <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                                Operations listed below bypass standard safety nets to perform direct, unrecoverable cascade DB deletions. 
                                Please double check your parameters. Deleted records cannot be retrieved. All actions are audited.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Responsive Operations Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {dataTypes.map((type) => {
                    const count = summary[type.id as keyof DataSummary] || 0;
                    const Icon = type.icon;
                    return (
                        <Card key={type.id} className="group overflow-hidden border border-slate-200/80 shadow-xl shadow-slate-100/50 hover:shadow-2xl hover:border-slate-300 transition-all duration-500 rounded-3xl bg-white relative">
                            {/* Color Bar Accent */}
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                                type.id === 'users' ? 'from-red-500 to-rose-400' :
                                type.id === 'courses' ? 'from-orange-500 to-amber-400' :
                                type.id === 'enrollments' ? 'from-blue-500 to-cyan-400' :
                                type.id === 'questionBanks' ? 'from-purple-500 to-fuchsia-400' :
                                type.id === 'exams' ? 'from-indigo-500 to-violet-400' :
                                'from-green-500 to-emerald-400'
                            }`} />
                            
                            <CardContent className="p-6 flex flex-col justify-between h-full min-h-[220px]">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110 ${
                                            type.id === 'users' ? 'bg-red-50 border-red-100 text-red-500' :
                                            type.id === 'courses' ? 'bg-orange-50 border-orange-100 text-orange-500' :
                                            type.id === 'enrollments' ? 'bg-blue-50 border-blue-100 text-blue-500' :
                                            type.id === 'questionBanks' ? 'bg-purple-50 border-purple-100 text-purple-500' :
                                            type.id === 'exams' ? 'bg-indigo-50 border-indigo-100 text-indigo-500' :
                                            'bg-green-50 border-green-100 text-green-500'
                                        }`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <Badge className="bg-slate-100 hover:bg-slate-200 border-none text-slate-700 font-extrabold text-[10px] uppercase tracking-wider py-1 px-3 rounded-lg shadow-sm">
                                            {count as number} Records
                                        </Badge>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <h3 className="font-extrabold text-base text-slate-900 group-hover:text-primary transition-colors">{type.label}</h3>
                                        <p className="text-xs text-slate-500 leading-normal font-medium">{type.description}</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 mt-6">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleViewClick(type.id)}
                                        className="flex-1 h-10 rounded-xl border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
                                    >
                                        <Eye className="h-4 w-4 mr-1.5" />
                                        View
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleDeleteClick(type.id)}
                                        className="flex-1 h-10 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all bg-red-600 hover:bg-red-700"
                                        disabled={count === 0}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1.5" />
                                        Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Bottom Status Card */}
            <Card className="border border-slate-200/80 bg-slate-50/50 rounded-[2rem]">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center shadow-md border border-slate-100">
                        <Database className="h-8 w-8 text-primary/45" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-lg font-black text-slate-900 uppercase italic">Database Infrastructure Summary</p>
                        <p className="text-xs text-slate-500 max-w-md font-medium">
                            Central directory mapping core relational tables. Use individual item inspects or batch actions above to regulate storage.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-4">
                        {dataTypes.map((type) => (
                            <div key={type.id} className="flex items-center gap-2.5 px-4 py-2 bg-white rounded-xl border border-slate-200/80 shadow-sm transition-all hover:scale-105">
                                <type.icon className={`h-4 w-4 ${
                                    type.id === 'users' ? 'text-red-500' :
                                    type.id === 'courses' ? 'text-orange-500' :
                                    type.id === 'enrollments' ? 'text-blue-500' :
                                    type.id === 'questionBanks' ? 'text-purple-500' :
                                    type.id === 'exams' ? 'text-indigo-500' :
                                    'text-green-500'
                                }`} />
                                <span className="text-xs font-extrabold text-slate-800">
                                    {(summary[type.id as keyof DataSummary] || 0) as number}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{type.label}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Elegant Small Deletion Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="w-[95vw] sm:max-w-[450px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-red-950 p-5 text-white relative flex-shrink-0 border-b border-red-900">
                        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                        
                        <div className="relative z-10 flex items-center gap-3">
                            <div className="h-9 w-9 bg-red-900/30 backdrop-blur-md rounded-xl flex items-center justify-center border border-red-500/30 shadow-md">
                                <Trash2 className="h-4.5 w-4.5 text-red-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-sm sm:text-base font-black tracking-wider uppercase text-red-100">
                                    Confirm Batch Deletion
                                </DialogTitle>
                                <DialogDescription className="text-red-350 text-[11px] mt-0.5 font-medium leading-none">
                                    Permanently purge {(dataTypeLabels[selectedDataType || ''])?.toLowerCase()} registry
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6 bg-white">
                        <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100 space-y-1">
                            <div className="flex items-center gap-2 text-red-900 text-xs font-black uppercase tracking-wider">
                                <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
                                <span>Registry rows to clear:</span>
                            </div>
                            <p className="text-red-600 font-extrabold text-2xl tracking-tighter">
                                {(summary[selectedDataType as keyof DataSummary] || 0) as number} {(dataTypeLabels[selectedDataType || ''])} Records
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                                Type "DELETE" to initiate override
                            </Label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                                className="w-full h-11 px-4 rounded-xl border-2 border-red-100 focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/10 font-mono text-base tracking-widest font-black uppercase text-center placeholder:text-slate-300"
                            />
                        </div>

                        <DialogFooter className="flex flex-row gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowDeleteDialog(false)}
                                className="flex-1 h-11 rounded-xl border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmDelete}
                                disabled={deleteConfirmText !== 'DELETE' || deleting}
                                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 font-bold text-xs uppercase tracking-wider text-white"
                            >
                                {deleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                Confirm Purge
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Elegant Modern Custom View Dialog */}
            <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                <DialogContent className="w-[95vw] sm:max-w-[650px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl max-h-[85vh] flex flex-col">
                    {/* Header: Fixed Small, Sleek Styling */}
                    <div className="bg-slate-900 p-5 text-white relative flex-shrink-0 border-b border-slate-800">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                        
                        <div className="relative z-10 flex items-center gap-3">
                            <div className="h-9 w-9 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 shadow-md">
                                <Eye className="h-4.5 w-4.5 text-blue-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-black tracking-wider uppercase text-white flex items-center gap-2">
                                    {dataTypeLabels[viewingDataType || '']} <span className="text-blue-400 text-[9px] font-black py-0.5 px-2 bg-blue-500/10 rounded-md tracking-wider uppercase border border-blue-500/20">Audit Portal</span>
                                </DialogTitle>
                                <DialogDescription className="text-slate-300 text-[11px] mt-0.5 font-medium leading-none">
                                    Displaying database entries. Total matched: <span className="text-white font-extrabold font-mono">{(summary[viewingDataType as keyof DataSummary] || 0) as number}</span>
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 bg-white flex-1 overflow-hidden min-h-[300px] flex flex-col">
                        {loadingData ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider animate-pulse">Running audits...</p>
                            </div>
                        ) : dataList.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-3">
                                <div className="h-14 w-14 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                                    <CheckCircle className="h-6 w-6 text-slate-300" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-800 font-extrabold text-sm uppercase tracking-wider">No Registry Match</p>
                                    <p className="text-slate-400 text-xs font-medium">This database collection contains 0 items.</p>
                                </div>
                            </div>
                        ) : (
                            /* Fixed Standard Scroll Container: Guarantees 100% visible scrollbar & handles all members */
                            <div className="flex-grow h-[400px] sm:h-[450px] overflow-y-auto pr-2 space-y-2.5 custom-scrollbar">
                                {dataList.map((item, idx) => (
                                    <div key={item.id || item._id || idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100/70 hover:border-slate-200 hover:bg-slate-100/35 transition-all duration-300">
                                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/5">
                                            <span className="text-xs font-black text-primary">{idx + 1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-extrabold text-xs text-slate-900 truncate uppercase tracking-tight">
                                                {getDisplayValue(item, viewingDataType || '')}
                                            </p>
                                            <p className="text-[10px] text-slate-400 truncate font-semibold font-mono mt-0.5">
                                                UUID: {getItemId(item, viewingDataType || '')}
                                            </p>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-9 w-9 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all flex-shrink-0"
                                            onClick={() => handleIndividualDelete(item)}
                                            title="Permanently Delete Record"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Section */}
                    <div className="p-5 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowViewDialog(false)}
                            className="w-full h-11 rounded-xl border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all"
                        >
                            Close Audit Portal
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
