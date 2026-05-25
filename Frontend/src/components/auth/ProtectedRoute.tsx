import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const { user, userRole, loading } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                navigate("/auth", { state: { from: pathname } });
                return;
            }

            // Privileged access bypass
            if (['admin', 'manager'].includes(userRole || '')) {
                if (pathname === '/pending-approval') {
                    const portal = userRole === 'admin' ? '/admin' : '/manager';
                    navigate(portal);
                    return;
                }
            } else {
                // Approval check for non-privileged users
                if ((!user.approval_status || user.approval_status === 'pending') && pathname !== '/pending-approval') {
                    navigate('/pending-approval');
                    return;
                }

                const isApproved = ['approved', 'active', 'approve'].includes((user.approval_status || '').toLowerCase());
                if (isApproved && pathname === '/pending-approval') {
                    const approvedDashboard = userRole === 'intern' ? '/intern-dashboard' : '/student-dashboard';
                    navigate(approvedDashboard);
                    return;
                }
            }

            // Role enforcement with recursive protection
            if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
                const dashboardMap: Record<string, string> = {
                  student: "/student-dashboard",
                  intern: "/intern-dashboard",
                  instructor: "/instructor",
                  admin: "/admin",
                  manager: "/manager"
                };
                
                const target = dashboardMap[userRole] || "/student-dashboard";
                
                // Only navigate if we're not already there to prevent infinite loops
                if (pathname !== target && !pathname.startsWith(target)) {
                    navigate(target);
                }
            }
        }
    }, [user, userRole, loading, navigate, pathname, allowedRoles?.join(',')]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    return <>{children}</>;
};