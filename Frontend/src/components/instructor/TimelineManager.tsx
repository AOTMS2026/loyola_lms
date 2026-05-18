import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  useTimeline,
  useCreateTimeline,
  useDeleteTimeline,
} from "@/hooks/useInstructorData";
import {
  Plus,
  Calendar,
  Trash2,
  Flag,
  BookOpen,
  ClipboardCheck,
  Video,
  GraduationCap,
  Users
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface TimelineManagerProps {
  courseId: string;
}

interface Batch {
  id: string;
  batch_name: string;
}

const milestoneTypes = [
  {
    value: "start",
    label: "Course Start",
    icon: Flag,
    color: "text-green-500",
  },
  {
    value: "module",
    label: "Module/Week",
    icon: BookOpen,
    color: "text-primary",
  },
  {
    value: "assignment",
    label: "Assignment Due",
    icon: ClipboardCheck,
    color: "text-accent",
  },
  { value: "exam", label: "Exam", icon: GraduationCap, color: "text-red-500" },
  {
    value: "live_class",
    label: "Live Class",
    icon: Video,
    color: "text-purple-500",
  },
  { value: "end", label: "Course End", icon: Flag, color: "text-green-500" },
];

export function TimelineManager({ courseId }: TimelineManagerProps) {
  const { data: timeline = [], isLoading } = useTimeline(courseId);
  const createTimeline = useCreateTimeline();
  const deleteTimeline = useDeleteTimeline();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: "",
    description: "",
    milestone_type: "module",
    scheduled_date: "",
    allowed_batches: [] as string[]
  });

  const [batches, setBatches] = useState<Batch[]>([]);
  
  useEffect(() => {
    const loadBatches = async () => {
      try {
        const data = await fetchWithAuth(`/batches?course_id=${courseId}`) as Batch[];
        setBatches(data || []);
      } catch (e) {
        console.error("Failed to load batches", e);
      }
    };
    if (courseId) loadBatches();
  }, [courseId]);

  const handleCreate = async () => {
    if (!newMilestone.title.trim() || !newMilestone.scheduled_date) return;
    await createTimeline.mutateAsync({
      course_id: courseId,
      title: newMilestone.title,
      description: newMilestone.description || null,
      milestone_type: newMilestone.milestone_type,
      scheduled_date: (() => {
        if (!newMilestone.scheduled_date) return new Date().toISOString();
        const parts = newMilestone.scheduled_date.split('T');
        if (parts.length < 2) return new Date(newMilestone.scheduled_date).toISOString();
        const [datePart, timePart] = parts;
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes).toISOString();
      })(),
      allowed_batches: newMilestone.allowed_batches
    });
    setNewMilestone({
      title: "",
      description: "",
      milestone_type: "module",
      scheduled_date: "",
      allowed_batches: []
    });
    setIsAddOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteTimeline.mutateAsync({ id, courseId });
  };

  const getMilestoneInfo = (type: string) => {
    return milestoneTypes.find((m) => m.value === type) || milestoneTypes[1];
  };

  const isPast = (date: string) => new Date(date) < new Date();
  const isToday = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        Loading timeline...
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              Course Timeline
            </CardTitle>
            <CardDescription>Set milestones and deadlines</CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Milestone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Timeline Milestone</DialogTitle>
                <DialogDescription>
                  Set a deadline or important date
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Milestone Type</Label>
                  <Select
                    value={newMilestone.milestone_type}
                    onValueChange={(value) =>
                      setNewMilestone({
                        ...newMilestone,
                        milestone_type: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {milestoneTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className={`h-4 w-4 ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="milestone-title">Title</Label>
                  <Input
                    id="milestone-title"
                    placeholder="e.g., Week 3: React Hooks"
                    value={newMilestone.title}
                    onChange={(e) =>
                      setNewMilestone({
                        ...newMilestone,
                        title: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="milestone-date">Date & Time</Label>
                  <Input
                    id="milestone-date"
                    type="datetime-local"
                    value={newMilestone.scheduled_date}
                    onChange={(e) =>
                      setNewMilestone({
                        ...newMilestone,
                        scheduled_date: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="milestone-description">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="milestone-description"
                    placeholder="Additional details..."
                    value={newMilestone.description}
                    onChange={(e) =>
                      setNewMilestone({
                        ...newMilestone,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Batch Selection */}
                {batches.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Target Batches (Optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {batches.map((batch) => {
                        const isSelected = newMilestone.allowed_batches.includes(batch.id);
                        return (
                          <Badge
                            key={batch.id}
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer h-9 px-3 rounded-lg font-bold text-[10px] uppercase transition-all ${
                              isSelected ? 'bg-primary text-white' : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                setNewMilestone({ ...newMilestone, allowed_batches: newMilestone.allowed_batches.filter(id => id !== batch.id) });
                              } else {
                                setNewMilestone({ ...newMilestone, allowed_batches: [...newMilestone.allowed_batches, batch.id] });
                              }
                            }}
                          >
                            {batch.batch_name}
                          </Badge>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">No batches selected = visible to all students.</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createTimeline.isPending}
                >
                  {createTimeline.isPending ? "Adding..." : "Add Milestone"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No timeline set yet.</p>
            <p className="text-sm">
              Add milestones to create your course schedule.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-4">
              {timeline.map((item, idx) => {
                const info = getMilestoneInfo(item.milestone_type);
                const Icon = info.icon;
                const past = isPast(item.scheduled_date);
                const today = isToday(item.scheduled_date);

                return (
                  <div
                    key={item.id}
                    className={`relative flex items-start gap-4 pl-12 ${past && !today ? "opacity-60" : ""}`}
                  >
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        today
                          ? "bg-primary border-primary"
                          : past
                            ? "bg-muted border-muted-foreground"
                            : "bg-background border-primary"
                      }`}
                    >
                      {past && !today && (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                      )}
                      {today && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>

                    <div
                      className={`flex-1 p-4 rounded-lg border ${
                        today ? "border-primary bg-primary/5" : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-5 w-5 ${info.color}`} />
                          <div>
                            <h4 className="font-medium">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {format(
                                new Date(item.scheduled_date),
                                "MMM d, yyyy • h:mm a",
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {today && <Badge className="bg-primary">Today</Badge>}
                          {item.allowed_batches && item.allowed_batches.length > 0 && (
                                <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 flex items-center gap-1">
                                    <Users className="h-3 w-3" /> {item.allowed_batches.length} Batches
                                </Badge>
                            )}
                          <Badge variant="outline">{info.label}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                            disabled={deleteTimeline.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
