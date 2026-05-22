import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Video as VideoIcon, Search, RefreshCw, Play, Clock, BookOpen, User, X, UploadCloud, Trash2 } from "lucide-react";
import { fetchWithAuth, API_URL } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { VideoUploader } from "../instructor/VideoUploader";
import { useDeleteCourseVideo } from "@/hooks/useCourseBuilder";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SyncDataButton } from "../admin/data/SyncDataButton";
import { VideoPlayer } from "../dashboard/VideoPlayer";

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  drive_link?: string;
  thumbnail_url: string;
  duration_minutes: number;
  course_id: string;
  module_id: string;
  order_index: number;
  created_at: string;
}

interface Course {
  id: string;
  title: string;
}

interface Module {
  id: string;
  title: string;
  course_id: string;
}

interface ManagerVideoLibraryProps {
  showUpload?: boolean;
  onSync?: () => void;
  loading?: boolean;
}

export function ManagerVideoLibrary({ showUpload = true, onSync, loading: parentLoading = false }: ManagerVideoLibraryProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCourseId, setUploadCourseId] = useState<string>("");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const deleteVideo = useDeleteCourseVideo();
  const { toast } = useToast();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const isGoogleDriveUrl = (url?: string) => {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('docs.google.com');
  };

  const getVideoSrc = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') && !url.includes('.amazonaws.com/')) {
      return url;
    }
    
    let videoUrlKey = url;
    if (videoUrlKey.includes('.amazonaws.com/')) {
      videoUrlKey = videoUrlKey.split('.amazonaws.com/')[1];
    }
    
    if (videoUrlKey.startsWith('/api/s3/public/')) {
      videoUrlKey = videoUrlKey.replace('/api/s3/public/', '');
    } else if (videoUrlKey.startsWith('api/s3/public/')) {
      videoUrlKey = videoUrlKey.replace('api/s3/public/', '');
    } else if (videoUrlKey.startsWith('/s3/public/')) {
      videoUrlKey = videoUrlKey.replace('/s3/public/', '');
    } else if (videoUrlKey.startsWith('s3/public/')) {
      videoUrlKey = videoUrlKey.replace('s3/public/', '');
    }
    if (videoUrlKey.startsWith('/')) {
      videoUrlKey = videoUrlKey.slice(1);
    }
    return `${API_URL}/s3/public/${videoUrlKey}`;
  };

  const loadData = async (showToast = false) => {
    setLoading(true);
    try {
      const [videosRes, coursesRes] = await Promise.all([
        fetchWithAuth('/data/course_videos?sort=created_at&order=desc'),
        fetchWithAuth('/data/courses?select=id,title')
      ]);
      setVideos((videosRes as Video[]) || []);
      setCourses((coursesRes as Course[]) || []);
      if (showToast) {
        toast({ title: "Library Updated", description: "Video repository has been synchronized." });
      }
    } catch (err) {
      console.error('Failed to load videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredVideos = videos.filter(v => {
    const matchesSearch = v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = filterCourse === "all" || v.course_id === filterCourse;
    return matchesSearch && matchesCourse;
  });

  const getCourseTitle = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    return course?.title || 'Unknown Course';
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this video? This action cannot be undone.")) return;
    try {
      await deleteVideo.mutateAsync(id);
      setVideos(videos.filter(v => v.id !== id));
      toast({ title: "Deleted", description: "Video removed successfully." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete video.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <VideoIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{videos.length}</p>
                <p className="text-xs text-muted-foreground">Total Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(videos.reduce((acc, v) => acc + (v.duration_minutes || 0), 0) / 60)}h
                </p>
                <p className="text-xs text-muted-foreground">Total Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{courses.length}</p>
                <p className="text-xs text-muted-foreground">Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="all">All Courses</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>{course.title}</option>
          ))}
        </select>
        <SyncDataButton 
          onSync={onSync || (() => loadData(true))} 
          isLoading={parentLoading || loading} 
          className="h-10 px-4"
        />

        {showUpload && (
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>

            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 overflow-hidden border-none glass-morphism shadow-2xl">
              <div className="p-8 space-y-8 bg-white/95 backdrop-blur-xl">
                <DialogHeader className="p-0 border-b border-indigo-50 pb-6 mb-4">
                  <DialogDescription className="sr-only">Upload and deploy video assets to courses.</DialogDescription>
                  <div className="flex items-center gap-3 mb-2 text-primary font-bold uppercase tracking-widest text-[10px]">
                    <PlusCircle className="h-4 w-4" /> Management Console
                  </div>
                  <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                    Deploy <span className="text-primary not-italic">Media Asset</span>
                  </DialogTitle>
                  <p className="text-sm text-slate-500 font-medium">Managers can deploy videos to any approved course repository.</p>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Select Destination Course</Label>
                    <Select value={uploadCourseId} onValueChange={setUploadCourseId}>
                      <SelectTrigger className="h-14 rounded-2xl border-indigo-100 bg-indigo-50/30 font-bold focus:ring-primary/20 transition-all text-slate-900 shadow-sm">
                        <SelectValue placeholder="Choose a course to receive the asset..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                        {courses.map(course => (
                          <SelectItem key={course.id} value={course.id} className="rounded-xl py-3 cursor-pointer">
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {uploadCourseId ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <VideoUploader
                        courseId={uploadCourseId}
                        courseStatus="published"
                        hideVideoList={true}
                        onSuccess={() => {
                          setIsUploadOpen(false);
                          loadData();
                        }}
                      />
                    </div>
                  ) : (
                    <div className="py-20 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-indigo-100/50">
                      <VideoIcon className="h-12 w-12 text-indigo-100 mx-auto mb-4" />
                      <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Awaiting Course Selection</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-indigo-50 flex justify-end">
                  <Button variant="ghost" onClick={() => setIsUploadOpen(false)} className="rounded-xl font-bold text-slate-400 hover:text-slate-600">Close Manager</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <VideoIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No videos found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => (
            <Card key={video.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {/* Thumbnail */}
              <div className="aspect-video relative bg-slate-100">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url.startsWith('http') ? video.thumbnail_url : `/s3/public/${video.thumbnail_url}`}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoIcon className="h-12 w-12 text-slate-300" />
                  </div>
                )}
                <div
                  className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  onClick={() => {
                    setSelectedVideo(video);
                    setIsPlayerOpen(true);
                  }}
                >
                  <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="h-6 w-6 text-primary ml-1" />
                  </div>
                </div>
                {video.duration_minutes && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {Math.floor(video.duration_minutes / 60)}:{String(video.duration_minutes % 60).padStart(2, '0')}
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
                  {video.title || 'Untitled Video'}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                  {video.description || 'No description'}
                </p>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-3">
                  <Clock className="h-2.5 w-2.5" />
                  <span>Uploaded: {formatDate(video.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {getCourseTitle(video.course_id)}
                  </Badge>
                  {video.duration_minutes && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {video.duration_minutes} min
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(video.id);
                    }}
                    className="ml-auto h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none shadow-2xl rounded-3xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
            <DialogDescription>Video player for {selectedVideo?.title}</DialogDescription>
          </DialogHeader>
          <div className="relative aspect-video bg-black flex items-center justify-center w-full">
            {selectedVideo && (
              <VideoPlayer
                key={selectedVideo.id}
                url={
                  selectedVideo.drive_link
                    ? selectedVideo.drive_link
                    : (isGoogleDriveUrl(selectedVideo.video_url)
                      ? selectedVideo.video_url
                      : getVideoSrc(selectedVideo.video_url || ''))
                }
                videoId={selectedVideo.id}
                courseId={selectedVideo.course_id}
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full z-50 lg:hidden"
              onClick={() => setIsPlayerOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          {/* Blue color bar removed as per user request */}
        </DialogContent>
      </Dialog>
    </div>
  );
}
