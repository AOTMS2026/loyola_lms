import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  User,
  Calendar,
  FileQuestion,
  Trophy,
  Users,
  Ticket,
  KeyRound,
  ClipboardList,
  LogOut,
  Search,
  ShieldCheck,
  UserCheck,
  TrendingUp,
  Video,
  Radio,
  BarChart3,
  BookOpen,
  X,
  Database,
  Zap,
  Activity,
  UserPlus
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Overview",
    items: [
      { id: "dashboard",    title: "Dashboard",          url: "/manager",                      icon: LayoutDashboard },
      { id: "profile",      title: "My Profile",         url: "/manager/profile",               icon: User },
    ],
  },
  {
    label: "Exam Management",
    items: [
      { id: "exams",        title: "Exam Scheduling",    url: "/manager/exams",                 icon: Calendar },
      { id: "questions",    title: "Question Bank",      url: "/manager/questions",             icon: FileQuestion },
      { id: "question-access", title: "Question Access", url: "/manager/question-access",      icon: UserCheck },
    ],
  },
  {
    label: "Academic Content",
    items: [
      { id: "all-courses",  title: "All Courses",        url: "/manager/all-courses",           icon: BookOpen },
      { id: "video-library",title: "Video Library",      url: "/manager/video-library",         icon: Video },
    ],
  },
  {
    label: "User Management",
    items: [
      { id: "users",        title: "User Management",    url: "/manager/users",                 icon: Users },
      { id: "instructors",  title: "Instructors",        url: "/manager/instructors",           icon: UserPlus },
      { id: "instructor-access", title: "Instructor Access", url: "/manager/instructor-access", icon: ShieldCheck },
      { id: "enrollments",  title: "Enrollments Hub",    url: "/manager/enrollments",           icon: Database },
      { id: "submissions-grading", title: "Submissions Grading", url: "/manager/submissions-grading", icon: ClipboardList },
      { id: "live-broadcast", title: "Live Broadcast",      url: "/manager/live-broadcast",        icon: Radio },
      { id: "grant-access", title: "Grant Access",       url: "/manager/grant-access",          icon: KeyRound },
    ],
  },
  {
    label: "Analytics & Monitoring",
    items: [
      { id: "student-performance", title: "Academic Scores", url: "/manager/student-performance", icon: BarChart3 },
      { id: "leaderboard",  title: "Leaderboard",        url: "/manager/leaderboard",           icon: Trophy },
      { id: "monitoring",   title: "Live Monitoring",    url: "/manager/monitoring",            icon: Activity },
      { id: "resume-scans", title: "Resume Scan Logs",   url: "/manager/resume-scans",          icon: ClipboardList },
    ],
  },
  {
    label: "Marketing & AI",
    items: [
      { id: "coupons",      title: "Rewards & Coupons",  url: "/manager/coupons",               icon: Ticket },
      { id: "ai-hub",       title: "AI Communications",  url: "/manager/ai-hub",                icon: Zap },
    ],
  },
];

export function ManagerSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const isActive = (path: string) => {
    if (path === "/manager" && location.pathname === "/manager") return true;
    if (path !== "/manager" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const filteredGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-200/40 !bg-white/80 backdrop-blur-2xl font-sans shadow-[20px_0_40px_rgba(0,0,0,0.01)]"
    >
      {/* Header */}
      <SidebarHeader className="h-24 flex flex-col items-center justify-center px-4 py-4 group-data-[collapsible=icon]:px-0 border-b border-slate-200/60 gap-4">
        <Link
          to="/"
          className="flex flex-col gap-1 items-center active:scale-95 transition-transform"
        >
          <img
            src={logo}
            alt="AOTMS Logo"
            className="h-12 w-auto object-contain group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8"
          />
          {!collapsed && (
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              Manager Panel
            </span>
          )}
        </Link>
      </SidebarHeader>

      {/* Search */}
      {!collapsed && (
        <div className="px-5 py-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-8 text-[11px] bg-slate-50/50 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 border-none bg-transparent"
              >
                <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Nav Groups */}
      <SidebarContent className={cn(
        "px-3 group-data-[collapsible=icon]:px-2 space-y-6 scrollbar-hide",
        collapsed ? "py-6" : "py-2"
      )}>
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <SidebarGroup key={group.label} className="p-0">
              {!collapsed && (
                <SidebarGroupLabel className="px-4 text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 p-0 h-auto mb-3">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-1.5">
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                        className={cn(
                          "h-12 px-4 rounded-xl transition-all duration-300 group relative overflow-hidden",
                          isActive(item.url)
                            ? "bg-primary text-white shadow-[0_10px_20px_rgba(var(--primary),0.2)]"
                            : "hover:bg-primary/5 text-slate-600 hover:text-primary"
                        )}
                      >
                        <Link to={item.url} className="flex items-center gap-3.5 w-full">
                          <div className="relative z-10">
                            <item.icon
                              className={cn(
                                "h-[1.125rem] w-[1.125rem] transition-all duration-300",
                                isActive(item.url) ? "text-white scale-110" : "text-slate-400 group-hover:text-primary"
                              )}
                            />
                          </div>

                          {!collapsed && (
                            <motion.span
                              className={cn(
                                "font-bold text-xs uppercase tracking-wider z-10",
                                isActive(item.url) ? "text-white" : "group-hover:text-primary"
                              )}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                            >
                              {item.title}
                            </motion.span>
                          )}

                          {isActive(item.url) && (
                            <motion.div
                              layoutId="active-pill-manager"
                              className="absolute inset-0 bg-primary z-0"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-[10px] text-slate-400 font-medium">No results found</p>
          </div>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2 border-t border-slate-50 bg-slate-50/50 mt-auto">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start group-data-[collapsible=icon]:justify-center gap-3 h-11 px-4 group-data-[collapsible=icon]:px-0 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold transition-all"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm">Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
