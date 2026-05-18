import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Search, 
  BookOpen, 
  UserPlus, 
  UserCheck, 
  CheckCircle, 
  XCircle, 
  Loader2,
  GraduationCap,
  Mail,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Profile, CourseEnrollment } from '@/hooks/useAdminData';
import { SyncDataButton } from '@/components/admin/data/SyncDataButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Course {
  id: string;
  title: string;
  status: string;
  price?: number;
}

interface GrantStudentAccessProps {
    profiles?: Profile[];
    enrollments?: CourseEnrollment[];
    onSync?: () => void;
    loading?: boolean;
}

export function GrantStudentAccess({ 
  profiles: propProfiles = [], 
  enrollments: propEnrollments = [],
  onSync,
  loading = false
}: GrantStudentAccessProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [studentUuid, setStudentUuid] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Self-fetch profiles (with roles merged) when not provided by parent
  const { data: fetchedProfiles = [] } = useQuery({
    queryKey: ['grant-access-profiles'],
    queryFn: async () => {
      const [profilesData, rolesData] = await Promise.all([
        fetchWithAuth('/data/profiles?sort=created_at&order=desc&limit=500') as Promise<Profile[]>,
        fetchWithAuth('/data/user_roles?limit=500') as Promise<{ user_id: string; role: string }[]>
      ]);
      const rolesMap = rolesData.reduce((acc, r) => {
        acc[r.user_id] = r.role;
        return acc;
      }, {} as Record<string, string>);
      return profilesData.map(p => ({ ...p, role: rolesMap[p.id] || 'student' })) as Profile[];
    },
    enabled: propProfiles.length === 0,
  });

  // Self-fetch enrollments when not provided by parent
  const { data: fetchedEnrollments = [] } = useQuery({
    queryKey: ['grant-access-enrollments'],
    queryFn: async () => {
      const data = await fetchWithAuth('/courses/enrollments');
      return data as CourseEnrollment[];
    },
    enabled: propEnrollments.length === 0,
  });

  // Use props if parent provided them, otherwise use self-fetched data
  const profiles = propProfiles.length > 0 ? propProfiles : fetchedProfiles;
  const enrollments = propEnrollments.length > 0 ? propEnrollments : fetchedEnrollments;

  // Fetch approved courses
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['approved-courses'],
    queryFn: async () => {
      const data = await fetchWithAuth('/data/courses?status=in.(published,approved,active)&select=id,title,status,price');
      return data as Course[];
    }
  });

  // Filter profiles to show only students who haven't selected any course yet
  const filteredStudents = profiles.filter(profile => {
      const role = profile.role?.toLowerCase();
      const isAllowedRole = role === 'student'; // Strictly students only
      
      // Rule: Only show students who have NO enrollments at all
      const hasNoEnrollments = !enrollments.some(e => e.user_id === profile.id);
      
      const matchesSearch = (profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             profile.email?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return isAllowedRole && hasNoEnrollments && matchesSearch;
  });

  // Get available courses for selected student (exclude those already enrolled)
  const availableCourses = courses.filter(course => {
      if (!selectedStudent) return true;
      return !enrollments.some(e => 
          e.user_id === selectedStudent.id && 
          e.course_id === course.id && 
          e.status === 'active'
      );
  });

  // Grant access mutation
  const grantAccess = useMutation({
    mutationFn: async () => {
      if (!selectedCourse || !selectedStudent) return;
      
      return fetchWithAuth('/data/course_enrollments', {
        method: 'POST',
        body: JSON.stringify({
          user_id: selectedStudent.id,
          course_id: selectedCourse.id,
          status: 'active',
          progress_percentage: 0,
          final_price: selectedCourse.price || 0,
          payment_term: 'full'
        })
      });
    },
    onSuccess: () => {
      toast({ title: 'Access Granted', description: `Student has been enrolled in ${selectedCourse?.title}` });
      setStudentUuid('');
      setSelectedStudent(null);
      setSelectedCourse(null);
      setIsOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Failed to grant access', variant: 'destructive' });
    }
  });

  const handleCourseSelect = (courseId: string) => {
    const course = availableCourses.find(c => c.id === courseId);
    setSelectedCourse(course || null);
  };

  const handleStudentSelect = (student: Profile) => {
      setSelectedStudent(student);
      setStudentUuid(student.id);
  };

  return (
    <Card>
      <CardHeader className="pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Grant Student Access
            </CardTitle>
            <CardDescription className="max-w-md">
              Select a student from the list and manually enroll them in a course.
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button 
                className="gap-2 rounded-xl h-10 shadow-md"
                onClick={() => {
                   setSelectedStudent(null);
                   setSelectedCourse(null);
                   setSearchQuery('');
                }}
              >
                <Plus className="h-4 w-4" />
                Enroll Student
              </Button>
            </DialogTrigger>
            {onSync && (
              <SyncDataButton 
                onSync={onSync} 
                isLoading={loading} 
                className="h-10 px-4"
              />
            )}
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Enroll Student in Course
                </DialogTitle>
                <DialogDescription>
                  Search for a student and select a course to grant access.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase text-slate-500">Target Course</Label>
                  {coursesLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" /> 
                      <span className="text-sm">Loading available courses...</span>
                    </div>
                  ) : (
                    <Select value={selectedCourse?.id || ''} onValueChange={handleCourseSelect}>
                      <SelectTrigger className="h-12 rounded-xl bg-background border-slate-200">
                         <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Select a course..." />
                         </div>
                      </SelectTrigger>
                      <SelectContent>
                        {availableCourses.map(course => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Student Search & Selection */}
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  {!selectedStudent ? (
                      <div className="space-y-2">
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                  placeholder="Search students by name or email..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="pl-9"
                              />
                          </div>
                          <div className="border rounded-md max-h-48 overflow-y-auto bg-slate-50">
                              {filteredStudents.length === 0 ? (
                                  <div className="p-4 text-center text-sm text-muted-foreground">
                                      {searchQuery ? "No students found" : "Type to search students"}
                                  </div>
                              ) : (
                                  filteredStudents.map(student => (
                                      <div 
                                          key={student.id} 
                                          className="flex items-center gap-3 p-3 hover:bg-slate-100 cursor-pointer transition-colors border-b last:border-0"
                                          onClick={() => handleStudentSelect(student)}
                                      >
                                          <Avatar className="h-8 w-8">
                                              <AvatarImage src={student.avatar_url || ''} />
                                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                                  {student.full_name?.[0]?.toUpperCase() || 'S'}
                                              </AvatarFallback>
                                          </Avatar>
                                           <div className="overflow-hidden">
                                               <div className="flex items-center gap-2">
                                                   <p className="text-sm font-medium truncate">{student.full_name}</p>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={`text-[8px] h-3 px-1 rounded-sm uppercase tracking-tighter ${
                                                            student.role === 'instructor' 
                                                            ? "border-amber-200 bg-amber-50 text-amber-700" 
                                                            : "border-blue-200 bg-blue-50 text-blue-700"
                                                        }`}
                                                    >
                                                        {student.role || 'student'}
                                                    </Badge>
                                               </div>
                                               <p className="text-xs text-slate-900 truncate">{student.email}</p>
                                           </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  ) : (
                      <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4 relative overflow-hidden">
                        {/* Decorative background pulse */}
                        <div className="absolute -top-12 -right-12 h-32 w-32 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                        
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                               <UserCheck className="h-3 w-3" /> Selected Candidate
                            </span>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-full bg-white hover:bg-destructive hover:text-white shadow-sm transition-all"
                                onClick={() => setSelectedStudent(null)}
                            >
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-4 relative">
                          <div className="relative">
                            <Avatar className="h-14 w-14 border-2 border-white shadow-md">
                                <AvatarImage src={selectedStudent.avatar_url || ''} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                                {selectedStudent.full_name?.[0]?.toUpperCase() || 'S'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                               <CheckCircle className="h-5 w-5 text-emerald-500" />
                            </div>
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="font-black text-slate-900 truncate leading-none mb-1">{selectedStudent.full_name}</p>
                            <p className="text-xs text-slate-900 flex items-center gap-1 mb-2 truncate">
                              <Mail className="h-3 w-3" />
                              {selectedStudent.email}
                            </p>
                            <Badge className="bg-primary text-white border-none text-[9px] h-4.5 px-2 uppercase font-black tracking-tighter">
                                {selectedStudent.role || 'STUDENT'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl h-11">Cancel</Button>
                <Button
                  onClick={() => grantAccess.mutate()}
                  disabled={!selectedCourse || !selectedStudent || grantAccess.isPending}
                  className="rounded-xl h-11 px-8 shadow-lg shadow-primary/20"
                >
                  {grantAccess.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enrolling...</>
                  ) : (
                    <>Grant Access</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      {/* List of Recently Granted Access or a general placeholder list can go here if needed, 
          but for now, the modal handles the action. We can show a simple instruction list. */}
      <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                 {filteredStudents.map(student => (
                     <div key={student.id} className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary/30 hover:shadow-md transition-all group overflow-hidden relative">
                         <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
                             <Avatar className="h-12 w-12 border-2 border-slate-50 shrink-0">
                                  <AvatarImage src={student.avatar_url} />
                                  <AvatarFallback className="bg-primary/5 text-primary font-bold">{student.full_name?.[0]}</AvatarFallback>
                             </Avatar>
                             <div className="flex-1 overflow-hidden">
                                 <div className="flex items-center gap-2 mb-1">
                                     <p className="text-sm font-black text-slate-900 leading-none truncate">{student.full_name}</p>
                                     <Badge 
                                        variant="outline" 
                                        className="text-[9px] h-4 px-1.5 rounded-md uppercase font-black tracking-tighter bg-blue-50 text-blue-600 border-blue-100"
                                    >
                                        Student
                                     </Badge>
                                 </div>
                                 <p className="text-xs text-slate-900 truncate">{student.email}</p>
                             </div>
                         </div>
                         <Button 
                            variant="secondary" 
                            size="sm" 
                            className="w-full sm:w-auto sm:ml-auto h-9 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl shadow-none transition-all font-bold"
                            onClick={() => {
                                setSelectedStudent(student);
                                setSelectedCourse(null);
                                setIsOpen(true);
                            }}
                         >
                            <Plus className="h-3.5 w-3.5 mr-1.5 sm:hidden lg:block shrink-0" />
                            Enroll
                            <ArrowRight className="h-3.5 w-3.5 ml-1.5 hidden sm:block shrink-0 transition-transform group-hover:translate-x-1" />
                         </Button>
                     </div>
                 ))}
            </div>
            {filteredStudents.length === 0 && searchQuery && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                    <Search className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>No students match "{searchQuery}"</p>
                </div>
            )}
            {filteredStudents.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-3xl bg-slate-50/50">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <h3 className="font-bold text-slate-800 text-lg">No Students Awaiting Access</h3>
                    <p className="text-sm max-w-xs mx-auto mt-2">
                        Currently, all registered students have already selected a course or were manually enrolled. 
                        They will appear here once new students register.
                    </p>
                </div>
            )}
          </div>
      </CardContent>
    </Card>
  );
}
