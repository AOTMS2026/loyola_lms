import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCourseModules, useModuleVideos, useS3Upload, CourseModule, S3CourseVideo, useCreateCourseVideo, useDeleteCourseVideo, useCreateCourseModule } from "@/hooks/useCourseBuilder";
import { fetchWithAuth } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Lock, PlayCircle, CheckCircle, Loader2, Plus, X, Video, Layers, Image as ImageIcon, Camera, Clock, ExternalLink, Link, Pencil, Save } from "lucide-react";

const deriveBatchType = (selectedIds: string[], allBatches: {id: string, batch_type: string}[]) => {
  if (selectedIds.length === 0) return 'all';
  const types = allBatches.filter(b => selectedIds.includes(b.id)).map(b => b.batch_type);
  const unique = [...new Set(types)];
  return unique.length === 1 ? unique[0] : 'all';
};

interface VideoUploaderProps {
  courseId: string;
  courseStatus?: string;
  hideVideoList?: boolean;
  onSuccess?: () => void;
  initialModuleId?: string;
}

export function VideoUploader({ courseId, courseStatus, hideVideoList = false, onSuccess, initialModuleId }: VideoUploaderProps) {
  const { data: modulesData, isLoading: modulesLoading } = useCourseModules(courseId);
  const modules = useMemo(() => (modulesData || []) as CourseModule[], [modulesData]);
  const { data: videosData, isLoading: videosLoading } = useModuleVideos(null, courseId);
  const videos = useMemo(() => (videosData || []) as S3CourseVideo[], [videosData]);
  const uploadS3 = useS3Upload();
  const createVideo = useCreateCourseVideo();
  const deleteVideo = useDeleteCourseVideo();
  const createModule = useCreateCourseModule();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<S3CourseVideo | null>(null);

  // Edit link state
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [newVideo, setNewVideo] = useState({
    title: "",
    drive_link: "",
    module_id: "",
    release_day: 1,
    is_published: true,
    batch_type: 'all',
    allowed_batches: [] as string[]
  });

  const [batches, setBatches] = useState<{ id: string, batch_name: string, batch_type: string }[]>([]);

  useEffect(() => {
    if (courseId) {
      fetchWithAuth(`/batches?course_id=${courseId}`).then((d: any) => setBatches(d || [])).catch(() => {});
    }
  }, [courseId]);

  useEffect(() => {
    if (initialModuleId) {
      setNewVideo(p => ({ ...p, module_id: initialModuleId }));
    } else if (modules.length > 0 && !newVideo.module_id && !isCreatingModule) {
      setNewVideo(p => ({ ...p, module_id: modules[0].id }));
    } else if (modules.length === 0 && !modulesLoading) {
      setIsCreatingModule(true);
    }
  }, [modules, modulesLoading, initialModuleId]);

  const toggleBatch = (id: string) => {
    const updated = newVideo.allowed_batches.includes(id)
      ? newVideo.allowed_batches.filter(b => b !== id)
      : [...newVideo.allowed_batches, id];
    setNewVideo(p => ({ ...p, allowed_batches: updated, batch_type: deriveBatchType(updated, batches) }));
  };

  const formatDate = (d?: string) => {
    if (!d) return 'N/A';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
  };

  const handleSave = async () => {
    if (!newVideo.drive_link.trim()) {
      toast({ title: "Link Required", description: "Please paste a Google Drive link.", variant: "destructive" });
      return;
    }
    if (!newVideo.title.trim()) {
      toast({ title: "Title Required", description: "Please enter a video title.", variant: "destructive" });
      return;
    }
    if (!isCreatingModule && !newVideo.module_id) {
      toast({ title: "Module Required", description: "Select or create a module.", variant: "destructive" });
      return;
    }
    if (isCreatingModule && !newModuleName.trim()) {
      toast({ title: "Module Name Required", description: "Enter a module name.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let targetModuleId = newVideo.module_id;
      if (isCreatingModule) {
        const mod = await createModule.mutateAsync({
          course_id: courseId,
          title: newModuleName,
          order_index: modules.length || 0,
          batch_type: newVideo.batch_type,
          allowed_batches: newVideo.allowed_batches
        }) as CourseModule;
        targetModuleId = mod.id;
        setIsCreatingModule(false);
        setNewModuleName("");
      }

      let thumbnailUrl = "";
      if (thumbnailFile) {
        thumbnailUrl = await uploadS3.mutateAsync({ file: thumbnailFile, folder: 'VIDEO THUMBNAILS', courseId });
      }

      await createVideo.mutateAsync({
        courseId,
        moduleId: targetModuleId,
        title: newVideo.title,
        video_type: 'external',
        video_url: "",
        drive_link: newVideo.drive_link,
        thumbnail_url: thumbnailUrl,
        order_index: videos.length,
        release_day: newVideo.release_day,
        allowed_batches: newVideo.allowed_batches,
        batch_type: newVideo.batch_type
      });

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2000);
      setNewVideo(p => ({ ...p, title: "", drive_link: "", module_id: targetModuleId, release_day: videos.length + 2 }));
      setThumbnailFile(null);
      setThumbnailPreviewUrl(null);
      toast({ title: "Video Added!", description: "Google Drive link saved successfully." });
      if (onSuccess) onSuccess();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save video.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    try {
      await deleteVideo.mutateAsync(id);
      toast({ title: "Deleted", description: "Video removed." });
    } catch {
      toast({ title: "Error", description: "Could not delete.", variant: "destructive" });
    }
  };

  const handleEditLink = async (videoId: string) => {
    if (!editingLink.trim()) {
      toast({ title: "Link Required", variant: "destructive" });
      return;
    }
    setEditSaving(true);
    try {
      await fetchWithAuth(`/data/course_videos/${videoId}`, {
        method: 'PUT',
        body: JSON.stringify({ drive_link: editingLink.trim() })
      });
      toast({ title: "Link Updated!", description: "New Google Drive link saved." });
      setEditingVideoId(null);
      setEditingLink("");
      // Force refetch via query invalidation — useCourseBuilder handles this
      deleteVideo.mutateAsync('__noop__').catch(() => {}); // triggers refetch
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to update link.", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const getModuleTitle = (moduleId: string) => modules.find(m => m.id === moduleId)?.title || 'Unknown';
  const isCourseOk = courseStatus === 'approved' || courseStatus === 'published' || courseStatus === 'draft' || courseStatus === 'rejected' || !courseStatus;

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <div className="pro-card bg-white rounded-3xl border border-slate-100 p-6 lg:p-10 shadow-xl shadow-slate-200/50">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Add Video Lesson</h2>
            <p className="text-sm text-slate-500 mt-1">Paste a Google Drive link — no file upload needed.</p>
          </div>
          <div className="h-14 w-14 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" className="text-amber-500">
              <path fill="currentColor" d="M20.21 12l-3.3 5.72h-6.6L13.61 12l-3.3-5.71h6.61l3.29 5.71zm-9.91-5.71L7 6.29L3.71 12l3.3 5.71h6.6L10.31 12zM2.87 13.71L6.16 19.43l3.3-5.72z" />
            </svg>
          </div>
        </div>

        <div className="space-y-8 max-w-3xl mx-auto">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" /> Video Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Day 3 — Arrays & Loops"
              value={newVideo.title}
              onChange={e => setNewVideo(p => ({ ...p, title: e.target.value }))}
              className="h-13 rounded-2xl border-slate-200 border-2 text-base font-semibold"
            />
          </div>

          {/* Google Drive Link */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500" /> Google Drive Link <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                placeholder="https://drive.google.com/file/d/..."
                value={newVideo.drive_link}
                onChange={e => setNewVideo(p => ({ ...p, drive_link: e.target.value }))}
                className="h-13 rounded-2xl border-amber-200 border-2 bg-amber-50/30 pl-12 text-base font-medium"
              />
              <Link className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-400" />
            </div>
            {newVideo.drive_link && (
              <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 ml-1">
                <CheckCircle className="h-3 w-3" /> Link ready
              </p>
            )}
          </div>

          {/* Release Day */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-500" /> Release Day <span className="text-rose-500">*</span>
            </Label>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={newVideo.release_day}
                  onChange={e => setNewVideo(p => ({ ...p, release_day: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="h-12 rounded-xl border-violet-200 border-2 bg-violet-50/30 pl-12 font-black text-lg text-violet-700"
                />
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-violet-400" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium ml-1">
              {newVideo.release_day === 1
                ? '✅ Visible from Day 1 (student join date)'
                : `🔒 Unlocks on Day ${newVideo.release_day} — ${newVideo.release_day - 1} day${newVideo.release_day > 2 ? 's' : ''} after student joins`}
            </p>
          </div>

          {/* Module */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" /> Module <span className="text-rose-500">*</span>
              </Label>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-primary font-bold text-[10px] uppercase"
                onClick={() => setIsCreatingModule(!isCreatingModule)}>
                {isCreatingModule ? "Cancel" : "+ New Module"}
              </Button>
            </div>
            <AnimatePresence mode="wait">
              {isCreatingModule ? (
                <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                  <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center border-2 border-blue-200 shrink-0">
                    <Layers className="h-5 w-5 text-blue-500" />
                  </div>
                  <Input placeholder="Module name..." value={newModuleName}
                    onChange={e => setNewModuleName(e.target.value)}
                    className="rounded-xl border-blue-200 border-2 bg-blue-50/30 font-semibold" autoFocus />
                </motion.div>
              ) : (
                <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Select value={newVideo.module_id} onValueChange={v => setNewVideo(p => ({ ...p, module_id: v }))} disabled={modulesLoading}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 border-2 font-semibold">
                      <SelectValue placeholder={modulesLoading ? "Loading..." : "Choose module"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Batch (optional) */}
          {batches.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-indigo-500" /> Restrict to Batch (Optional)
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant={newVideo.allowed_batches.length === 0 ? "default" : "outline"}
                  onClick={() => setNewVideo(p => ({ ...p, allowed_batches: [], batch_type: 'all' }))}
                  className="rounded-xl h-9 px-4 text-xs font-bold">All Students</Button>
                {batches.map(b => (
                  <Button key={b.id} type="button"
                    variant={newVideo.allowed_batches.includes(b.id) ? "default" : "outline"}
                    onClick={() => toggleBatch(b.id)}
                    className="rounded-xl h-9 px-4 text-xs font-bold">
                    {b.batch_name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Thumbnail (Optional) */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-indigo-500" /> Thumbnail
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Optional</span>
            </Label>
            {thumbnailPreviewUrl ? (
              <div className="relative w-48 rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={thumbnailPreviewUrl} className="w-full aspect-video object-cover" alt="" />
                <Button size="icon" variant="destructive"
                  className="absolute top-1 right-1 h-7 w-7 rounded-lg"
                  onClick={() => { setThumbnailFile(null); setThumbnailPreviewUrl(null); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group w-fit"
                onClick={() => {
                  const inp = document.createElement('input');
                  inp.type = 'file'; inp.accept = 'image/*';
                  inp.onchange = (e: Event) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (f) { setThumbnailFile(f); setThumbnailPreviewUrl(URL.createObjectURL(f)); }
                  };
                  inp.click();
                }}>
                <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-primary/10">
                  <ImageIcon className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                </div>
                <span className="text-sm font-bold text-slate-400 group-hover:text-primary">Add thumbnail image</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-2">
            <Button variant="outline"
              onClick={() => { setNewVideo({ title: "", drive_link: "", module_id: "", release_day: 1, is_published: true, allowed_batches: [], batch_type: "all" }); setNewModuleName(""); setThumbnailFile(null); setThumbnailPreviewUrl(null); }}
              disabled={saving}
              className="w-1/3 h-12 rounded-2xl font-bold text-xs uppercase tracking-wider">
              Clear
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !newVideo.drive_link.trim() || !newVideo.title.trim()}
              className={`w-2/3 h-12 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg ${uploadSuccess ? 'bg-emerald-500' : 'bg-primary'}`}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link className="h-4 w-4 mr-2" />}
              {uploadSuccess ? "Saved!" : isCreatingModule ? "Create & Save" : "Save Video Link"}
            </Button>
          </div>
        </div>
      </div>

      {/* Video List */}
      {!hideVideoList && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Video Library ({videos.length})</h3>
          </div>

          <AnimatePresence mode="wait">
            {videosLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-52 bg-slate-100 animate-pulse rounded-3xl" />)}
              </div>
            ) : !isCourseOk ? (
              <div className="flex flex-col items-center justify-center p-16 bg-slate-50 rounded-3xl border text-center">
                <Lock className="h-10 w-10 text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-900">Course Pending Approval</h3>
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border border-dashed text-center">
                <Video className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-400">No videos yet. Add a Google Drive link above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video, i) => (
                  <motion.div key={video.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }} whileHover={{ y: -4 }} className="group">
                    <div className="pro-card bg-white rounded-[2rem] border-slate-100 p-3 shadow-sm hover:shadow-xl transition-all flex flex-col">
                      {/* Thumbnail / Preview */}
                      <div
                        className="relative aspect-video rounded-[1.5rem] bg-gradient-to-br from-amber-50 to-amber-100 overflow-hidden cursor-pointer flex items-center justify-center"
                        onClick={() => setPlayingVideo(video)}>
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url.startsWith('http') ? video.thumbnail_url : `/s3/public/${video.thumbnail_url}`}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" className="text-amber-400 opacity-60">
                            <path fill="currentColor" d="M20.21 12l-3.3 5.72h-6.6L13.61 12l-3.3-5.71h6.61l3.29 5.71zm-9.91-5.71L7 6.29L3.71 12l3.3 5.71h6.6L10.31 12zM2.87 13.71L6.16 19.43l3.3-5.72z" />
                          </svg>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="h-12 w-12 bg-white/90 rounded-full flex items-center justify-center shadow">
                            <ExternalLink className="h-6 w-6 text-amber-600" />
                          </div>
                        </div>
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-amber-500/90 text-white border-none text-[10px] font-bold">Drive</Badge>
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-black text-slate-900 leading-tight truncate">{video.title}</h4>
                          <p className="text-xs text-slate-400 mt-1">{getModuleTitle(video.module_id)}</p>
                        </div>

                        {/* Inline Edit Link */}
                        <div className="mt-4">
                          {editingVideoId === video.id ? (
                            <div className="flex gap-2">
                              <Input
                                value={editingLink}
                                onChange={e => setEditingLink(e.target.value)}
                                placeholder="New Drive link..."
                                className="h-9 rounded-xl text-xs border-amber-200 bg-amber-50/30"
                                autoFocus
                              />
                              <Button size="icon" className="h-9 w-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 shrink-0"
                                disabled={editSaving}
                                onClick={() => handleEditLink(video.id)}>
                                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl shrink-0"
                                onClick={() => { setEditingVideoId(null); setEditingLink(""); }}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                                <Clock className="h-3 w-3" />
                                {formatDate(video.created_at)}
                              </div>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost"
                                  className="h-8 w-8 rounded-xl hover:bg-amber-50 hover:text-amber-600"
                                  title="Update Drive Link"
                                  onClick={() => { setEditingVideoId(video.id); setEditingLink(video.drive_link || ""); }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost"
                                  className="h-8 w-8 rounded-xl hover:bg-rose-50 hover:text-rose-500"
                                  onClick={() => handleDelete(video.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Drive Link Preview Dialog */}
          <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
            <DialogContent className="max-w-lg p-0 bg-slate-900 rounded-3xl overflow-hidden border-none">
              <DialogHeader className="sr-only"><DialogTitle>{playingVideo?.title}</DialogTitle></DialogHeader>
              {playingVideo && (
                <div className="p-10 text-center space-y-6">
                  <div className="h-20 w-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" className="text-amber-400">
                      <path fill="currentColor" d="M20.21 12l-3.3 5.72h-6.6L13.61 12l-3.3-5.71h6.61l3.29 5.71zm-9.91-5.71L7 6.29L3.71 12l3.3 5.71h6.6L10.31 12zM2.87 13.71L6.16 19.43l3.3-5.72z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{playingVideo.title}</h3>
                    <p className="text-slate-400 text-sm mt-1">Hosted on Google Drive</p>
                  </div>
                  <Button className="h-12 px-8 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl"
                    onClick={() => window.open(playingVideo.drive_link, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" /> Open in Google Drive
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
