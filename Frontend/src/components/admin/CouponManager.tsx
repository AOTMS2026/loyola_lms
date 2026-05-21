import React, { useState, useEffect } from "react";
import {
  Ticket,
  Search,
  Gift,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  Zap,
  Star,
  Plus,
  Calendar as CalendarIcon,
  School,
  Building2,
  Clock,
  Filter,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchWithAuth } from "@/lib/api";
import { toast } from "sonner";
import { SyncDataButton } from "./data/SyncDataButton";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isSameDay, parseISO } from "date-fns";

interface Student {
  id: string;
  full_name: string;
  email: string;
  mobile_number?: string;
  avatar_url?: string;
  college_name?: string;
  institute_name?: string;
  last_login_at?: string;
  registration_date?: string;
  registration_time?: string;
  role: string;
}

interface CouponResponse {
  success: boolean;
  code: string;
}

interface Coupon {
  id: string;
  code: string;
  user_id: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  } | null;
  discounted_price: number;
  is_used: boolean;
  created_at: string;
}

interface CouponManagerProps {
  onSync?: () => void;
  loading?: boolean;
}

export function CouponManager({ onSync, loading: parentLoading = false }: CouponManagerProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "college" | "institute">("all");
  const [filterValue, setFilterValue] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedBulkUserIds, setSelectedBulkUserIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState("");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  
  // New State for Enhanced Filtering & College Management
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [registeredColleges, setRegisteredColleges] = useState<{id: string, name: string}[]>([]);
  const [isAddingCollege, setIsAddingCollege] = useState(false);
  const [newCollegeName, setNewCollegeName] = useState("");
  const [isSavingCollege, setIsSavingCollege] = useState(false);

  useEffect(() => {
    refreshAllData();
  }, []);

  const refreshAllData = async (showToast = false) => {
    setLoading(true);
    await Promise.all([
      fetchStudents(),
      fetchCoupons(),
      fetchColleges()
    ]);
    setLoading(false);
    if (showToast) toast.success("Reward data synchronized");
  };

  const fetchColleges = async () => {
    try {
      const data = await fetchWithAuth<{id: string, name: string}[]>("/data/colleges");
      setRegisteredColleges(data || []);
    } catch (err) {
      console.error("Failed to fetch colleges:", err);
    }
  };

  const handleAddCollege = async () => {
    if (!newCollegeName.trim()) return;
    setIsSavingCollege(true);
    try {
      await fetchWithAuth("/data/colleges", {
        method: "POST",
        body: JSON.stringify({ name: newCollegeName.trim() })
      });
      toast.success("College added successfully");
      setNewCollegeName("");
      setIsAddingCollege(false);
      fetchColleges();
    } catch (err) {
      toast.error("Failed to add college");
    } finally {
      setIsSavingCollege(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const data = await fetchWithAuth<Coupon[]>("/data/coupons?sort=created_at&order=desc&limit=50");
      setCoupons(data || []);
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
    }
  };

  const fetchStudents = async () => {
    try {
      const studentUsers = await fetchWithAuth<Student[]>("/admin/students");
      setStudents(studentUsers || []);
    } catch (err) {
      console.error("Failed to fetch students:", err);
      toast.error("Failed to load student list");
    } finally {
      // Handled by refreshAllData
    }
  };

  const generateCoupon = async () => {
    if (!selectedStudent) {
      toast.error("Please select a student first");
      return;
    }

    if (!discountAmount || isNaN(Number(discountAmount))) {
      toast.error("Please enter a valid discounted price");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetchWithAuth<CouponResponse>(
        "/admin/coupons/generate",
        {
          method: "POST",
          body: JSON.stringify({
            userId: selectedStudent.id,
            amount: Number(discountAmount),
          }),
        },
      );

      if (response && response.success) {
        setGeneratedCode(response.code);
        toast.success(
          `Coupon ${response.code} (₹${discountAmount}) assigned to ${selectedStudent.full_name}`,
        );
        fetchCoupons();
        setTimeout(() => {
          setGeneratedCode(null);
          setSelectedStudent(null);
          setDiscountAmount("");
        }, 8000);
      }
    } catch (err) {
      console.error("Failed to generate coupon:", err);
      toast.error("Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const bulkGenerateCoupons = async () => {
    if (selectedBulkUserIds.length === 0) {
      toast.error("No students selected for reward");
      return;
    }

    if (!discountAmount || isNaN(Number(discountAmount))) {
      toast.error("Please enter a valid discounted price");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetchWithAuth<CouponResponse>(
        "/admin/coupons/bulk-generate",
        {
          method: "POST",
          body: JSON.stringify({
            userIds: selectedBulkUserIds,
            amount: Number(discountAmount),
          }),
        },
      );

      if (response && response.success) {
        setGeneratedCode(response.code);
        toast.success(
          `Bulk Success! Coupon ${response.code} generated for ${selectedBulkUserIds.length} students`,
        );
        fetchCoupons();
        setFilterType("all");
        setFilterValue("");
        setSelectedBulkUserIds([]);
        setTimeout(() => {
          setGeneratedCode(null);
          setDiscountAmount("");
        }, 8000);
      }
    } catch (err) {
      toast.error("Bulk generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedBulkUserIds.length === filteredStudents.length) {
      setSelectedBulkUserIds([]);
    } else {
      setSelectedBulkUserIds(filteredStudents.map(s => s.id));
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedBulkUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch = 
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 1. Date Filter (Check registration_date)
    if (selectedDate) {
      if (!s.registration_date) return false;
      try {
        // registration_date is DD/MM/YYYY
        const [day, month, year] = s.registration_date.split('/').map(Number);
        const regDate = new Date(year, month - 1, day);
        if (!isSameDay(regDate, selectedDate)) return false;
      } catch { return false; }
    }

    if (filterType === "all") return matchesSearch;

    const getCollegeName = (val: string | { name?: string; title?: string } | null | undefined) => {
      if (typeof val === 'object' && val !== null) return val.name || val.title;
      return val;
    };

    if (filterType === "college") {
      return matchesSearch && getCollegeName(s.college_name) === filterValue;
    }
    if (filterType === "institute") {
      return matchesSearch && getCollegeName(s.institute_name) === filterValue;
    }
    return matchesSearch;
  });


  const uniqueColleges = Array.from(new Set([
    ...students.map(s => {
      // Handle potential object structure for college if it exists
      if (typeof s.college_name === 'object' && s.college_name !== null) {
        const c = s.college_name as { name?: string; title?: string };
        return c.name || c.title;
      }
      return s.college_name;
    }),
    ...registeredColleges.map(c => c.name)
  ].filter(Boolean))).sort() as string[];

  const uniqueInstitutes = Array.from(new Set(
    students.map(s => {
      if (typeof s.institute_name === 'object' && s.institute_name !== null) {
        const i = s.institute_name as { name?: string; title?: string };
        return i.name || i.title;
      }
      return s.institute_name;
    }).filter(Boolean)
  )).sort() as string[];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
                 <Ticket className="h-7 w-7 text-primary" />
            </div>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none mb-1">
                    Coupon Rewards Engine
                </h1>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest opacity-60">
                    Assign dynamic discount codes for student achievement
                </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] border border-slate-200 shadow-sm">
            <SyncDataButton 
              onSync={onSync || (() => refreshAllData(true))}
              isLoading={parentLoading || loading}
              className="h-10 px-6 border-none bg-slate-50 hover:bg-slate-100"
            />
            <div className="flex -space-x-3 px-2">
                {students.slice(0, 5).map((s, i) => (
                    <Avatar key={i} className="h-9 w-9 border-2 border-white ring-1 ring-slate-100 cursor-default">
                        <AvatarImage src={s.avatar_url || ""} />
                        <AvatarFallback className="bg-slate-50 text-[10px] font-black">{s.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                ))}
            </div>
            <div className="h-5 w-px bg-slate-200 mx-1" />
            <Badge variant="secondary" className="px-3 py-1 bg-primary/5 text-primary border-none font-bold">
                {students.length} Active Students
            </Badge>
            <SyncDataButton 
                onSync={() => refreshAllData(true)} 
                isLoading={loading} 
                className="h-10 px-4"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-none shadow-2xl shadow-slate-200/50 overflow-hidden rounded-[2.5rem] bg-white/80 backdrop-blur-md min-h-[600px] flex flex-col">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100/50 p-8">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-amber-500" />
                                Target Matrix
                            </CardTitle>
                            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
                                Filter students by College or Institute for bulk rewards
                            </CardDescription>
                        </div>
                        
                        <div className="relative w-full sm:w-[320px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search Student Repository..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 pr-11 h-12 bg-white border-slate-200 rounded-[1.2rem] font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-primary transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* Row 1: Filter controls - always single line */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Filter Type Dropdown */}
                            <div className="flex-shrink-0 flex items-center gap-2 bg-white pl-3 pr-2 py-2 rounded-2xl border border-slate-200 shadow-sm min-w-0">
                                <Filter className="h-3.5 w-3.5 text-slate-400" />
                                <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
                                <select 
                                    value={filterType}
                                    onChange={(e) => {
                                        setFilterType(e.target.value as "all" | "college" | "institute");
                                        setFilterValue("");
                                        setSelectedStudent(null);
                                        setSelectedBulkUserIds([]);
                                    }}
                                    className="bg-transparent border-none text-[11px] font-black text-slate-700 focus:ring-0 outline-none uppercase tracking-wider cursor-pointer pr-1 whitespace-nowrap"
                                >
                                    <option value="all">All Students</option>
                                    <option value="college">College Wise</option>
                                    <option value="institute">Institute Wise</option>
                                </select>
                            </div>

                            {/* College / Institute Dropdown */}
                            {filterType !== "all" && (
                                <div className="flex-1 flex items-center gap-2 bg-white pl-3 pr-2 py-2 rounded-2xl border border-primary/30 shadow-sm animate-in slide-in-from-right-4 min-w-[200px]">
                                    {filterType === 'college' ? <School className="h-3.5 w-3.5 text-primary" /> : <Building2 className="h-3.5 w-3.5 text-primary" />}
                                    <div className="w-px h-4 bg-primary/20 flex-shrink-0" />
                                    <select 
                                        value={filterValue}
                                        onChange={(e) => {
                                            setFilterValue(e.target.value);
                                            setSelectedStudent(null);
                                            if (e.target.value) {
                                                const getVal = (v: string | { name?: string; title?: string } | null | undefined) => (typeof v === 'object' && v !== null) ? (v.name || v.title) : v;
                                                const newFiltered = students.filter(s => 
                                                    filterType === 'college' ? getVal(s.college_name) === e.target.value : getVal(s.institute_name) === e.target.value
                                                );
                                                setSelectedBulkUserIds(newFiltered.map(s => s.id));
                                            } else {
                                                setSelectedBulkUserIds([]);
                                            }
                                        }}
                                        className="flex-1 bg-transparent border-none text-[11px] font-black text-slate-900 focus:ring-0 outline-none tracking-tight cursor-pointer truncate"
                                    >
                                        <option value="">{filterType === "college" ? "— Choose College —" : "— Choose Institute —"}</option>
                                        {(filterType === "college" ? uniqueColleges : uniqueInstitutes).map(val => (
                                            <option key={val} value={val}>{val}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Calendar Filter */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={`h-11 px-4 rounded-2xl border-slate-200 bg-white text-[11px] font-black uppercase tracking-widest gap-2 shadow-sm ${selectedDate ? 'border-primary text-primary bg-primary/5' : 'text-slate-500'}`}
                                    >
                                        <CalendarIcon className="h-3.5 w-3.5" />
                                        {selectedDate ? format(selectedDate, "PPP") : "Filter Date"}
                                        {selectedDate && (
                                            <X 
                                                className="h-3 w-3 ml-2 hover:text-rose-500 transition-colors" 
                                                onClick={(e) => { e.stopPropagation(); setSelectedDate(undefined); }} 
                                            />
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-[2rem] border-slate-100 shadow-2xl" align="end">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        className="p-4"
                                    />
                                </PopoverContent>
                            </Popover>

                            {(searchQuery || selectedDate || filterValue) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setSelectedDate(undefined);
                                        setFilterType("all");
                                        setFilterValue("");
                                        setSelectedBulkUserIds([]);
                                    }}
                                    className="h-11 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 hover:text-rose-600 gap-2"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Clear All
                                </Button>
                            )}
                        </div>

                        {/* Row 2: Selection counter bar */}
                        {filterValue && filteredStudents.length > 0 && (
                            <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-2xl border border-dashed border-slate-200 animate-in fade-in zoom-in-95 duration-500">
                                <div className="flex items-center gap-2.5">
                                    <div className={`h-5 w-5 rounded-md flex items-center justify-center transition-colors ${selectedBulkUserIds.length === filteredStudents.length ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                                        <CheckCircle2 className={`h-3 w-3 ${selectedBulkUserIds.length === filteredStudents.length ? 'text-white' : 'text-slate-400'}`} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        {selectedBulkUserIds.length} / {filteredStudents.length} Selected
                                    </p>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={toggleSelectAll}
                                    className="h-7 px-3 rounded-xl text-[9px] font-black uppercase tracking-tight hover:bg-slate-200 text-slate-600"
                                >
                                    {selectedBulkUserIds.length === filteredStudents.length ? "Deselect All" : "Select All"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 flex-1 overflow-hidden">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="h-24 rounded-2xl bg-slate-50 animate-pulse border border-slate-100" />
                            ))}
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4">
                            <div className="h-20 w-20 rounded-[2rem] bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                                <Search className="h-10 w-10 text-slate-200" />
                            </div>
                            <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No candidates found in this scope</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[600px] pr-1 custom-scrollbar">
                            {filteredStudents.map((student) => (
                                <motion.div
                                    key={student.id}
                                    layout
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`group flex items-start gap-3 p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative ${
                                        selectedStudent?.id === student.id 
                                        ? "bg-primary/5 border-primary shadow-lg shadow-primary/5 ring-1 ring-primary/20" 
                                        : selectedBulkUserIds.includes(student.id)
                                        ? "bg-indigo-50/50 border-indigo-200 shadow-md shadow-indigo-100"
                                        : "bg-white border-slate-200 hover:border-primary/30 hover:shadow-md"
                                    }`}
                                    onClick={() => {
                                        if (filterType === 'all') {
                                            setSelectedStudent(student);
                                        } else {
                                            toggleUserSelection(student.id);
                                        }
                                    }}
                                >
                                    {/* Selected indicator corner badge */}
                                    { (selectedStudent?.id === student.id || selectedBulkUserIds.includes(student.id)) && (
                                        <div className={`absolute top-0 right-0 h-8 w-8 rounded-bl-[1.5rem] flex items-center justify-center ${selectedBulkUserIds.includes(student.id) ? 'bg-indigo-500' : 'bg-primary/10'}`}>
                                            <CheckCircle2 className={`h-3.5 w-3.5 ${selectedBulkUserIds.includes(student.id) ? 'text-white' : 'text-primary'}`} />
                                        </div>
                                    )}

                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        <Avatar className="h-11 w-11 border-2 border-slate-100 shadow-sm rounded-full">
                                            <AvatarImage src={student.avatar_url || ""} />
                                            <AvatarFallback className="bg-primary/5 text-primary text-sm font-black">{student.full_name?.[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 flex items-center justify-center">
                                            <div className="h-1 w-1 bg-white rounded-full animate-pulse" />
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        {/* Name — never truncated, always visible */}
                                        <p className={`text-sm font-black leading-tight ${selectedStudent?.id === student.id ? "text-primary" : "text-slate-900"}`}>
                                            {student.full_name || "—"}
                                        </p>
                                        {/* Email */}
                                        <p className="text-[10px] text-slate-400 font-medium leading-tight break-all">
                                            {student.email}
                                        </p>
                                        {/* College badge */}
                                        {(student.college_name || student.institute_name) && (() => {
                                            const getVal = (v: string | { name?: string; title?: string } | null | undefined) =>
                                                typeof v === 'object' && v !== null ? (v.name || v.title || '') : (v || '');
                                            const label = getVal(student.college_name) || getVal(student.institute_name);
                                            return label ? (
                                                <Badge className="text-[7px] h-4 px-1.5 rounded-md uppercase font-black bg-blue-50 text-blue-600 border-none shadow-none w-fit max-w-[180px] truncate">
                                                    {label}
                                                </Badge>
                                            ) : null;
                                        })()}
                                        {/* Last login */}
                                        {student.last_login_at && (
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-2.5 w-2.5 text-slate-300 shrink-0" />
                                                <span className="text-[9px] font-bold uppercase tracking-tight text-slate-400">
                                                    {format(parseISO(student.last_login_at), "MMM d, h:mm a")}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action button */}
                                    <div className="shrink-0 self-center">
                                        <Button 
                                            size="sm"
                                            className={`h-9 px-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                                                selectedStudent?.id === student.id 
                                                ? "bg-primary text-white shadow-md shadow-primary/20" 
                                                : selectedBulkUserIds.includes(student.id)
                                                ? "bg-red-500 hover:bg-red-600 text-white"
                                                : "bg-primary/5 text-primary hover:bg-primary hover:text-white"
                                            }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (filterType === 'all') {
                                                    setSelectedStudent(student);
                                                } else {
                                                    toggleUserSelection(student.id);
                                                }
                                            }}
                                        >
                                            {selectedBulkUserIds.includes(student.id) ? (
                                                <><Plus className="h-3 w-3 rotate-45" /><span>Remove</span></>
                                            ) : (
                                                <><Plus className="h-3 w-3" /><span>Select</span></>
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden rounded-[2.5rem] bg-white text-slate-900 min-h-[500px] flex flex-col relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Zap className="h-24 w-24 text-slate-200" />
            </div>

            <CardHeader className="border-b border-slate-100 p-8 relative">
              <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Protocol Generation</p>
                  <CardTitle className="text-2xl font-black flex items-center gap-3">
                    <Gift className="h-6 w-6 text-primary" />
                    Reward Pulse
                  </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-8 flex-1 flex flex-col relative overflow-hidden">
              <div className="space-y-8 flex-1 flex flex-col">
                {selectedStudent || selectedBulkUserIds.length > 0 ? (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-6 flex-1 flex flex-col"
                  >
                    {filterType === 'all' && selectedStudent ? (
                      <div className="space-y-4 text-center">
                          <div className="relative inline-block">
                              <Avatar className="h-20 w-20 border-4 border-slate-100 shadow-2xl rounded-[1.5rem]">
                                  <AvatarImage src={selectedStudent.avatar_url || ""} />
                                  <AvatarFallback className="bg-primary/20 text-primary text-2xl font-black">{selectedStudent.full_name?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-primary rounded-xl flex items-center justify-center shadow-lg ring-4 ring-white">
                                  <Star className="h-4 w-4 text-white fill-white" />
                              </div>
                          </div>
                          <div className="space-y-1">
                              <p className="text-xl font-black text-slate-900">{selectedStudent.full_name}</p>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none">{selectedStudent.email}</p>
                          </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Cohort ({selectedBulkUserIds.length})</p>
                            <Badge className="bg-indigo-100 text-indigo-600 border-none text-[8px] font-black uppercase px-2 py-0.5">{filterValue}</Badge>
                        </div>
                        {/* Contained scrollable list with fixed height */}
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 shadow-inner overflow-hidden">
                            <div className="overflow-y-auto max-h-[200px] p-2 space-y-1.5 custom-scrollbar">
                               {students.filter(s => selectedBulkUserIds.includes(s.id)).map(student => (
                                  <div key={student.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-slate-100 shadow-sm animate-in fade-in slide-in-from-right-2">
                                     <Avatar className="h-7 w-7 rounded-lg flex-shrink-0">
                                        <AvatarImage src={student.avatar_url || ""} />
                                        <AvatarFallback className="text-[9px] font-black bg-primary/5 text-primary">{student.full_name?.[0]}</AvatarFallback>
                                     </Avatar>
                                     <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black text-slate-800 truncate leading-tight">{student.full_name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 truncate tracking-tight">{student.email}</p>
                                     </div>
                                     <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                  </div>
                               ))}
                               {selectedBulkUserIds.length === 0 && (
                                   <div className="py-6 text-center">
                                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No students selected</p>
                                   </div>
                               )}
                            </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 text-left bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner mt-auto">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block text-center">
                        Allocation Per Student (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-xl">
                          ₹
                        </span>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(e.target.value)}
                          className="bg-transparent border-slate-200 h-14 pl-12 text-2xl font-black text-slate-900 placeholder:text-slate-200 focus:ring-0 focus:border-primary transition-all rounded-2xl"
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center gap-6 opacity-40 flex-1">
                    <div className="h-24 w-24 rounded-[3rem] bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                        <Zap className="h-10 w-10 text-slate-300" />
                    </div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] max-w-[180px] leading-relaxed text-center">
                        Initializing Secure Handshake... Select Student
                    </p>
                  </div>
                )}

                <AnimatePresence mode="wait">
                    {generatedCode ? (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="py-10 px-6 bg-white text-slate-900 rounded-[2.5rem] flex flex-col items-center justify-center relative shadow-2xl shadow-primary/10 border border-slate-100"
                    >
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase tracking-[0.2em] shadow-xl">
                            Active Reward
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-wider mb-2 text-center">
                        {generatedCode}
                        </h2>
                        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Credentials Dispatched
                        </div>
                    </motion.div>
                    ) : (
                    <div className="space-y-4">
                       {filterValue && filterType !== "all" ? (
                          <Button
                              size="lg"
                              disabled={isGenerating || !discountAmount}
                              onClick={bulkGenerateCoupons}
                              className="w-full h-16 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black tracking-widest text-xs uppercase shadow-2xl shadow-indigo-200 disabled:opacity-20 transition-all border-0 active:scale-[0.98] group"
                          >
                              {isGenerating ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                              <div className="flex items-center gap-3">
                                  <Sparkles className="h-5 w-5 transition-transform group-hover:scale-110" />
                                  <span>Bulk Generate ({selectedBulkUserIds.length} Selected)</span>
                              </div>
                              )}
                          </Button>
                       ) : (
                          <Button
                              size="lg"
                              disabled={!selectedStudent || isGenerating || !discountAmount}
                              onClick={generateCoupon}
                              className="w-full h-16 rounded-[1.5rem] bg-primary hover:bg-slate-900 hover:text-white text-white font-black tracking-widest text-xs uppercase shadow-2xl shadow-primary/30 disabled:opacity-20 transition-all border-0 active:scale-[0.98] group"
                          >
                              {isGenerating ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                              <div className="flex items-center gap-3">
                                  <Gift className="h-5 w-5 transition-transform group-hover:scale-110" />
                                  <span>Dispatch Reward Node</span>
                              </div>
                              )}
                          </Button>
                       )}
                    </div>
                    )}
                </AnimatePresence>
              </div>
            </CardContent>

            <div className="p-8 border-t border-slate-100 mt-auto">
                <div className="flex items-center justify-center gap-4 text-slate-300">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black uppercase tracking-widest">S3 Handshake</span>
                    </div>
                    <div className="h-3 w-px bg-slate-100" />
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Postmark Relay</span>
                    </div>
                </div>
            </div>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white/60 border-l-4 border-primary p-5">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Generator Logic</p>
                   <p className="text-sm font-black text-slate-800 tracking-tight">Pattern: AOTMS-[RANDOM]</p>
                </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
