import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useEnrolledCourses, useStudentVideos, StudentCourse, useStudentVideoProgress, useUpdateVideoProgress } from '@/hooks/useStudentData';
import { S3CourseVideo } from '@/hooks/useCourseBuilder';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
    Video, 
    Play, 
    Search, 
    Clock, 
    Calendar, 
    Loader2, 
    BookOpen, 
    MonitorPlay,
    Filter,
    Star,
    ExternalLink,
    CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RatingModal } from './RatingModal';

interface VideoProgress {
    video_id: string;
    watched_seconds: number;
    total_seconds: number;
    completed: boolean;
}

export default function StudentVideoLibrary() {
    const location = useLocation();
    const { data: enrolledCourses, isLoading: isLoadingCourses } = useEnrolledCourses();
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [playingVideo, setPlayingVideo] = useState<S3CourseVideo | null>(null);
    const [ratingOpen, setRatingOpen] = useState(false);

    // Progress Tracking Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null);
    const lastUpdateTime = useRef<number>(0);

    // Auto-select course from navigation state (e.g., from My Courses click)
    useEffect(() => {
        const stateId = (location.state as { courseId?: string } | null)?.courseId;
        if (stateId) {
            setSelectedCourseId(stateId);
        }
    }, [location.state]);

    // Auto-select first course if none selected and no state
    useEffect(() => {
        const stateId = (location.state as { courseId?: string } | null)?.courseId;
        if (!stateId && enrolledCourses && enrolledCourses.length > 0 && !selectedCourseId) {
            setSelectedCourseId(enrolledCourses[0].id);
        }
    }, [enrolledCourses, selectedCourseId, location.state]);

    const { data: videos, isLoading: isLoadingVideos } = useStudentVideos(selectedCourseId) as { data: S3CourseVideo[] | undefined, isLoading: boolean };
    const { data: progressData } = useStudentVideoProgress(selectedCourseId) as { data: VideoProgress[] | undefined };
    const updateProgressMutation = useUpdateVideoProgress();

    const filteredVideos = videos?.filter((video: S3CourseVideo) => 
        video.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Map progress data for easy lookup
    const progressMap = new Map<string, VideoProgress>();
    if (progressData) {
        progressData.forEach((p: VideoProgress) => progressMap.set(p.video_id, p));
    }

    const getVideoSrc = (url: string) => {
        if (url.startsWith('http')) return url;
        return `/api/s3/public/${url}`; 
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current || !playingVideo || !selectedCourseId) return;

        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration;

        // Only update every 5 seconds or if significant change
        if (Math.abs(currentTime - lastUpdateTime.current) > 5) {
            updateProgressMutation.mutate({
                courseId: selectedCourseId,
                videoId: playingVideo.id,
                watchedSeconds: Math.floor(currentTime),
                totalSeconds: Math.floor(duration || 0)
            });
            lastUpdateTime.current = currentTime;
        }
    };

    const handleVideoEnded = () => {
         if (!videoRef.current || !playingVideo || !selectedCourseId) return;
         
         updateProgressMutation.mutate({
            courseId: selectedCourseId,
            videoId: playingVideo.id,
            watchedSeconds: Math.floor(videoRef.current.duration),
            totalSeconds: Math.floor(videoRef.current.duration)
        });

        // Trigger Rating Modal
        setRatingOpen(true);
    };

    const handlePause = () => {
        if (!videoRef.current || !playingVideo || !selectedCourseId) return;
        
        // Immediate update on pause
        updateProgressMutation.mutate({
            courseId: selectedCourseId,
            videoId: playingVideo.id,
            watchedSeconds: Math.floor(videoRef.current.currentTime),
            totalSeconds: Math.floor(videoRef.current.duration || 0)
        });
    };

    const handleCloseVideo = (open: boolean) => {
        if (!open) {
            if (videoRef.current && playingVideo && selectedCourseId) {
                // Final update before closing
                updateProgressMutation.mutate({
                    courseId: selectedCourseId,
                    videoId: playingVideo.id,
                    watchedSeconds: Math.floor(videoRef.current.currentTime),
                    totalSeconds: Math.floor(videoRef.current.duration || 0)
                });
            }
            setPlayingVideo(null);
        }
    };

    // Clean up interval on unmount or video close
    useEffect(() => {
        const intervalId = progressUpdateInterval.current;
        const handleBeforeUnload = () => {
            if (videoRef.current && playingVideo && selectedCourseId) {
                // Prepare data
                const data = {
                    courseId: selectedCourseId,
                    videoId: playingVideo.id,
                    watchedSeconds: Math.floor(videoRef.current.currentTime),
                    totalSeconds: Math.floor(videoRef.current.duration || 0)
                };
                // Fire and forget mutation
                updateProgressMutation.mutate(data);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [playingVideo, selectedCourseId, updateProgressMutation]);

    // Load saved progress when video opens
    const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        if (playingVideo) {
            const savedProgress = progressMap.get(playingVideo.id);
            if (savedProgress && savedProgress.watched_seconds > 0 && !savedProgress.completed) {
                // Determine if we should resume (e.g. only if < 95% done)
                if (savedProgress.watched_seconds < (savedProgress.total_seconds * 0.95)) {
                    video.currentTime = savedProgress.watched_seconds;
                }
            }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <RatingModal 
                isOpen={ratingOpen}
                onClose={() => setRatingOpen(false)}
                courseId={selectedCourseId || ''}
                courseTitle={enrolledCourses?.find(c => c.id === selectedCourseId)?.title || 'Course'}
            />
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                        <MonitorPlay className="h-8 w-8 text-primary" />
                        Video Library
                    </h1>
                    <p className="text-slate-600 font-medium mt-1">
                        Access all video lessons from your enrolled courses in one place.
                    </p>
                </div>
            </div>

            {/* Controls Section */}
            <Card className="border-none shadow-md bg-white overflow-hidden">
                <div className="p-1 bg-slate-50 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row gap-4 p-4">
                        <div className="w-full md:w-1/3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block ml-1">
                                Filter by Course
                            </label>
                            <Select value={selectedCourseId || ''} onValueChange={setSelectedCourseId}>
                                <SelectTrigger className="h-11 bg-white border-slate-200 shadow-sm rounded-xl font-medium">
                                    <SelectValue placeholder="Select a course..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-xl border-slate-100">
                                    {isLoadingCourses ? (
                                        <div className="p-4 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Loading courses...
                                        </div>
                                    ) : enrolledCourses?.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-slate-500">No enrolled courses found</div>
                                    ) : (
                                        enrolledCourses?.map((course: StudentCourse) => (
                                            <SelectItem key={course.id} value={course.id} className="font-medium cursor-pointer py-3">
                                                {course.title}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-2/3 relative">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block ml-1">
                                Search Lessons
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    type="search"
                                    placeholder="Search by video title..."
                                    className="pl-10 h-11 bg-white border-slate-200 shadow-sm rounded-xl font-medium focus-visible:ring-primary"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    disabled={!selectedCourseId}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Content Grid */}
            <div className="min-h-[400px]">
                {!selectedCourseId ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                        <div className="h-20 w-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                             <BookOpen className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Select a Course</h3>
                        <p className="text-slate-500 max-w-sm mt-2 font-medium">
                            Choose one of your enrolled courses from the dropdown to browse its video lessons.
                        </p>
                    </div>
                ) : isLoadingVideos ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : !filteredVideos || filteredVideos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                        <div className="h-20 w-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                             <Video className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">No videos available yet</h3>
                        <p className="text-slate-500 max-w-sm mt-2 font-medium">
                            {searchQuery 
                                ? "Try adjusting your search terms." 
                                : "No video lessons have been uploaded for your batch yet. Check back soon!"}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence mode='popLayout'>
                            {filteredVideos.map((video: S3CourseVideo, idx: number) => {
                                const progress = progressMap.get(video.id);
                                const pct = progress && progress.total_seconds > 0 
                                    ? Math.min(100, (progress.watched_seconds / progress.total_seconds) * 100) 
                                    : 0;
                                const isCompleted = progress?.completed || pct >= 95;

                                return (
                                <motion.div
                                    key={video.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                                >
                                    <Card className="group h-full flex flex-col border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden bg-white cursor-pointer" 
                                    onClick={() => {
                                        // Drive link: open directly in new tab
                                        if (!video.video_url && video.drive_link) {
                                            window.open(video.drive_link, '_blank');
                                        } else {
                                            setPlayingVideo(video);
                                        }
                                    }}>
                                        <div className="aspect-video bg-slate-900 relative overflow-hidden group-hover:opacity-95 transition-opacity">
                                            {/* Thumbnail */}
                                            {video.thumbnail_url ? (
                                                <img 
                                                    src={video.thumbnail_url.startsWith('http') ? video.thumbnail_url : `/s3/public/${video.thumbnail_url}`} 
                                                    alt={video.title}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                                    <Video className={`h-12 w-12 opacity-50 group-hover:scale-110 transition-transform duration-500 ${isCompleted ? 'text-green-500' : 'text-slate-700'}`} />
                                                </div>
                                            )}
                                            
                                            {/* Play/Link Button Overlay */}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30">
                                                <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/50 scale-75 group-hover:scale-100 transition-transform duration-300">
                                                    {video.video_url ? (
                                                        <Play className="h-6 w-6 text-white fill-white ml-1" />
                                                    ) : (
                                                        <ExternalLink className="h-6 w-6 text-white" />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="absolute top-3 right-3 flex gap-2">
                                                {isCompleted && (
                                                    <Badge className="bg-green-500/90 backdrop-blur-sm text-white border-none font-bold text-[10px] shadow-sm flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Done
                                                    </Badge>
                                                )}
                                                <Badge className={`backdrop-blur-sm text-white border-none font-mono text-xs ${video.video_url ? 'bg-black/60' : 'bg-indigo-600/80 hover:bg-indigo-600'}`}>
                                                    {video.video_url ? 'Video' : 'Drive'}
                                                </Badge>
                                            </div>

                                            {/* Day Badge top-left */}
                                            {(video as any).release_day && (
                                                <div className="absolute top-3 left-3">
                                                    <Badge className="bg-violet-600/90 backdrop-blur-sm text-white border-none font-black text-[10px]">
                                                        Day {(video as any).release_day}
                                                    </Badge>
                                                </div>
                                            )}
                                            
                                            {/* Progress Bar Overlay */}
                                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
                                                <div 
                                                    className={`h-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-primary'}`} 
                                                    style={{ width: `${pct}%` }} 
                                                />
                                            </div>
                                        </div>
                                        
                                        <CardHeader className="p-5 pb-2">
                                            <CardTitle className="font-bold text-slate-900 text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                                {video.title}
                                            </CardTitle>
                                        </CardHeader>
                                        
                                        <CardContent className="p-5 pt-0 mt-auto">
                                            <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mt-2">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {new Date(video.created_at).toLocaleDateString()}
                                                </div>
                                                {(video as any).release_day && (
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-violet-200 text-violet-600 font-bold">
                                                        Day {(video as any).release_day}
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Video Player Dialog */}
            <Dialog open={!!playingVideo} onOpenChange={handleCloseVideo}>
                <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black border-slate-800 rounded-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>{playingVideo?.title}</DialogTitle>
                        <DialogDescription>Now Playing</DialogDescription>
                    </DialogHeader>
                    
                    {playingVideo && (
                        <div className="flex flex-col">
                            <div className="relative aspect-video bg-black w-full flex items-center justify-center">
                                {playingVideo.video_url ? (
                                    <video 
                                        ref={videoRef}
                                        src={getVideoSrc(playingVideo.video_url)} 
                                        controls 
                                        autoPlay 
                                        className="w-full h-full"
                                        controlsList="nodownload"
                                        onTimeUpdate={handleTimeUpdate}
                                        onEnded={handleVideoEnded}
                                        onPause={handlePause}
                                        onLoadedMetadata={handleVideoLoad}
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                ) : (
                                    <div className="p-10 text-center space-y-6 animate-in zoom-in duration-500">
                                        <div className="h-20 w-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto border border-indigo-500/20">
                                            <ExternalLink className="h-10 w-10 text-indigo-400" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-white tracking-tight">{playingVideo.title}</h3>
                                            <p className="text-slate-400 text-sm">Access this resource on Google Drive.</p>
                                        </div>
                                        <Button 
                                            className="h-12 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                                            onClick={() => window.open(playingVideo.drive_link, '_blank')}
                                        >
                                            Open in Google Drive
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 bg-slate-900 text-white">
                                <h3 className="text-xl font-bold mb-2">{playingVideo.title}</h3>
                                <div className="flex items-center justify-between text-sm text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4" />
                                        Uploaded {new Date(playingVideo.created_at).toLocaleDateString()}
                                    </span>
                                    {progressMap.get(playingVideo.id)?.completed && (
                                        <Badge className="bg-green-600 text-white border-none">
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}