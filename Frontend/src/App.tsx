import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SocketProvider } from "@/hooks/useSocket";
import { useEffect, useRef, useState } from "react";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import InstructorRegister from "./pages/InstructorRegister";
import Dashboard from "./pages/Dashboard";
import InternDashboard from "./pages/Interndashboard";
import InstructorDashboard from "./pages/InstructorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import LiveSession from "./pages/LiveSession";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import PendingApproval from "./pages/PendingApproval";
import Courses from "./pages/Courses";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Docs from "./pages/Docs";
import Careers from "./pages/Careers";
import Trainers from "./pages/Trainers";
import Press from "./pages/Press";
import Features from "./pages/Features";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import { SuspensionOverlay } from "@/components/auth/SuspensionOverlay";
import PageLoader from "@/components/PageLoader";
import CustomCursor from "@/components/CustomCursor";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 120000, // 2 minutes - Reduce redundant fetches
      refetchOnWindowFocus: false, // Prevent refetches on tab switch
      retry: 1, // Only retry once on failure
    },
  },
});

const BackNavigationHandler = () => {
  const { userRole, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const handlePopState = (event: PopStateEvent) => {
      const dashboardMap: Record<string, string> = {
        student: "/student-dashboard",
        intern: "/intern-dashboard",
        instructor: "/instructor",
        admin: "/admin",
        manager: "/manager",
      };

      const portalPath = user
        ? dashboardMap[userRole || "student"] || "/"
        : "/";

      // If we're not at the main portal entry point, handle the redirect
      if (location.pathname !== portalPath) {
        navigate(portalPath, { replace: true });
      }
    };

    // Add a state to history so we can intercept the back button
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [user, userRole, loading, navigate, location.pathname]);

  return null;
};

const RoleRedirector = () => {
  const { userRole, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const lastRoleRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user || !userRole) return;

    // Redirection Map
    const dashboardMap: Record<string, string> = {
      student: "/student-dashboard",
      intern: "/intern-dashboard",
      instructor: "/instructor",
      admin: "/admin",
      manager: "/manager",
    };

    const target = dashboardMap[userRole];

    // 1. Handle Role Change during session
    if (lastRoleRef.current !== null && lastRoleRef.current !== userRole) {
      console.log(
        `[REAL-TIME] Role update detected: ${lastRoleRef.current} -> ${userRole}.`,
      );
      if (target && !location.pathname.startsWith(target)) {
        navigate(target);
      }
    }
    // 2. Handle Initial Load / Wrong Page
    else if (location.pathname === "/auth") {
      if (target) navigate(target);
    }
    // Force specific redirection for non-students/non-interns if they wander into wrong area
    else if (
      userRole !== "student" &&
      location.pathname.startsWith("/student-dashboard")
    ) {
      if (target && target !== "/student-dashboard") {
        navigate(target);
      }
    }
    else if (
      userRole !== "intern" &&
      location.pathname.startsWith("/intern-dashboard")
    ) {
      if (target && target !== "/intern-dashboard") {
        navigate(target);
      }
    }

    lastRoleRef.current = userRole;
  }, [userRole, user, loading, navigate, location.pathname]);

  return null;
};

const RouteChangeLoader = () => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      setIsLoading(true);
      prevPathRef.current = location.pathname;

      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return <PageLoader isVisible={isLoading} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SocketProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <CustomCursor />
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <RouteChangeLoader />
            <SuspensionOverlay />
            <ScrollToTop />
            <BackNavigationHandler />
            <RoleRedirector />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/about" element={<About />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/signup" element={<Auth />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/trainers" element={<Trainers />} />
              <Route path="/press" element={<Press />} />
              <Route path="/features" element={<Features />} />
              <Route
                path="/pending-approval"
                element={
                  <ProtectedRoute>
                    <PendingApproval />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/become-instructor"
                element={<InstructorRegister />}
              />

              <Route
                path="/student-dashboard"
                element={
                  <ProtectedRoute
                    allowedRoles={["student", "instructor", "admin"]}
                  >
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student-dashboard/*"
                element={
                  <ProtectedRoute
                    allowedRoles={["student", "instructor", "admin"]}
                  >
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/intern-dashboard"
                element={
                  <ProtectedRoute
                    allowedRoles={["intern", "admin"]}
                  >
                    <InternDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/intern-dashboard/*"
                element={
                  <ProtectedRoute
                    allowedRoles={["intern", "admin"]}
                  >
                    <InternDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instructor"
                element={
                  <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                    <InstructorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instructor/*"
                element={
                  <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                    <InstructorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager"
                element={
                  <ProtectedRoute allowedRoles={["manager", "admin"]}>
                    <ManagerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/*"
                element={
                  <ProtectedRoute allowedRoles={["manager", "admin"]}>
                    <ManagerDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/live/:meetingId"
                element={
                  <ProtectedRoute>
                    <LiveSession />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SocketProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;