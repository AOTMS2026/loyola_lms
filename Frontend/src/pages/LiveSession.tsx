import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ZoomMtg } from '@zoom/meetingsdk';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api';
import { AlertCircle, ArrowLeft, Video, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * ZOOM SDK Initialization
 * Moved INSIDE the component to prevent it from injecting global CSS and breaking the layout on other pages!
 */
const ZOOM_VERSION = '5.1.4'; // Matches package.json

export default function LiveSession() {
    const { meetingId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('Initializing...');
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [isFinished, setIsFinished] = useState(false);

    const hasInitialized = useRef(false);

    // Params from URL
    const queryParams = new URLSearchParams(location.search);
    const password = queryParams.get('pwd') || '';
    const role = parseInt(queryParams.get('role') || '0');

    const addLog = (msg: string) => {
        setLogs(prev => [...prev.slice(-4), msg]);
    };

    useEffect(() => {
        // Prevent double-init
        if (!meetingId || !user || hasInitialized.current) return;
        hasInitialized.current = true;

        const setupMeeting = async () => {
            try {
                const sdkKey = import.meta.env.VITE_ZOOM_CLIENT_ID
                    || (window as any).__VITE_ZOOM_CLIENT_ID__
                    || '';

                if (!sdkKey) {
                    throw new Error(
                        'Zoom SDK Key (VITE_ZOOM_CLIENT_ID) is not configured. ' +
                        'Please add it to your Vercel project: ' +
                        'Vercel Dashboard → Your Project → Settings → Environment Variables → Add VITE_ZOOM_CLIENT_ID'
                    );
                }

                addLog('Verifying session schedule...');

                // 1. Fetch Class Data to check time
                const meetingNumber = meetingId.replace(/\s/g, '');
                const liveClasses = await fetchWithAuth(`/data/live_classes?meeting_id=eq.${meetingNumber}`) as any[];
                
                if (!liveClasses || liveClasses.length === 0) {
                   throw new Error('Session not found in our records.');
                }

                const liveClass = liveClasses[0];
                const startTime = new Date(liveClass.scheduled_at).getTime();
                const duration = (liveClass.duration_minutes || 60) * 60000;
                const endTime = startTime + duration;
                const now = new Date().getTime();

                // Time checks removed as per user request to allow immediate access


                addLog('Authenticating credentials...');

                // Initialize Zoom only now to prevent global CSS hijacking on other pages
                ZoomMtg.setZoomJSLib(`https://source.zoom.us/${ZOOM_VERSION}/lib`, '/av');
                ZoomMtg.preLoadWasm();
                ZoomMtg.prepareWebSDK();
                ZoomMtg.i18n.load('en-US');
                ZoomMtg.i18n.reload('en-US');

                // 1. Get Security Signature
                addLog('Generating security signature...');
                const response = await fetchWithAuth('/zoom/signature', {
                    method: 'POST',
                    body: JSON.stringify({
                        meetingNumber: meetingNumber,
                        role: role
                    })
                });

                // USE THE KEY FROM THE BACKEND IF POSSIBLE to avoid local .env mismatch
                const signature = response.signature;
                // const activeSdkKey = response.sdkKey || sdkKey; // Not used in join anymore

                if (!signature) throw new Error('Signature generation failed on backend.');

                addLog('Engine preparation...')

                // 2. Initialize Zoom Client View
                const zRoot = document.getElementById('zmmtg-root');
                if (zRoot) zRoot.style.display = 'block';

                ZoomMtg.init({
                    leaveUrl: window.location.origin + (role === 1 ? '/instructor' : '/student-dashboard'),
                    debug: true,
                    // Remove patchJsMedia and explicit isSupport flags for now
                    success: () => {
                        addLog('Engine ready. Joining room...');
                        ZoomMtg.join({
                            signature: signature,
                            // sdkKey removed as per log recommendation
                            meetingNumber: meetingNumber,
                            userName: user.user_metadata?.full_name || user.email || 'AOTMS User',
                            passWord: password,
                            tk: '', // Empty token
                            success: () => {
                                addLog('Joined successfully!');
                                setStatus('Connected!');
                                setLoading(false);
                            },
                            error: (err: any) => {
                                console.error('Join Error:', err);
                                addLog(`Join Fail: ${err.errorMessage || 'Invalid meeting'}`);
                                setError(`Failed to enter: ${err.errorMessage || 'Unknown Zoom error'}`);
                                setLoading(false);
                            }
                        });
                    },
                    error: (err: any) => {
                        console.error('Init Error:', err);
                        addLog(`Init Fail: ${err.errorMessage || 'Invalid parameters'}`);
                        setError(`Engine initialization failed: ${err.errorMessage || 'Please check SDK Key and Meeting ID format'}`);
                        setLoading(false);
                    }
                });

            } catch (err: unknown) {
                console.error('Setup Error:', err);
                setError((err as Error).message || 'Identity check failed.');
                setLoading(false);
            }
        };

        // Added a delay for React hydration safety
        const timer = setTimeout(setupMeeting, 1000);

        // Styling cleanup for body
        document.body.style.overflow = 'hidden';

        return () => {
            clearTimeout(timer);
            document.body.style.overflow = 'auto';
            // standard Zoom SDK (Client View) clean-up is difficult (usually requires page-reload)
            // but we can at least try to restore body style.
        };
    }, [meetingId, user, role, password]);

    if (error) {
        const isEnvError = error.includes('VITE_ZOOM_CLIENT_ID') || error.includes('SDK Key');
        return (
            <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 z-[10000]">
                <div className="max-w-lg w-full text-center space-y-8 animate-in fade-in zoom-in duration-300">
                    <div className={cn(
                        "w-20 h-20 rounded-full flex items-center justify-center mx-auto ring-1",
                        isFinished ? "bg-amber-500/10 ring-amber-500/20" : "bg-red-500/10 ring-red-500/20"
                    )}>
                        <AlertCircle className={cn("w-10 h-10", isFinished ? "text-amber-500" : "text-red-500")} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                            {isFinished ? "Session Ended" : "Something went wrong"}
                        </h2>
                        <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
                    </div>

                    {isEnvError && (
                        <div className="text-left bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-3">
                            <p className="text-slate-300 text-xs font-black uppercase tracking-widest">Fix: Add to Vercel Environment Variables</p>
                            <div className="space-y-2">
                                {[
                                    'Go to vercel.com → Your Project',
                                    'Settings → Environment Variables',
                                    'Add: VITE_ZOOM_CLIENT_ID = NjmbRGboS82PrvvlTnDJcA',
                                    'Redeploy the project',
                                ].map((step, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                        <span className="text-slate-300 text-xs font-medium">{step}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 p-3 bg-slate-800 rounded-xl border border-slate-700">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Your SDK Key (from .env)</p>
                                <code className="text-emerald-400 text-xs font-mono">NjmbRGboS82PrvvlTnDJcA</code>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        {!isFinished && (
                            <Button className="h-12 bg-blue-600 hover:bg-blue-700 font-bold" onClick={() => window.location.reload()}>
                                <RefreshCcw className="w-4 h-4 mr-2" /> RE-ENTER SESSION
                            </Button>
                        )}
                        <Button variant="ghost" className="text-slate-400" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> {isFinished ? "RETURN TO DASHBOARD" : "EXIT ROOM"}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <React.Fragment>
            {loading && (
                <div className="fixed inset-0 bg-[#0b0e14] flex flex-col items-center justify-center p-6 z-[9999]">
                    <div className="relative mb-12">
                        <div className="w-28 h-28 border-[6px] border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Video className="w-10 h-10 text-blue-500 animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center">
                        <h2 className="text-white text-2xl font-black mb-4 tracking-tighter uppercase italic">
                            Connecting...
                        </h2>
                        <div className="flex flex-col gap-2 items-center">
                            {logs.map((log, i) => (
                                <div key={i} className="flex items-center gap-2 text-[11px] font-bold text-slate-500 animate-in fade-in slide-in-from-bottom-1">
                                    <CheckCircle2 className="w-3 h-3 text-blue-500" />
                                    <span className="uppercase tracking-widest">{log}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </React.Fragment>
    );
}