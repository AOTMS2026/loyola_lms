import React, { useState, useRef, useCallback } from 'react';
import { 
  Cloud, 
  Upload, 
  FileText, 
  File as FileIcon, 
  Trash2, 
  Eye, 
  Search, 
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Presentation,
  BookOpen,
  Users,
  Archive
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardFooter,
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { fetchWithAuth, API_URL } from '@/lib/api';
import { 
  useResources, 
  useCreateResource, 
  useDeleteResource,
  Course,
  CourseResource
} from '@/hooks/useInstructorData';
import { useAuth } from '@/hooks/useAuth';
import { CourseSelector } from '@/components/instructor/CourseSelector';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
  'image/gif'
];

interface Batch {
  id: string;
  batch_name: string;
}

export function ResourcesDashboard() {
  const { user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string | null>(null);

  // Form states for metadata confirmation
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [pendingResource, setPendingResource] = useState<{
    file: File;
    publicUrl: string;
    filePath: string;
  } | null>(null);
  const [resourceFormData, setResourceFormData] = useState({
    title: '',
    description: '',
    resource_type: 'Study Material' as CourseResource['resource_type'],
    category: '',
    allowed_batches: [] as string[]
  });

  const [batches, setBatches] = useState<Batch[]>([]);

  // Viewer dialog state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerTitle, setViewerTitle] = useState('');
  const [viewerType, setViewerType] = useState<'pdf' | 'image' | 'video' | 'zip' | 'office' | 'other'>('pdf');
  const [iframeLoading, setIframeLoading] = useState(false);
  const [pdfPages, setPdfPages] = useState<string[] | null>(null);
  const [pdfPagesLoading, setPdfPagesLoading] = useState(false);
  const [zipEntries, setZipEntries] = useState<{ name: string; size: number }[] | null>(null);
  const [zipEntriesLoading, setZipEntriesLoading] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const getFileType = (url: string, fallbackExt?: string): 'pdf' | 'image' | 'video' | 'zip' | 'office' | 'other' => {
    const lower = url.toLowerCase().split('?')[0];
    const urlExt = lower.match(/\.([a-z0-9]+)$/)?.[1];
    const ext = urlExt || (fallbackExt || '').toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpeg', 'jpg', 'gif', 'png', 'webp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
    if (ext === 'zip') return 'zip';
    if (['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)) return 'office';
    return 'other';
  };

  const handleViewContent = async (resource: CourseResource) => {
    const url = resource.file_url || '';
    const type = getFileType(url, resource.upload_format);
    console.log('[ResourcesDashboard] handleViewContent →', { url, uploadFormat: resource.upload_format, detectedType: type });
    setViewerTitle(resource.asset_title);
    setViewerType(type);
    setIframeLoading(true);
    setPdfPages(null);
    setZipEntries(null);

    if (type === 'pdf') {
      // Render as page images — Google Docs Viewer fetches the raw .pdf server-side too,
      // which hits the same Cloudinary "untrusted PDF delivery" 401 and shows nothing.
      setPdfPagesLoading(true);
      try {
        const { pages } = await fetchWithAuth<{ pages: string[] }>(`/upload/pdf-pages?fileUrl=${encodeURIComponent(url)}`);
        setPdfPages(pages);
      } catch (err) {
        console.error('Failed to load PDF pages:', err);
        setPdfPages([]);
      } finally {
        setPdfPagesLoading(false);
        setIframeLoading(false);
      }
    } else if (type === 'zip') {
      // A zip has nothing to render visually — list what's inside instead, without ever
      // exposing the actual file bytes or a download link.
      setZipEntriesLoading(true);
      try {
        const { entries } = await fetchWithAuth<{ entries: { name: string; size: number }[] }>(`/upload/zip-contents?fileUrl=${encodeURIComponent(url)}`);
        setZipEntries(entries);
      } catch (err) {
        console.error('Failed to load zip contents:', err);
        setZipEntries([]);
      } finally {
        setZipEntriesLoading(false);
        setIframeLoading(false);
      }
    } else if (type === 'office') {
      // Office Online Viewer — the properly supported option for ppt/doc/xls, unlike
      // Google's ad-hoc viewer which frequently fails on URLs it hasn't seen before
      const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
      console.log('[ResourcesDashboard] Using Office Online Viewer:', officeViewerUrl);
      setViewerUrl(officeViewerUrl);
    } else if (type === 'other') {
      // Google Docs Viewer fallback for anything else
      setViewerUrl(`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`);
    } else {
      setViewerUrl(url);
    }
    setViewerOpen(true);
  };

  React.useEffect(() => {
    const loadBatches = async () => {
      if (!selectedCourse) return;
      try {
        const data = (await fetchWithAuth(`/batches?course_id=${selectedCourse.id}`)) as Batch[];
        setBatches(data || []);
      } catch (e) {
        console.error("Failed to load batches", e);
      }
    };
    loadBatches();
  }, [selectedCourse]);

  const { data: resources = [], isLoading: loadingResources, refetch } = useResources(selectedCourse?.id || null);
  const createResource = useCreateResource();
  const deleteResource = useDeleteResource();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files) as File[];
    if (files.length > 0) {
      validateAndAddFiles(files);
    }
  };

  const validateAndAddFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the 100MB limit.`,
          variant: 'destructive'
        });
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setUploadFiles(prev => [...prev, ...validFiles]);
      handleUpload(validFiles[0]); // Upload first file then ask for metadata
    }
  };

  const handleUpload = async (file: File) => {
    if (!selectedCourse || !user) return;

    setUploading(true);
    setUploadProgress(0);
    setCurrentUploadingFile(file.name);
    try {
        const formData = new FormData();
        formData.append('file', file);

        // Call the new Backend API endpoint for storage upload
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/upload/course-resources`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        if (!res.ok) {
            let errMsg = `Upload failed (status ${res.status})`;
            try {
                const err = await res.json();
                errMsg = err.error || errMsg;
            } catch {
                if (res.status === 413) errMsg = 'File is too large to upload.';
            }
            throw new Error(errMsg);
        }

        const { url: publicUrl } = await res.json();

        // Open Dialog to confirm metadata
        setPendingResource({ file, publicUrl, filePath: publicUrl });
        setResourceFormData({
            title: file.name,
            description: `Resource for course ${selectedCourse.title}`,
            resource_type: getResourceType(file.type || '', file.name) as CourseResource['resource_type'],
            category: '',
            allowed_batches: []
        });
        setMetadataDialogOpen(true);

    } catch (error: unknown) {
        const err = error as Error;
        console.error('Upload error:', err);
        toast({
            title: 'Upload failed',
            description: `Failed to upload ${file.name}. ${err.message}`,
            variant: 'destructive'
        });
    } finally {
        setUploading(false);
        setUploadFiles([]);
    }
  };

  const handleSaveMetadata = async () => {
    if (!pendingResource || !selectedCourse || !user) return;

    try {
        await createResource.mutateAsync({
            course_id: selectedCourse.id,
            asset_title: resourceFormData.title,
            file_url: pendingResource.publicUrl,
            resource_type: resourceFormData.resource_type,
            upload_format: pendingResource.file.name.split('.').pop() || 'unknown',
            instructor_avatar_url: (user as { photoURL?: string }).photoURL || '',
            instructor_name: (user as { displayName?: string, email?: string }).displayName || user.email || 'Instructor',
            short_description: resourceFormData.description,
            category: resourceFormData.category,
            allowed_batches: resourceFormData.allowed_batches
        });

        toast({
            title: 'Resource Published',
            description: `${resourceFormData.title} is now available for students.`,
            className: "bg-green-500 text-white",
        });

        setMetadataDialogOpen(false);
        setPendingResource(null);
        refetch();
    } catch (error: unknown) {
        const err = error as Error;
        toast({
            title: 'Save failed',
            description: err.message,
            variant: 'destructive'
        });
    }
  };

  const getResourceType = (mimeType: string, fileName: string): string => {
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) return 'Study Material';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation') || fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) return 'Presentation';
    if (mimeType.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'Assignment';
    if (fileName.endsWith('.zip') || fileName.endsWith('.rar')) return 'Project';
    return 'Reading List';
  };

  const handleDelete = async (resource: CourseResource) => {
    if (!window.confirm(`Are you sure you want to delete "${resource.asset_title}"?`)) return;

    try {
        // Backend handles both Firestore entry and Storage deletion via its API
        await deleteResource.mutateAsync({ id: resource.id, courseId: resource.course_id });
        refetch();
    } catch (error: unknown) {
        const err = error as Error;
        toast({
            title: 'Delete failed',
            description: err.message,
            variant: 'destructive'
        });
    }
  };

  const filteredResources = resources.filter(res => {
    const title = res.asset_title || '';
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || res.resource_type === filterType;
    return matchesSearch && matchesType;
  });

  const getFileIcon = (type: string) => {
    switch(type) {
      case 'Study Material': return <FileText className="h-5 w-5 text-rose-500" />;
      case 'Presentation': return <Presentation className="h-5 w-5 text-amber-500" />;
      case 'Assignment': return <BookOpen className="h-5 w-5 text-indigo-500" />;
      case 'Exercise': return <RefreshCw className="h-5 w-5 text-emerald-500" />;
      case 'Project': return <Cloud className="h-5 w-5 text-blue-500" />;
      default: return <FileIcon className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <BookOpen className="h-5 w-5 text-white" />
             </div>
             <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 uppercase italic">
                Course Resources
             </h1>
          </div>
          <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-[0.2em] ml-1">
            Global Asset Repository & Content Management
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={loadingResources || !selectedCourse}
            className="h-12 w-12 rounded-2xl border-slate-200 hover:bg-slate-50 transition-all flex item-center justify-center p-0"
          >
            <RefreshCw className={`h-5 w-5 ${loadingResources ? 'animate-spin text-primary' : 'text-slate-400'}`} />
          </Button>
          <div className="w-full sm:w-64">
            <CourseSelector 
              selectedCourse={selectedCourse} 
              onSelectCourse={setSelectedCourse} 
            />
          </div>
          <Button 
            className="h-12 px-6 rounded-2xl pro-button-primary font-black gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedCourse}
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Add Resource</span>
          </Button>
        </div>
      </div>

      {!selectedCourse ? (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center py-32 text-center bg-muted/5 rounded-3xl">
          <div className="bg-muted p-6 rounded-full mb-6">
            <BookOpen className="h-16 w-16 text-muted-foreground opacity-30" />
          </div>
          <h3 className="text-xl font-bold mb-2">Select a Course</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Choose a course from the dropdown above to start managing resources and uploading files.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Upload */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-b from-card to-muted/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-primary" />
                  Quick Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-2xl p-8
                    flex flex-col items-center justify-center text-center cursor-pointer
                    transition-all duration-300 group
                    ${isDragging 
                      ? 'border-primary bg-primary/10 scale-[0.98] ring-4 ring-primary/5' 
                      : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5'}
                  `}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    multiple 
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      validateAndAddFiles(files);
                    }}
                  />
                  <div className="bg-primary/10 p-5 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Cloud className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="font-bold text-base mb-1">Click to Upload</h4>
                  <p className="text-xs text-muted-foreground mb-4">or drag and drop files</p>
                  <div className="flex flex-wrap justify-center gap-1.5 px-4">
                    {['PDF', 'PPT', 'DOCX', 'ZIP'].map(type => (
                      <Badge key={type} variant="secondary" className="font-semibold text-[10px] py-0">{type}</Badge>
                    ))}
                  </div>
                </div>

                {uploadFiles.length > 0 && (
                  <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-bold">Selected Files ({uploadFiles.length})</h5>
                      <Button variant="ghost" size="sm" onClick={() => setUploadFiles([])} className="h-7 text-xs text-destructive hover:text-destructive">Clear All</Button>
                    </div>
                    <ScrollArea className="h-40 pr-4">
                      <div className="space-y-2">
                        {uploadFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                            </div>
                            <span className="text-muted-foreground ml-2 capitalize">{file.name.split('.').pop()}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <Button 
                      className="w-full shadow-lg h-11 text-sm font-bold transition-all hover:scale-[1.02]" 
                      onClick={() => handleUpload(uploadFiles[0])}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Uploading {uploadProgress}%
                        </>
                      ) : (
                        'Process & Upload'
                      )}
                    </Button>
                  </div>
                )}
                
                {uploading && (
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        {currentUploadingFile}
                      </span>
                      <span className="font-mono">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-none shadow-inner">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/20 p-3 rounded-xl shadow-sm">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-primary">{resources?.length || 0}</div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Global Assets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: List */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-2xl min-h-[600px] rounded-3xl overflow-hidden bg-card">
              <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 px-8 border-b bg-muted/5">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-black tracking-tight">Repository</CardTitle>
                  <CardDescription className="font-medium">Active materials for students</CardDescription>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Find content..." 
                      className="pl-10 h-12 bg-muted/20 border-none rounded-xl focus-visible:ring-primary shadow-inner font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="all" className="w-full" onValueChange={setFilterType}>
                  <div className="px-8 bg-muted/5 border-b">
                    <TabsList className="bg-transparent h-14 p-0 gap-4 flex-wrap">
                      {['all', 'Study Material', 'Presentation', 'Assignment', 'Exercise', 'Project'].map(tab => (
                        <TabsTrigger 
                          key={tab} 
                          value={tab}
                          className="data-[state=active]:bg-transparent data-[state=active]:border-b-[3px] data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 h-full capitalize text-xs font-bold tracking-tight transition-all opacity-60 data-[state=active]:opacity-100"
                        >
                          {tab}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <TabsContent value={filterType} className="m-0 focus-visible:ring-0">
                    {loadingResources ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
                         {[1, 2, 4, 5].map(i => (
                           <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />
                         ))}
                      </div>
                    ) : (
                      <div className="p-8">
                        {filteredResources.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-40 text-center">
                            <div className="bg-muted p-6 rounded-full mb-6">
                              <FileIcon className="h-12 w-12 text-muted-foreground opacity-20" />
                            </div>
                            <h4 className="text-xl font-bold">No assets found</h4>
                            <p className="text-muted-foreground mt-2 font-medium">Try clearing filters or uploading new files.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredResources.map((resource: CourseResource) => (
                              <motion.div
                                key={resource.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                              >
                                <Card className="group relative overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 bg-white">
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      <div className="bg-slate-50 p-3 rounded-xl transform group-hover:-rotate-6 transition-transform">
                                        {getFileIcon(resource.resource_type)}
                                      </div>
                                      <div className="min-w-0 flex-1 space-y-1">
                                        <h4 className="text-base font-black text-slate-900 group-hover:text-primary transition-colors pr-8 leading-tight">
                                          {resource.asset_title}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black text-slate-400">
                                          <span className="px-2 py-0.5 bg-slate-100 rounded uppercase tracking-tighter text-slate-600">{resource.resource_type}</span>
                                          <span className="opacity-40">•</span>
                                          <span className="font-mono uppercase">{resource.upload_format}</span>
                                          <span className="opacity-40">•</span>
                                          <div className="flex items-center gap-1.5">
                                            {resource.instructor_avatar_url ? (
                                              <img src={resource.instructor_avatar_url} className="w-4 h-4 rounded-full object-cover border" alt="" />
                                            ) : (
                                              <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px]">{resource.instructor_name?.charAt(0)}</div>
                                            )}
                                            <span className="truncate max-w-[150px]">{resource.instructor_name}</span>
                                          </div>
                                        </div>
                                        <p className="text-[10px] text-slate-300 uppercase tracking-widest font-black mt-2">
                                          Published {new Date(resource.created_at || '').toLocaleDateString()}
                                        </p>
                                        {resource.allowed_batches && resource.allowed_batches.length > 0 && (
                                            <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 flex items-center gap-1 w-fit mt-2 text-[10px]">
                                                <Users className="h-3 w-3" /> {resource.allowed_batches.length} Batches
                                            </Badge>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-muted/20">
                                      <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        className="h-10 px-6 rounded-xl font-bold flex-1 bg-primary/10 text-primary hover:bg-primary/20"
                                        onClick={() => handleViewContent(resource)}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Content
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl"
                                        onClick={() => handleDelete(resource)}
                                      >
                                        <Trash2 className="h-5 w-5" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {/* ── Resource Viewer Dialog ── */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent
          className="max-w-5xl w-full h-[90vh] p-0 flex flex-col overflow-hidden rounded-2xl border-none shadow-2xl"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Header */}
          <DialogHeader className="flex flex-row items-center justify-between px-5 py-3 border-b bg-slate-900 shrink-0 space-y-0">
            <DialogTitle className="text-white font-bold text-base truncate max-w-[85%]">
              {viewerTitle}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl h-8 w-8 shrink-0"
              onClick={() => setViewerOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          {/* Viewer Body */}
          <div
            className="flex-1 overflow-y-auto relative bg-slate-100 select-none"
            style={{ userSelect: 'none' }}
          >
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-slate-500">Loading document…</p>
              </div>
            )}

            {viewerType === 'pdf' ? (
              <>
                {pdfPagesLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-slate-500">Loading pages…</p>
                  </div>
                )}
                {pdfPages && pdfPages.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <p className="text-sm font-medium">Could not load this document.</p>
                  </div>
                )}
                {pdfPages && pdfPages.length > 0 && (
                  <div className="flex flex-col items-center gap-3 py-4" onContextMenu={(e) => e.preventDefault()}>
                    {pdfPages.map((pageUrl, i) => (
                      <img
                        key={i}
                        src={pageUrl}
                        alt={`Page ${i + 1}`}
                        className="max-w-full shadow-md rounded-sm"
                        draggable={false}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : viewerType === 'zip' ? (
              <div className="p-6">
                {zipEntriesLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-slate-500">Reading archive contents…</p>
                  </div>
                )}
                {zipEntries && zipEntries.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <p className="text-sm font-medium">Could not read this archive.</p>
                  </div>
                )}
                {zipEntries && zipEntries.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                      {zipEntries.length} file{zipEntries.length !== 1 ? 's' : ''} in this archive
                    </div>
                    <div className="divide-y divide-slate-100 max-h-full">
                      {zipEntries.map((entry, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                          <FileIcon className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-700 truncate flex-1">{entry.name}</span>
                          <span className="text-xs text-slate-400 shrink-0">{formatBytes(entry.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : viewerType === 'image' ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <img
                  src={viewerUrl}
                  alt={viewerTitle}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                  onLoad={() => setIframeLoading(false)}
                  onError={() => setIframeLoading(false)}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
            ) : viewerType === 'video' ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <video
                  src={viewerUrl}
                  controls
                  controlsList="nodownload"
                  className="max-w-full max-h-full rounded-xl shadow-lg"
                  onLoadedData={() => setIframeLoading(false)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              /* Other file types — Google Docs Viewer fallback */
              <iframe
                key={viewerUrl}
                src={viewerUrl}
                className="w-full h-full border-none"
                title={viewerTitle}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onLoad={() => setIframeLoading(false)}
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-2 bg-slate-50 border-t text-[11px] text-slate-400 font-medium text-center shrink-0">
            View only — downloading is disabled.
          </div>
        </DialogContent>
      </Dialog>

      <MetadataDialog 
        open={metadataDialogOpen}
        onOpenChange={setMetadataDialogOpen}
        formData={resourceFormData}
        setFormData={setResourceFormData}
        onSave={handleSaveMetadata}
        fileName={pendingResource?.file.name}
        batches={batches}
      />
    </div>
  );
}

// Metadata Confirmation Dialog Component
function MetadataDialog({ 
    open, 
    onOpenChange, 
    formData, 
    setFormData, 
    onSave,
    fileName,
    batches
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void;
    formData: { title: string; description: string; resource_type: CourseResource['resource_type']; category?: string; allowed_batches: string[] };
    setFormData: React.Dispatch<React.SetStateAction<{ title: string; description: string; resource_type: CourseResource['resource_type']; category?: string; allowed_batches: string[] }>>;
    onSave: () => void;
    fileName?: string;
    batches: Batch[];
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl lg:rounded-[2.5rem] flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]">
                <div className="bg-slate-900 p-8 flex flex-col items-center justify-center text-center space-y-3 relative shrink-0">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Cloud className="h-32 w-32 text-white" />
                    </div>
                    <div className="bg-primary p-4 rounded-2xl shadow-xl relative z-10">
                        <Upload className="h-8 w-8 text-white" />
                    </div>
                    <div className="relative z-10">
                        <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Resource Blueprint</DialogTitle>
                        <DialogDescription className="font-bold text-slate-400 mt-1">
                            Finalizing metadata for <span className="text-primary">{fileName}</span>
                        </DialogDescription>
                    </div>
                </div>

                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="p-8 space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1 flex items-center gap-1">
                                    Asset Identity <span className="text-rose-500 font-black text-xs">*</span>
                                </Label>
                                <Input 
                                    id="title" 
                                    className="h-12 bg-slate-50 border-none rounded-xl focus-visible:ring-primary font-bold shadow-inner"
                                    value={formData.title} 
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type" className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1 flex items-center gap-1">
                                    Resource Taxonomy <span className="text-rose-500 font-black text-xs">*</span>
                                </Label>
                                <Select 
                                    value={formData.resource_type} 
                                    onValueChange={(v) => setFormData({...formData, resource_type: v as CourseResource['resource_type']})}
                                >
                                    <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl focus-visible:ring-primary font-bold shadow-inner uppercase text-[10px]">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl font-bold p-2">
                                        <SelectItem value="Study Material" className="rounded-xl">Study Material</SelectItem>
                                        <SelectItem value="Presentation" className="rounded-xl">Presentation (PPT)</SelectItem>
                                        <SelectItem value="Assignment" className="rounded-xl">Assignment</SelectItem>
                                        <SelectItem value="Exercise" className="rounded-xl">In-Class Exercise</SelectItem>
                                        <SelectItem value="Reading List" className="rounded-xl">Reading List</SelectItem>
                                        <SelectItem value="Project" className="rounded-xl">Project Assets</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category" className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1 flex items-center gap-1">
                                Knowledge Category <span className="text-rose-500 font-black text-xs">*</span>
                            </Label>
                            <Input 
                                id="category" 
                                className="h-12 bg-slate-50 border-none rounded-xl focus-visible:ring-primary font-bold shadow-inner"
                                placeholder="e.g. Core Java, UI/UX, Backend"
                                value={formData.category || ''} 
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="desc" className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1 flex items-center gap-1">
                                Resource Context <span className="text-rose-500 font-black text-xs">*</span>
                            </Label>
                            <Textarea 
                                id="desc" 
                                className="bg-slate-50 border-none rounded-xl focus-visible:ring-primary font-medium min-h-[100px] shadow-inner"
                                placeholder="What should students know about this?"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                required
                            />
                        </div>

                        {batches && batches.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1 flex items-center gap-1">
                                    <Users className="h-3 w-3" /> Target Batches <span className="text-rose-500 font-black text-xs">*</span>
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {batches.map((batch) => {
                                        const isSelected = formData.allowed_batches.includes(batch.id);
                                        return (
                                            <Badge
                                                key={batch.id}
                                                variant={isSelected ? "default" : "outline"}
                                                className={`cursor-pointer h-10 px-4 rounded-xl font-bold uppercase text-[9px] tracking-tight transition-all border-none ${
                                                    isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                }`}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setFormData({ ...formData, allowed_batches: formData.allowed_batches.filter(id => id !== batch.id) });
                                                    } else {
                                                        setFormData({ ...formData, allowed_batches: [...formData.allowed_batches, batch.id] });
                                                    }
                                                }}
                                            >
                                                {batch.batch_name}
                                            </Badge>
                                        );
                                    })}
                                </div>
                                <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3 border border-blue-100">
                                    <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                                        Only students in the selected batches will be able to view and download this resource. All other batches will be restricted.
                                    </p>
                                </div>
                                {formData.allowed_batches.length === 0 && (
                                    <div className="bg-amber-50 p-4 rounded-2xl flex items-start gap-3 border border-amber-100">
                                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                                            <span className="font-black">WARNING:</span> No batches selected. This resource will be available to <span className="font-black uppercase">EVERYONE</span> in the course.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-8 border-t bg-slate-50 gap-4 shrink-0">
                    <Button 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl font-black h-12 px-6 uppercase text-[10px] tracking-widest"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={onSave}
                        className="rounded-2xl pro-button-primary font-black h-12 px-10 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all uppercase text-[10px] tracking-widest"
                    >
                        Publish Asset
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Icons already imported or used local svg components if needed.