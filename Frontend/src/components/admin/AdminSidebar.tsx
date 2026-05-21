import { useState, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import {
  LayoutDashboard,
  Users,
  LogOut,
  FileQuestion,
  GraduationCap,
  ShieldCheck,
  Award,
  Video,
  Calendar,
  Database,
  TrendingUp,
  Ticket,
  User,
  Search,
  X,
  UserCheck,
  Trophy,
  Activity,
  MessageSquare,
  Settings,
  Bell,
  ClipboardList,
  RefreshCcw,
  Zap,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "User administration",
    items: [
      { title: "User Management", url: "/admin/users", icon: Users },
      { title: "Grant Access", url: "/admin/grant-access", icon: UserCheck },
      { title: "Student Enrollments", url: "/admin/enrollments", icon: GraduationCap },
    ],
  },
  {
    label: "Platform Performance",
    items: [
      { title: "Academic Scores", url: "/admin/student-performance", icon: TrendingUp },
      { title: "Leaderboard", url: "/admin/leaderboard", icon: Trophy },
      { title: "Rewards & Coupons", url: "/admin/coupons", icon: Ticket },
      { title: "Resume Scans", url: "/admin/resume-scans", icon: ClipboardList },
    ],
  },
  {
    label: "Management Portal",
    items: [
      { title: "Instructor Access", url: "/admin/instructor-access", icon: ShieldCheck },
      { title: "Instructors List", url: "/admin/instructors", icon: Award },
      { title: "Exam Schedule", url: "/admin/exam-scheduling", icon: Calendar },
    ],
  },
  {
    label: "Academic Content",
    items: [
      { title: "Question Repository", url: "/admin/question-repository", icon: Database },
      { title: "Question Access", url: "/admin/question-access", icon: UserCheck },
      { title: "All Courses", url: "/admin/all-courses", icon: GraduationCap },
      { title: "Video Library", url: "/admin/videos", icon: Video },
    ],
  },
  {
    label: "System Monitoring",
    items: [
      { title: "Chat Monitor", url: "/admin/chat", icon: MessageSquare },
      { title: "Live Monitoring", url: "/admin/live-monitoring", icon: Activity },
      { title: "Quality Assurance", url: "/admin/qa", icon: ShieldCheck },
    ],
  },
  {
    label: "System & Tools",
    items: [
      { title: "AI Hub", url: "/admin/ai-hub", icon: Zap },
      { title: "Settings", url: "/admin/settings", icon: Settings },
      { title: "Notifications", url: "/admin/notifications", icon: Bell },
      { title: "Admin Profile", url: "/admin/profile", icon: User },
    ],
  },
];


export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleGlobalSync = useCallback(async () => {
    setIsSyncing(true);
    toast.dismiss();
    const tId = toast.loading("Syncing platform data...", {
      description: "Refreshing all core modules and analytics."
    });

    try {
      // Invalidate all queries to trigger a global refresh
      await queryClient.invalidateQueries();
      
      // Artificial delay for visual feedback if lightning fast
      await new Promise(r => setTimeout(r, 600));
      
      toast.success("Platform Synchronized", {
        id: tId,
        description: "All modules are now up to date."
      });
    } catch (err) {
      toast.error("Sync Failed", {
        id: tId,
        description: "Could not refresh all data. Check connection."
      });
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient]);

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
              Admin Panel
            </span>
          )}
        </Link>
      </SidebarHeader>

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
                    <SidebarMenuItem key={item.url}>
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
                              layoutId="active-pill-admin"
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

      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2 border-t border-slate-50 bg-slate-50/50 mt-auto">
        <div className="space-y-2">
          <Button
            variant="ghost"
            onClick={handleGlobalSync}
            disabled={isSyncing}
            className="w-full justify-start group-data-[collapsible=icon]:justify-center gap-3 h-11 px-4 group-data-[collapsible=icon]:px-0 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-black transition-all"
          >
            <RefreshCcw className={cn("h-4 w-4 shrink-0 transition-transform duration-700", isSyncing && "animate-spin")} />
            {!collapsed && <span className="text-[11px] uppercase tracking-wider">Sync Platform Data</span>}
          </Button>

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


