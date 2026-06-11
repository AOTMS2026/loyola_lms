import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  LayoutGrid,
  Shield,
  Zap,
  BarChart3,
  Clock,
  Pencil,
  DollarSign,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SyncDataButton } from "./data/SyncDataButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { fetchWithAuth } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type { Course as AdminCourse } from "@/hooks/useAdminData";

interface AllCoursesListProps {
  courses: AdminCourse[];
  loading: boolean;
  onView?: (course: AdminCourse) => void;
  onViewSyllabus?: (course: AdminCourse) => void;
  onUpdatePrice?: (id: string, price: string) => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
  onDelete?: (id: string) => void;
  onSync?: () => void;
}

const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'DS', 'AIML', 'IT', 'MECH'];

export function AllCoursesList({
  courses: allCourses,
  loading,
  onView,
  onViewSyllabus,
  onUpdatePrice,
  onToggleActive,
  onDelete,
  onSync,
}: AllCoursesListProps) {
  const [editingPrice, setEditingPrice] = useState<{
    id: string;
    title: string;
    price: string;
  } | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '', description: '', category: 'Engineering',
    department: '', price: '0', level: 'beginner',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<AdminCourse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreateCourse = async () => {
    if (!newCourse.title.trim()) return;
    setCreating(true);
    try {
      await fetchWithAuth('/admin/courses', {
        method: 'POST',
        body: JSON.stringify({
          title: newCourse.title,
          description: newCourse.description,
          category: newCourse.category,
          department: newCourse.department || null,
          price: parseFloat(newCourse.price) || 0,
          level: newCourse.level,
        }),
      });
      toast({ title: 'Course Created', description: `"${newCourse.title}" is now live.` });
      setShowCreate(false);
      setNewCourse({ title: '', description: '', category: 'Engineering', department: '', price: '0', level: 'beginner' });
      onSync?.();
    } catch (err: any) {
      toast({ title: 'Failed', description: err?.message || 'Could not create course', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await fetchWithAuth(`/admin/courses/${deleteConfirm.id}`, { method: 'DELETE' });
      toast({ title: 'Course Deleted', description: `"${deleteConfirm.title}" has been removed.` });
      setDeleteConfirm(null);
      onSync?.();
      onDelete?.(deleteConfirm.id);
    } catch (err: any) {
      toast({ title: 'Failed', description: err?.message || 'Could not delete course', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (editingPrice) {
      setNewPrice(editingPrice.price);
    }
  }, [editingPrice]);

  const handlePriceUpdate = async () => {
    if (editingPrice && onUpdatePrice) {
      onUpdatePrice(editingPrice.id, newPrice);
      setEditingPrice(null);
    }
  };

  const coursesList = allCourses || [];

  if (loading && coursesList.length === 0) {
    return (
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="rounded-3xl overflow-hidden bg-white shadow-sm border border-slate-100 h-[320px]"
          >
            <Skeleton className="h-48 w-full" />
            <div className="p-5 space-y-3">
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 italic uppercase">
            Curriculum Catalog
          </h2>
          <p className="text-slate-500 font-medium text-xs tracking-widest uppercase">
            Available Courses
          </p>
        </div>
        {onSync && (
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowCreate(true)}
              className="h-11 px-5 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest gap-2 shadow-lg shadow-primary/20"
            >
              <Plus className="h-4 w-4" /> New Course
            </Button>
            <SyncDataButton 
              onSync={onSync} 
              isLoading={loading} 
              className="h-11 px-6 shadow-xl shadow-slate-200/50"
            />
          </div>
        )}
      </div>

      {coursesList.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200"
        >
          <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
            <LayoutGrid className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">
            No courses found
          </h3>
          <p className="text-slate-500 max-w-sm text-center mt-2">
            Get started by creating a new course in the Instructor portal.
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {coursesList.map((course: AdminCourse, index: number) => {
            const CategoryIcon = course.title
              ?.toLowerCase()
              .includes("security")
              ? Shield
              : course.title?.toLowerCase().includes("ai")
                ? Zap
                : course.title?.toLowerCase().includes("data")
                  ? BarChart3
                  : course.title?.toLowerCase().includes("design")
                    ? LayoutGrid
                    : BookOpen;

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-white rounded-[2rem] border border-slate-100/50 shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col p-1.5 overflow-hidden"
              >
                {/* Premium Image Header */}
                <div className="aspect-video relative rounded-2xl overflow-hidden group-hover:shadow-lg transition-all">
                  {course.thumbnail_url ? (
                    <img
                      src={
                        course.thumbnail_url.startsWith("http")
                          ? course.thumbnail_url
                          : `/s3/public/${course.thumbnail_url}`
                      }
                      alt={course.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-300">
                      <BookOpen className="h-10 w-10 mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Course Preview
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:opacity-100 transition-opacity" />

                  {/* Floating Center Icon */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-50 group-hover:scale-100 shadow-2xl">
                    <CategoryIcon className="h-7 w-7 text-white" />
                  </div>

                  {/* Badges Overlay */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <Badge
                      className={`border-none font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded-lg ${course.status === "published" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white shadow-lg"}`}
                    >
                      {course.status || "Draft"}
                    </Badge>
                  </div>
                </div>

                {/* Content - Floating Icon Join */}
                <div className="relative pt-6 pb-5 px-5 flex-1 flex flex-col">
                  {/* Floating Brand Icon */}
                  <div className="absolute -top-6 right-6 h-12 w-12 rounded-full bg-white shadow-lg flex items-center justify-center border-4 border-slate-50 group-hover:scale-110 transition-transform duration-500">
                    <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center">
                      <CategoryIcon className="h-4 w-4 text-primary" />
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    <h3 className="text-xl font-bold text-slate-900 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-[10px] uppercase font-bold text-primary/60 tracking-[0.2em]">
                      {course.category || "Professional Training"}
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {course.duration !== "4 Months" && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold">
                          {course.duration || "3 Months"} • ONLINE / LIVE
                        </span>
                      </div>
                    )}
                  </div>



                  {/* Active/Deactive Toggle */}
                  <div className="flex items-center gap-4 mt-auto mb-4 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer group/active py-1">
                      <input 
                        type="radio" 
                        name={`status-${course.id}`}
                        checked={course.is_active !== false} 
                        onChange={() => onToggleActive?.(course.id, true)}
                        className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                      />
                      <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${course.is_active !== false ? 'text-emerald-600' : 'text-slate-400'}`}>Active</span>
                    </label>
                    <div className="w-px h-4 bg-slate-200" />
                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer group/deactive py-1">
                      <input 
                        type="radio" 
                        name={`status-${course.id}`}
                        checked={course.is_active === false} 
                        onChange={() => onToggleActive?.(course.id, false)}
                        className="w-3.5 h-3.5 accent-rose-500 cursor-pointer"
                      />
                      <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${course.is_active === false ? 'text-rose-600' : 'text-slate-400'}`}>Deactive</span>
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row xl:flex-row gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="w-full sm:flex-1 rounded-xl h-10 font-black text-[10px] uppercase tracking-wider border-slate-200 hover:bg-slate-50 truncate"
                      onClick={() => window.open("https://aotms.in", "_blank")}
                    >
                      Explore
                    </Button>
                    <Button
                      className="w-full sm:flex-1 rounded-xl h-10 font-black text-[10px] uppercase tracking-wider bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-100 truncate"
                      onClick={() => onViewSyllabus?.(course)}
                    >
                      Manage
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 w-10 rounded-xl border-rose-200 text-rose-500 hover:bg-rose-50 shrink-0 p-0"
                      onClick={() => setDeleteConfirm(course)}
                      title="Delete course"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── CREATE COURSE MODAL ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Create New Course</DialogTitle>
            <DialogDescription>Add a department course or a skill course open to all students.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Course Title *</Label>
              <Input placeholder="e.g. CSE Advanced Topics" value={newCourse.title} onChange={e => setNewCourse(p => ({ ...p, title: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Description</Label>
              <Input placeholder="Short description..." value={newCourse.description} onChange={e => setNewCourse(p => ({ ...p, description: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Department</Label>
                <select value={newCourse.department} onChange={e => setNewCourse(p => ({ ...p, department: e.target.value }))} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="">All Students (Skill)</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Category</Label>
                <select value={newCourse.category} onChange={e => setNewCourse(p => ({ ...p, category: e.target.value }))} className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm">
                  <option>Engineering</option>
                  <option>Skill Development</option>
                  <option>Data Science</option>
                  <option>AI/ML</option>
                  <option>IT</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              {newCourse.department ? `Only ${newCourse.department} students will see this course.` : 'All students can see this course (skill course).'}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button className="rounded-xl bg-primary font-black" onClick={handleCreateCourse} disabled={creating || !newCourse.title.trim()}>
              {creating ? 'Creating...' : 'Create Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM MODAL ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-rose-600">Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{deleteConfirm?.title}"</strong>? This will also remove all enrollments and batches for this course. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black" onClick={handleDeleteCourse} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}