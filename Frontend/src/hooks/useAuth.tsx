import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { UserRole } from '@/types/auth';

// Simplified types to replace backend user types
interface User {
  id: string;
  email?: string;
  role?: string;
  full_name?: string;
  avatar_url?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
  approval_status?: string;
  [key: string]: unknown;
}

interface Session {
  access_token: string;
  user: User | null;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone?: string, courseType?: string, collegeName?: string, locationData?: { city?: string; district?: string; country?: string; fullAddress?: string; latitude?: number; longitude?: number }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; requiresAdminOtp?: boolean }>;
  verifyAdminOtp: (email: string, otp: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage for instant persistence on refresh
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    if (!saved || saved === 'undefined') return null;
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse user from storage:', e);
      return null;
    }
  });
  const [session, setSession] = useState<Session | null>(() => {
    const token = localStorage.getItem('access_token');
    if (!token || token === 'undefined') return null;
    const savedUser = localStorage.getItem('user');
    let parsedUser = null;
    if (savedUser && savedUser !== 'undefined') {
      try {
        parsedUser = JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed to parse user for session:', e);
      }
    }
    return {
      access_token: token,
      user: parsedUser
    } as Session;
  });
  const [userRole, setUserRole] = useState<UserRole | null>(() => {
    const role = localStorage.getItem('user_role');
    return (role && role !== 'undefined') ? (role as UserRole) : null;
  });

  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('user_role');
      setUser(null);
      setSession(null);
      setUserRole(null);
      setLoading(false);
    }
  }, []);

  const checkSession = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // 1. Validate session and fetch role with backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // Increased to 20s

      const [profileRes] = await Promise.all([
        fetch(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        })
      ]);

      clearTimeout(timeoutId);

      if (profileRes.status === 401) {
        throw new Error('Session expired');
      }

      if (profileRes.status === 403) {
        console.warn('Profile access forbidden (Role mismatch?): Skipping update');
        setLoading(false);
        return;
      }

      if (!profileRes.ok) {
        setLoading(false);
        return;
      }

      const { user: userData } = await profileRes.json();

      // Update local state and storage with fresh profile data
      setUser(userData);
      setSession({ access_token: token, user: userData } as Session);
      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData));
      }

      // Use the role returned from profile endpoint
      if (userData.role) {
        const freshRole = userData.role as UserRole;
        setUserRole(freshRole);
        localStorage.setItem('user_role', freshRole);
      }

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Session check timed out, keeping current local session');
        setLoading(false);
        return;
      }

      console.error('Session validation failed:', error);

      if (error instanceof Error) {
         if (error.message?.includes('expired') || error.message?.includes('token') || error.message?.includes('401')) {
          void signOut();
        }
      }
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    // This effect runs on app load and handles the persistence check
    const initAuth = async () => {
      await checkSession();
    };
    initAuth();
  }, [checkSession]);

  // Removed Real-time Role Sync (Firebase listeners removed)
  // Replaced with periodic polling or just relying on checkSession on navigation
  useEffect(() => {
      if (!user?.id) return;
      // Simple polling every 2 minutes to keep role in sync without websockets
      const interval = setInterval(() => {
          checkSession();
      }, 2 * 60 * 1000);
      return () => clearInterval(interval);
  }, [user?.id, checkSession]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, phone?: string, courseType?: string, collegeName?: string, locationData?: { city?: string; district?: string; country?: string; fullAddress?: string; latitude?: number; longitude?: number }) => {
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          fullName, 
          phone, 
          courseType,
          collegeName,
          city: locationData?.city,
          district: locationData?.district,
          country: locationData?.country,
          fullAddress: locationData?.fullAddress,
          latitude: locationData?.latitude,
          longitude: locationData?.longitude
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: new Error(data.error || 'Signup failed') };
      }

      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token);
        if (data.session.refresh_token) {
          localStorage.setItem('refresh_token', data.session.refresh_token);
        }
        const newUser = { ...data.user, approval_status: 'pending' };
        if (newUser) {
          localStorage.setItem('user', JSON.stringify(newUser));
        }
        // Use the role returned by the server (intern for internship, student for full_time)
        const signupRole = data.user?.role || 'student';
        localStorage.setItem('user_role', signupRole);

        setUser(newUser);
        setSession(data.session);
        setUserRole(signupRole as UserRole);
      }
      return { error: null };
    } catch (error: unknown) {
      if (error instanceof Error) return { error };
      return { error: new Error('Unknown error during signup') };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        return { error: new Error(data.error || 'Login failed') };
      }

      // Admin requires OTP verification — don't issue token yet
      if (data.requiresOtp) {
        setLoading(false);
        return { error: null, requiresAdminOtp: true };
      }

      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token);
        if (data.session.refresh_token) {
          localStorage.setItem('access_token_refresh', data.session.refresh_token);
        }

        const userData = data.user;
        const role = userData.role || 'student';

        if (userData) {
          localStorage.setItem('user', JSON.stringify(userData));
        }
        localStorage.setItem('user_role', role);

        setUser(userData);
        setSession(data.session);
        setUserRole(role);
      }

      setLoading(false);
      return { error: null };
    } catch (error: unknown) {
      setLoading(false);
      if (error instanceof Error) return { error };
      return { error: new Error('Unknown error during signin') };
    }
  }, []);

  const verifyAdminOtp = useCallback(async (email: string, otp: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/admin-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        return { error: new Error(data.error || 'OTP verification failed') };
      }

      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token);
        if (data.session.refresh_token) {
          localStorage.setItem('access_token_refresh', data.session.refresh_token);
        }
        const userData = data.user;
        const role = userData.role || 'admin';
        if (userData) {
          localStorage.setItem('user', JSON.stringify(userData));
        }
        localStorage.setItem('user_role', role);
        setUser(userData);
        setSession(data.session);
        setUserRole(role as UserRole);
      }

      setLoading(false);
      return { error: null };
    } catch (error: unknown) {
      setLoading(false);
      if (error instanceof Error) return { error };
      return { error: new Error('Unknown error during OTP verification') };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, signUp, signIn, signOut, checkSession, verifyAdminOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}