import { useState } from 'react';
import { useEnrolledCourses, useStudentResources, StudentCourse } from '@/hooks/useStudentData';
import { CourseResource } from '@/hooks/useInstructorData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    FileText, 
    Search, 
    File as FileIcon, 
    Video, 
    Music, 
    Image, 
    Loader2, 
    Eye,
    BookOpen,
    Presentation,
    RefreshCw,
    Cloud,
    X,
    Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWithAuth } from '@/lib/api';

export default function StudentResources() {
    const { data: enrolledCourses, isLoading: isLoadingCourses } = useEnrolledCourses();
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [viewedResources, setViewedResources] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('viewed_resources');
        return new Set(saved ? JSON.parse(saved) : []);
    });

    // Viewer dialog state
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState('');
    const [viewerTitle, setViewerTitle] = useState('');
    const [viewerType, setViewerType] = useState<'pdf' | 'image' | 'video' | 'zip' | 'office' | 'other'>('other');
    const [iframeLoading, setIframeLoading] = useState(false);
    const [pdfPages, setPdfPages] = useState<string[] | null>(null);
    const [pdfPagesLoading, setPdfPagesLoading] = useState(false);
    const [zipEntries, setZipEntries] = useState<{ name: string; size: number }[] | null>(null);
    const [zipEntriesLoading, setZipEntriesLoading] = useState(false);

    const { data: resources, isLoading: isLoadingResources, refetch } = useStudentResources(selectedCourseId === 'all' ? null : selectedCourseId);

    const filteredResources = (resources as CourseResource[] | undefined)?.filter((resource: CourseResource) => {
        const matchesSearch = resource.asset_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              resource.resource_type.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (activeTab === 'all') return matchesSearch;
        return matchesSearch && resource.resource_type === activeTab;
    });

    const getIcon = (type: string) => {
        const lowerType = type.toLowerCase();
        if (lowerType === 'study material' || lowerType.includes('pdf')) return <FileText className="h-6 w-6 text-rose-500" />;
        if (lowerType === 'presentation' || lowerType.includes('ppt')) return <Presentation className="h-6 w-6 text-amber-500" />;
        if (lowerType === 'assignment') return <BookOpen className="h-6 w-6 text-indigo-500" />;
        if (lowerType.includes('video') || lowerType.includes('mp4')) return <Video className="h-6 w-6 text-blue-500" />;
        if (lowerType.includes('image')) return <Image className="h-6 w-6 text-purple-500" />;
        if (lowerType === 'project' || lowerType.includes('zip')) return <Cloud className="h-6 w-6 text-cyan-500" />;
        return <FileIcon className="h-6 w-6 text-slate-500" />;
    };

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

    // Build a viewer URL that works for ALL PDF types (image-based, text, raw)
    // Google Docs viewer is the most universal approach
    const getPdfViewerUrl = (fileUrl: string): string => {
        const encoded = encodeURIComponent(fileUrl);
        return `https://docs.google.com/viewer?url=${encoded}&embedded=true`;
    };

    const handleView = async (resource: CourseResource) => {
        const url = resource.file_url;
        const type = getFileType(url, resource.upload_format);
        console.log('[StudentResources] handleView →', { url, uploadFormat: resource.upload_format, detectedType: type });

        // Mark as viewed
        const newViewed = new Set(viewedResources);
        newViewed.add(resource.id);
        setViewedResources(newViewed);
        localStorage.setItem('viewed_resources', JSON.stringify(Array.from(newViewed)));

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
        } else if (type === 'image') {
            setViewerUrl(url);
        } else if (type === 'video') {
            setViewerUrl(url);
        } else if (type === 'office') {
            // Office Online Viewer — the properly supported option for ppt/doc/xls, unlike
            // Google's ad-hoc viewer which frequently fails on URLs it hasn't seen before
            const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
            console.log('[StudentResources] Using Office Online Viewer:', officeViewerUrl);
            setViewerUrl(officeViewerUrl);
        } else {
            // For other files open Google Docs viewer as fallback
            setViewerUrl(getPdfViewerUrl(url));
        }

        setViewerOpen(true);
    };

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Learning Resources</h1>
                    <p className="text-slate-600 font-medium mt-1">
                        Access course materials, assignments, and reference documents.
                    </p>
                </div>
                {selectedCourseId && (
                     <Button variant="outline" size="sm" onClick={() => refetch()} className="self-start md:self-auto gap-2">
                        <RefreshCw className={`h-4 w-4 ${isLoadingResources ? 'animate-spin' : ''}`} />
                        Refresh
                     </Button>
                )}
            </div>

            {/* Controls Section */}
            <Card className="border-none shadow-md bg-white overflow-hidden">
                <div className="p-1 bg-slate-50 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row gap-4 p-4">
                        <div className="w-full md:w-1/3">
                            <Select value={selectedCourseId || ''} onValueChange={setSelectedCourseId}>
                                <SelectTrigger className="h-11 bg-white border-slate-200 shadow-sm rounded-xl font-medium">
                                    <SelectValue placeholder="Select a course..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-xl border-slate-100">
                                    <SelectItem value="all" className="font-bold cursor-pointer py-3 text-primary">
                                        All Courses (Aggregate)
                                    </SelectItem>
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
                            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                type="search"
                                placeholder="Search by filename or type..."
                                className="pl-10 h-11 bg-white border-slate-200 shadow-sm rounded-xl font-medium focus-visible:ring-primary"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                
                <div className="px-5 bg-white border-b border-slate-50">
                    <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="bg-transparent h-12 p-0 gap-6 w-full justify-start overflow-x-auto no-scrollbar">
                            {['all', 'Study Material', 'Presentation', 'Assignment', 'Project'].map(tab => (
                                <TabsTrigger 
                                    key={tab} 
                                    value={tab}
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-1 h-full capitalize text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"
                                >
                                    {tab === 'all' ? 'All Resources' : tab}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
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
                            Choose one of your enrolled courses from the dropdown to access its resource library.
                        </p>
                    </div>
                ) : isLoadingResources ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : !filteredResources || filteredResources.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                        <div className="h-20 w-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                             <Search className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">No resources found</h3>
                        <p className="text-slate-500 max-w-sm mt-2 font-medium">
                            {searchQuery ? "Try adjusting your search terms." : "The instructor hasn't uploaded any materials for this category yet."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode='popLayout'>
                            {filteredResources.map((resource: CourseResource, idx) => (
                                <motion.div
                                    key={resource.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                                >
                                    <Card className="group h-full flex flex-col border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden bg-white">
                                        <CardHeader className="p-5 pb-0 flex flex-row items-start justify-between space-y-0">
                                            <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                                                {getIcon(resource.resource_type)}
                                            </div>
                                            <Badge variant="secondary" className="font-bold text-[10px] tracking-wider uppercase bg-slate-100 text-slate-600">
                                                {resource.upload_format || 'FILE'}
                                            </Badge>
                                        </CardHeader>
                                        
                                        <CardContent className="p-5 flex-1 space-y-3">
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-1 mb-1 group-hover:text-primary transition-colors" title={resource.asset_title}>
                                                    {resource.asset_title}
                                                </h3>
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                                    <span>{resource.resource_type} {resource.category && `• ${resource.category}`}</span>
                                                    <span>•</span>
                                                    <span>{new Date(resource.created_at || '').toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                                                {resource.short_description || "No description provided."}
                                            </p>
                                        </CardContent>

                                        <CardFooter className="p-5 pt-0 mt-auto">
                                            <Button 
                                                className="w-full rounded-xl font-bold bg-slate-900 shadow-lg shadow-slate-200 hover:scale-[1.02] transition-all gap-2"
                                                onClick={() => handleView(resource)}
                                            >
                                                <Eye className="h-4 w-4" />
                                                View
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Viewer Dialog */}
            <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
                <DialogContent
                    className="max-w-5xl w-full h-[90vh] p-0 flex flex-col overflow-hidden rounded-2xl border-none shadow-2xl"
                    // Prevent right-click context menu to block save-as on images/video
                    onContextMenu={(e) => e.preventDefault()}
                >
                    {/* Header */}
                    <DialogHeader className="flex flex-row items-center justify-between px-5 py-3 border-b bg-slate-900 shrink-0">
                        <DialogTitle className="text-white font-bold text-base truncate max-w-[80%]">
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

                    {/* Viewer Content */}
                    <div className="flex-1 overflow-y-auto relative bg-slate-100 select-none" style={{ userSelect: 'none' }}>
                        {iframeLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm font-medium text-slate-500">Loading document...</p>
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
                                        <div className="divide-y divide-slate-100">
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

                    {/* Footer note */}
                    <div className="px-5 py-2 bg-slate-50 border-t text-[11px] text-slate-400 font-medium text-center shrink-0">
                        This resource is for viewing only. Downloading is not permitted.
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}