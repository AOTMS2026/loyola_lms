/**
 * INTERVIEW CANDIDATE DASHBOARD
 * File: Frontend/src/pages/interview/InterviewDashboard.tsx
 * Route: /interview-dashboard
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Clock, BookOpen, AlertTriangle,
  CheckCircle, XCircle, LogOut, Play, User
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:5000" : "https://loyola-lms.onrender.com");

interface ExamInfo {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  duration_minutes: number;
  passing_percentage: number;
  scheduled_date: string;
  scheduled_time: string;
  num_questions?: number;
}

interface DashboardData {
  candidate: {
    id: string;
    full_name: string;
    email: string;
    username: string;
    mobile_number: string;
    status: string;
  };
  exam: (ExamInfo & { _id?: string }) | null;
  exam_status: "upcoming" | "active" | "completed" | "blocked";
  assigned_exams?: (ExamInfo & { _id?: string })[];
}

const STATUS_CONFIG = {
  upcoming: {
    label: "Upcoming",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
  },
  active: {
    label: "Active — Exam In Progress",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Play,
  },
  completed: {
    label: "Completed",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: CheckCircle,
  },
  blocked: {
    label: "Blocked",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
};

export default function InterviewDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverTime, setServerTime] = useState<Date>(new Date());
  const navigate = useNavigate();

  const token = localStorage.getItem("interview_token");

  useEffect(() => {
    if (!token) { navigate("/interview-login"); return; }
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    const clockInterval = setInterval(() => setServerTime(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(clockInterval); };
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/interview/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExam = async (examId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/interview/auth/select-exam`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ exam_id: examId })
      });
      if (res.ok) {
        fetchDashboard();
      }
    } catch (err) {
      console.error("Error selecting exam:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("interview_token");
    localStorage.removeItem("interview_candidate");
    navigate("/interview-login");
  };

  const handleStartExam = () => {
    navigate("/interview-exam");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Loading your exam portal...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-semibold">Unable to load dashboard.</p>
          <Button onClick={() => navigate("/interview-login")} className="mt-4 rounded-xl bg-primary hover:bg-primary/90">
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  const { candidate, exam, exam_status } = data;
  const statusConfig = STATUS_CONFIG[exam_status] || STATUS_CONFIG.upcoming;
  const StatusIcon = statusConfig.icon;
  const canStartExam = exam_status === "active";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-slate-900 font-bold text-sm">{candidate.full_name}</p>
              <p className="text-slate-500 text-xs">{candidate.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-slate-400 text-xs font-medium">Current Time</p>
              <p className="text-slate-700 text-sm font-mono font-semibold">
                {serverTime.toLocaleTimeString("en-IN")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-9 px-4 rounded-xl border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-4 h-4 mr-1.5" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-5">
        {/* Status Banner */}
        <div className={`flex items-center gap-3 p-4 rounded-2xl border font-semibold text-sm ${statusConfig.color}`}>
          <StatusIcon className="w-5 h-5 flex-shrink-0" />
          <span>{statusConfig.label}</span>
        </div>

        {/* Assigned Exams Dropdown Selector */}
        {data.assigned_exams && data.assigned_exams.length > 1 && (
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-slate-900 font-bold text-sm">Your Assigned Exams ({data.assigned_exams.length})</p>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">Select which exam details you would like to view and attempt.</p>
            </div>
            <select
              value={exam?.id || exam?._id || ""}
              onChange={(e) => handleSelectExam(e.target.value)}
              className="h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-3 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            >
              {data.assigned_exams.map((e: any) => (
                <option key={e.id || e._id} value={e.id || e._id}>
                  {e.title}
                </option>
              ))}
            </select>
          </Card>
        )}

        {/* Exam Card */}
        {exam ? (
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="pb-4 border-b border-slate-50">
              <CardTitle className="text-slate-900 text-xl font-bold">{exam.title}</CardTitle>
              <p className="text-slate-500 text-sm font-medium">Topic: {exam.topic}</p>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Exam Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoTile icon={Calendar} label="Date" value={exam.scheduled_date} />
                <InfoTile icon={Clock} label="Time" value={exam.scheduled_time} />
                <InfoTile icon={Clock} label="Duration" value={`${exam.duration_minutes} minutes`} />
                <InfoTile icon={BookOpen} label="Questions" value={String(exam.num_questions || "—")} />
                <InfoTile icon={CheckCircle} label="Passing" value={`${exam.passing_percentage}%`} />
                <InfoTile
                  icon={AlertTriangle}
                  label="Difficulty"
                  value={exam.difficulty.charAt(0).toUpperCase() + exam.difficulty.slice(1)}
                />
              </div>

              {/* Instructions */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-5 space-y-2">
                <h3 className="text-slate-800 font-bold text-sm flex items-center gap-2">
                  📋 Exam Instructions
                </h3>
                <ul className="text-slate-600 text-sm space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>The exam will be available only during the scheduled time window.</li>
                  <li>Switching browser tabs or windows will trigger a warning.</li>
                  <li>Three violations will automatically submit or block your exam.</li>
                  <li>Copy, paste, and right-click are disabled during the exam.</li>
                  <li>You must remain in fullscreen mode throughout the exam.</li>
                  <li>Your answers are auto-saved. Do not refresh the page.</li>
                  <li>Once submitted, answers cannot be changed.</li>
                </ul>
              </div>

              {/* CTA */}
              <div className="pt-1">
                <Button
                  onClick={handleStartExam}
                  disabled={!canStartExam}
                  size="lg"
                  className={`w-full h-12 rounded-xl font-bold text-base transition-all active:scale-95 ${
                    canStartExam
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  }`}
                >
                  {exam_status === "upcoming" && `Start Exam (Opens at ${exam.scheduled_time})`}
                  {exam_status === "active" && "▶ Start Exam Now"}
                  {exam_status === "completed" && "Exam Completed"}
                  {exam_status === "blocked" && "Account Blocked"}
                </Button>
                {exam_status === "upcoming" && (
                  <p className="text-center text-slate-400 text-xs mt-2 font-medium">
                    The button will activate at your scheduled exam time.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-700 text-lg font-semibold">No exam assigned yet.</p>
              <p className="text-slate-400 text-sm mt-1">
                Your examination coordinator will assign an exam to your account.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <span className="text-slate-900 font-semibold text-sm">{value}</span>
    </div>
  );
}