import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  User,
  BookOpen,
  Video,
  Calendar,
  FileText,
  ClipboardCheck,
  History,
  Trophy,
  Bell,
  Settings,
  LogOut,
  Zap,
  MessageSquare,
  Folder,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

const navigationGroups = [
  {
    label: "General",
    items: [
      { title: "Dashboard", url: "/student-dashboard", icon: LayoutDashboard },
      { title: "My Profile", url: "/student-dashboard/profile", icon: User },
      { title: "Messages", url: "/student-dashboard/chat", icon: MessageSquare },
    ],
  },
  {
    label: "Learning Hub",
    items: [
      { title: "My Courses", url: "/student-dashboard/courses", icon: BookOpen },
      { title: "Video Lessons", url: "/student-dashboard/videos", icon: Video },
      { title: "Live Classes", url: "/student-dashboard/live-classes", icon: Calendar },
      { title: "Resources", url: "/student-dashboard/resources", icon: Folder },
    ],
  },
  {
    label: "Academic",
    items: [
      { title: "Resume ATS", url: "/student-dashboard/resume-ats", icon: Zap },
      { title: "Mock Papers", url: "/student-dashboard/mock-papers", icon: FileText },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Attendance", url: "/student-dashboard/attendance", icon: ClipboardList },
      { title: "History", url: "/student-dashboard/history", icon: History },
      { title: "Notifications", url: "/student-dashboard/notifications", icon: Bell },
    ],
  },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-200/40 !bg-white/80 backdrop-blur-2xl font-sans shadow-[20px_0_40px_rgba(0,0,0,0.01)]"
    >
      <SidebarHeader className="h-24 flex items-center justify-center px-4 group-data-[collapsible=icon]:px-0 border-b border-slate-200/60">
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
              Student Panel
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className={cn(
        "px-3 group-data-[collapsible=icon]:px-2 space-y-8 scrollbar-hide",
        collapsed ? "py-6" : "py-6"
      )}>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            {!collapsed && (
              <SidebarGroupLabel className="px-4 text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 p-0 h-auto mb-3">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
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
                            layoutId="active-pill-student"
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
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2 border-t border-slate-50 mt-auto">
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

