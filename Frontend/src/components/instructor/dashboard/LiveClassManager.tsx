import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video,
    Calendar,
    Clock,
    Plus,
    X,
    AlertCircle,
    VideoOff,
    Users,
    Trash2,
    ImagePlus,
    CheckCircle2,
    ChevronRight,
    Sun,
    Cloud,
    Moon,
    Key
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useInstructorLiveClasses, useCreateLiveClass, useDeleteLiveClass, useInstructorCourses, useBatchStudents, useCourseBatches, Course, LiveClass, uploadLivePoster, StudentRosterEntry } from '@/hooks/useInstructorData';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function LiveClassManager() {
    const { toast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const navigate = useNavigate();
    const { data: liveClasses = [], isLoading } = useInstructorLiveClasses();
    const { data: courses = [] } = useInstructorCourses();
    const createMeeting = useCreateLiveClass();
    const deleteMeeting = useDeleteLiveClass();
    const [idToDelete, setIdToDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        topic: '',
        agenda: '',
        courseId: '',
        targetBatch: 'all'
    });

    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');

    const { data: courseBatches = [], isLoading: isLoadingBatches } = useCourseBatches(formData.courseId);

    const { data: batchStudents = [], isLoading: isLoadingStudents } = useBatchStudents(
        formData.courseId, 
        formData.targetBatch === 'all' ? 'all' : (courseBatches.find(b => b.id === formData.targetBatch)?.batch_type || 'any'),
        formData.targetBatch === 'all' ? null : formData.targetBatch
    );

    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [posterPreview, setPosterPreview] = useState<string | null>(null);
    const [isUploadingPoster, setIsUploadingPoster] = useState(false);
    const [finalPosterUrl, setFinalPosterUrl] = useState<string | null>(null);
    const posterInputRef = useRef<HTMLInputElement>(null);

    const handlePosterChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPosterFile(file);
        
        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (ev) => setPosterPreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        // Upload immediately in background
        setIsUploadingPoster(true);
        try {
            const url = await uploadLivePoster(file);
            setFinalPosterUrl(url);
        } catch (err) {
            console.error(err);
            toast({ title: "Upload failed", description: "Could not upload poster. Please try again.", variant: "destructive" });
        } finally {
            setIsUploadingPoster(false);
        }
    };

    const removePoster = () => {
        setPosterFile(null);
        setPosterPreview(null);
        setFinalPosterUrl(null);
        if (posterInputRef.current) posterInputRef.current.value = '';
    };

    const handleDelete = async () => {
        if (!idToDelete) return;
        
        const loadingToast = toast({
            title: "Deleting session...",
            description: "Please wait while we remove the session and clean up the Zoom meeting.",
        });

        try {
            await deleteMeeting.mutateAsync(idToDelete);
            setIdToDelete(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.courseId) {
            toast({ title: "Course Required", description: "Please select a target course for this live class.", variant: "destructive" });
            return;
        }

        if (isUploadingPoster) {
            toast({ title: "Still uploading...", description: "Please wait for the poster to finish uploading." });
            return;
        }

        try {
            const selectedCourse = (courses as Course[]).find(c => c.id === formData.courseId);
            const batchId = selectedCourse?.assigned_batch_id;

            await createMeeting.mutateAsync({
                ...formData,
                startTime: (() => {
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    const [hours, minutes] = selectedTime.split(':').map(Number);
                    return new Date(year, month - 1, day, hours, minutes).toISOString();
                })(),
                duration: 1440, // Increased duration to effectively remove the "ending concept"
                target_batch: formData.targetBatch === 'all' ? 'all' : (courseBatches.find(b => b.id === formData.targetBatch)?.batch_type || 'all'),
                batchId: formData.targetBatch === 'all' ? null : formData.targetBatch,
                poster_url: finalPosterUrl
            });
            setIsAdding(false);
            setFormData({ topic: '', agenda: '', courseId: '', targetBatch: 'all' });
            setSelectedDate('');
            setSelectedTime('');
            setPosterFile(null);
            setPosterPreview(null);
            setFinalPosterUrl(null);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                        Live Class Manager 📡
                    </h2>
                    <p className="text-muted-foreground mt-1 text-lg">
                        Schedule and manage your interactive Zoom sessions.
                    </p>
                </div>
                <Button
                    onClick={() => setIsAdding(true)}
                    className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-6 rounded-xl transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="w-5 h-5 mr-2" /> Schedule New Class
                </Button>
            </div>

            {/* Main Grid */}
            <div className="grid gap-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-card/30 rounded-3xl border border-dashed animate-pulse">
                        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
                        <p className="text-muted-foreground">Fetching your scheduled sessions...</p>
                    </div>
                ) : liveClasses.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-20 px-6 text-center bg-card/10 rounded-[2rem] border-2 border-dashed border-border/50 backdrop-blur-md"
                    >
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 relative">
                            <VideoOff className="w-12 h-12 text-primary opacity-60" />
                            <div className="absolute inset-0 rounded-full border-4 border-primary/5 animate-ping" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4 tracking-tight">Ready to go live?</h3>
                        <p className="text-muted-foreground max-w-md mx-auto mb-10 text-lg leading-relaxed">
                            Your scheduled sessions will appear here. Start your journey by creating your first interactive live class.
                        </p>
                        <Button 
                            onClick={() => setIsAdding(true)} 
                            className="rounded-2xl px-10 py-7 text-lg font-semibold shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
                        >
                            <Calendar className="w-5 h-5 mr-3" /> Schedule First Session
                        </Button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {liveClasses.map((session: LiveClass, index: number) => (
                                <motion.div
                                    key={session.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="group overflow-hidden border-none bg-white rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.12)] transition-all duration-500 flex flex-col h-full border border-slate-100">
                                        <div className="w-full aspect-video overflow-hidden relative">
                                            {session.poster_url ? (
                                                <img 
                                                    src={session.poster_url} 
                                                    alt={session.title} 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-[#0F172A] flex items-center justify-center relative overflow-hidden">
                                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 0.5px, transparent 0)', backgroundSize: '12px 12px' }} />
                                                    <Video className="w-12 h-12 text-white/10" />
                                                </div>
                                            )}
                                            
                                            {/* Top Overlay Badge */}
                                            <div className="absolute top-3 left-3 z-20">
                                                {new Date(session.scheduled_at) <= new Date() && (
                                                    <Badge className="bg-red-500 text-white border-none animate-pulse font-bold text-[10px] px-2 py-0.5 rounded-lg shadow-xl">
                                                        LIVE
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Floating Badges Overlay */}

                                            <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center gap-2">
                                                <div className="bg-black/50 backdrop-blur-md text-white text-[9px] font-bold px-3 py-1.5 rounded-xl border border-white/10 uppercase tracking-wider">
                                                    {session.target_batch === 'all' ? 'All Batches' : `${session.target_batch} Batch`}
                                                </div>
                                                <div className="bg-[#10B981] text-white text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-lg">
                                                    {session.status}
                                                </div>
                                            </div>

                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
                                        </div>

                                        <CardHeader className="pt-4 pb-2 px-5 flex-grow">
                                            <div className="space-y-2">
                                                <h3 className="text-lg font-bold text-[#0075CF] leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                                                    {session.title}
                                                </h3>
                                                <p className="text-slate-500 text-[13px] line-clamp-2 leading-relaxed min-h-[38px]">
                                                    {session.description || "Interactive professional live session."}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                                                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold">
                                                        <Calendar className="w-3.5 h-3.5 text-primary/60" />
                                                        {format(new Date(session.scheduled_at), 'MMM dd, yyyy')}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold">
                                                        <Clock className="w-3.5 h-3.5 text-primary/60" />
                                                        {format(new Date(session.scheduled_at), 'hh:mm a')}
                                                    </div>
                                                    {session.meeting_password && (
                                                        <div className="flex items-center gap-2 text-[#0075CF] text-sm font-black bg-[#0075CF]/5 px-3 py-1.5 rounded-xl border border-[#0075CF]/10 shadow-sm">
                                                            <Key className="w-4 h-4" />
                                                            <span className="font-mono tracking-widest">{session.meeting_password}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <div className="px-5 py-4 flex items-center justify-between border-t border-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5 text-emerald-600">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">My Session</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => setIdToDelete(session.id)}
                                                    className="text-slate-200 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => session.meeting_id && navigate(`/live/${session.meeting_id}?role=1&pwd=${session.meeting_password || ''}`)}
                                                    className="flex items-center gap-1 text-[#0075CF] font-bold text-xs hover:gap-2 transition-all group/btn"
                                                >
                                                    Manage <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!idToDelete} onOpenChange={(open) => !open && setIdToDelete(null)}>
                <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-red-600">
                            <AlertCircle className="w-6 h-6" />
                            Delete Session?
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 pt-2 text-base">
                            This will permanently delete this live class and its associated Zoom meeting. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 pt-6">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIdToDelete(null)}
                            className="rounded-xl font-bold text-slate-500 hover:bg-slate-50"
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDelete}
                            disabled={deleteMeeting.isPending}
                            className="rounded-xl font-bold shadow-lg shadow-red-200"
                        >
                            {deleteMeeting.isPending ? "Deleting..." : "Delete Permanently"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal - Schedule Class */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsAdding(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 16 }}
                            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setIsAdding(false)}
                                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-500" />
                            </button>

                            {/* Header */}
                            <div className="text-center px-8 pt-10 pb-6 border-b border-slate-100">
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Schedule Live Session</h3>
                                <p className="text-slate-500 text-sm mt-1">Target specific batches for improved engagement</p>
                            </div>

                            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">

                                {/* Session Topic */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Session Topic</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Masterclass on React Patterns"
                                        required
                                        value={formData.topic}
                                        onChange={e => setFormData({ ...formData, topic: e.target.value })}
                                        className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                    />
                                </div>

                                {/* Start Time + Duration */}
                                {/* Start Date & Time Selection */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Session Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={selectedDate && selectedTime ? `${selectedDate}T${selectedTime}` : ""}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val) {
                                                const [d, t] = val.split('T');
                                                setSelectedDate(d);
                                                setSelectedTime(t);
                                            } else {
                                                setSelectedDate('');
                                                setSelectedTime('');
                                            }
                                        }}
                                        className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                    />
                                    <p className="text-[9px] font-bold text-slate-400 italic">This session will start at your local time.</p>
                                </div>


                                {/* Target Selection: Course + Batch Cards */}
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-[#0075CF]">Select Target Course</label>
                                        <select
                                            title="Target Course"
                                            required
                                            value={formData.courseId}
                                            onChange={e => {
                                                const courseId = e.target.value;
                                                setFormData({ 
                                                    ...formData, 
                                                    courseId, 
                                                    targetBatch: 'all' 
                                                });
                                            }}
                                            className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none"
                                        >
                                            <option value="">Choose a course...</option>
                                            {(courses as Course[]).map((course: Course) => (
                                                <option key={course.id} value={course.id}>{course.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {formData.courseId && (
                                        <div className="space-y-2.5">
                                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Select Target Batch</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, targetBatch: 'all' })}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-1.5",
                                                        formData.targetBatch === 'all' 
                                                            ? "bg-primary/5 border-primary shadow-sm" 
                                                            : "bg-white border-slate-100 hover:border-slate-200"
                                                    )}
                                                >
                                                    <Users className={cn("w-5 h-5", formData.targetBatch === 'all' ? "text-primary" : "text-slate-400")} />
                                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", formData.targetBatch === 'all' ? "text-primary" : "text-slate-600")}>All Students</span>
                                                </button>

                                                {courseBatches.map(batch => (
                                                    <button
                                                        key={batch.id}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, targetBatch: batch.id })}
                                                        className={cn(
                                                            "flex flex-col items-start p-3 rounded-xl border-2 transition-all gap-1 group relative overflow-hidden",
                                                            formData.targetBatch === batch.id 
                                                                ? "bg-primary/5 border-primary shadow-sm" 
                                                                : "bg-white border-slate-100 hover:border-slate-200"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "mb-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter",
                                                            batch.batch_type === 'morning' ? "bg-amber-100 text-amber-700" :
                                                            batch.batch_type === 'afternoon' ? "bg-blue-100 text-blue-700" :
                                                            "bg-indigo-100 text-indigo-700"
                                                        )}>
                                                            {batch.batch_type}
                                                        </div>
                                                        <span className={cn("text-[11px] font-bold truncate w-full text-left", formData.targetBatch === batch.id ? "text-primary" : "text-slate-700")}>
                                                            {batch.batch_name}
                                                        </span>
                                                        <div className="absolute top-2 right-2">
                                                            {formData.targetBatch === batch.id && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            {isLoadingBatches && <p className="text-[10px] text-slate-400 italic font-medium animate-pulse">Loading available batches...</p>}
                                        </div>
                                    )}
                                </div>

                                {/* Student Visibility Preview — Batch-Wise */}
                                {formData.courseId && (
                                    <BatchStudentPreview
                                        batchStudents={batchStudents}
                                        isLoadingStudents={isLoadingStudents}
                                        targetBatch={formData.targetBatch}
                                    />
                                )}

                                {/* Agenda */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Agenda / Description</label>
                                    <textarea
                                        placeholder="Tell your students what to expect..."
                                        value={formData.agenda}
                                        onChange={e => setFormData({ ...formData, agenda: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                                    />
                                </div>

                                {/* Session Poster */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        Session Poster
                                        <span className="normal-case font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">1280 × 720 recommended</span>
                                    </label>

                                    {posterPreview ? (
                                        <div className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                            <div className="relative w-full h-[180px]">
                                                <img
                                                    src={posterPreview}
                                                    alt="Poster preview"
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                                                    <button type="button" onClick={() => posterInputRef.current?.click()}
                                                        disabled={isUploadingPoster}
                                                        className="px-4 py-2 bg-white text-slate-900 text-xs font-bold rounded-lg hover:bg-slate-100 transition-all disabled:opacity-50">
                                                        Change
                                                    </button>
                                                    <button type="button" onClick={removePoster}
                                                        disabled={isUploadingPoster}
                                                        className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-all disabled:opacity-50">
                                                        Remove
                                                    </button>
                                                </div>
                                                {isUploadingPoster && (
                                                    <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex flex-col items-center justify-center">
                                                        <div className="w-8 h-8 rounded-full border-2 border-white border-t-transparent animate-spin mb-2" />
                                                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Uploading...</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                                <span className="font-medium truncate max-w-[70%]">{posterFile?.name}</span>
                                                {isUploadingPoster ? (
                                                     <span className="font-bold text-primary animate-pulse italic">Syncing to Cloud...</span>
                                                ) : (
                                                     <span className="font-bold text-emerald-500">Ready to Publish</span>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => posterInputRef.current?.click()}
                                            className="w-full h-[110px] rounded-xl border-2 border-dashed border-slate-200 hover:border-primary/50 bg-slate-50 hover:bg-primary/5 transition-all flex items-center justify-center gap-4 group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                                                <ImagePlus className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-semibold text-slate-700">Upload Session Poster</p>
                                                <p className="text-xs text-slate-400 mt-0.5">YouTube thumbnail · 1280 × 720 px · PNG / JPG</p>
                                            </div>
                                        </button>
                                    )}
                                    <input ref={posterInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePosterChange} />
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={createMeeting.isPending || isUploadingPoster}
                                        className="flex-1 h-11 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                                    >
                                        {isUploadingPoster ? 'Uploading Poster...' : createMeeting.isPending ? 'Generating Zoom Link...' : 'Publish Live Class'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsAdding(false)}
                                        className="px-5 h-11 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                {createMeeting.isError && (
                                    <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-xs border border-red-100">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {createMeeting.error.message}
                                    </div>
                                )}
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function BatchStudentPreview({ batchStudents, isLoadingStudents, targetBatch }: { 
    batchStudents: StudentRosterEntry[], 
    isLoadingStudents: boolean, 
    targetBatch: string 
}) {
    return (
        <div className="bg-slate-50/50 backdrop-blur-sm rounded-xl p-5 border border-slate-200/60 shadow-inner">
            <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-primary/60" />
                        Target Audience
                    </h4>
                    <p className="text-sm font-bold text-slate-700 mt-0.5">
                        {targetBatch === 'all' 
                            ? 'Broadcasting to All Students' 
                            : `Filtered: ${targetBatch.charAt(0).toUpperCase() + targetBatch.slice(1)} Session`}
                    </p>
                </div>
                {isLoadingStudents && (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
            </div>
            
            <div className="bg-white rounded-lg border border-slate-100 p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <div className={cn(
                        "p-1.5 rounded-lg",
                        targetBatch === 'morning' ? "bg-amber-50 text-amber-600" :
                        targetBatch === 'afternoon' ? "bg-blue-50 text-blue-600" :
                        targetBatch === 'evening' ? "bg-indigo-50 text-indigo-600" :
                        "bg-slate-100 text-slate-600"
                    )}>
                        {targetBatch === 'morning' ? <Sun className="w-3.5 h-3.5" /> : 
                         targetBatch === 'afternoon' ? <Cloud className="w-3.5 h-3.5" /> :
                         targetBatch === 'evening' ? <Moon className="w-3.5 h-3.5" /> :
                         <Users className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs font-bold text-slate-600">
                        {batchStudents.length} Students {targetBatch !== 'all' && 'in this session'}
                    </span>
                </div>

                {batchStudents.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                        {batchStudents.map(student => (
                            <div 
                                key={student.id} 
                                className="flex items-center gap-2 bg-slate-50/80 px-2 py-1.5 rounded-md border border-slate-100 transition-all hover:border-primary/20 hover:bg-white"
                            >
                                {student.avatar_url ? (
                                    <img src={student.avatar_url} className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-100" alt="" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                                        {student.full_name?.charAt(0)}
                                    </div>
                                )}
                                <span className="text-[10px] font-bold text-slate-600 truncate">
                                    {student.full_name?.split(' ')[0]}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-4 text-center border-2 border-dashed border-slate-50 rounded-lg">
                        <Users className="w-6 h-6 text-slate-200 mx-auto mb-2" />
                        <p className="text-[10px] text-slate-400 font-medium italic">
                            {isLoadingStudents ? 'Scanning batch roster...' : 'No students identified for this session yet.'}
                        </p>
                    </div>
                )}
            </div>
            
            <div className="mt-3 flex items-center gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-widest pl-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Only authorized students can join
            </div>
        </div>
    );
}

