import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { fetchWithAuth, API_URL } from '@/lib/api';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  url: string;
  videoId: string;
  courseId: string;
  onComplete?: () => void;
}

interface ProgressData {
  last_watched_time?: number;
  watched_percentage?: number;
  completed?: boolean;
}

const getGoogleDriveFileId = (url?: string) => {
  if (!url) return '';
  const match =
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    url.match(/id=([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : '';
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, videoId, courseId, onComplete }) => {
  const playerRef = useRef<ReactPlayer | HTMLVideoElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSavedProgress, setLastSavedProgress] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasResumed, setHasResumed] = useState(false);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const isDrive = url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('/uc?id=');
  const isS3 = url.includes('/api/s3/public/') || url.includes('.amazonaws.com');
  const fileId = getGoogleDriveFileId(url);

  // For Drive videos: always use iframe /preview (most reliable, no CORS issues)
  // For S3 videos: use native HTML5 video
  // For everything else: use ReactPlayer
  const playNatively = isS3;

  useEffect(() => {
    setIsReady(false);
    setHasResumed(false);
    setLoading(true);
  }, [url]);

  // Refs for sync access in beforeunload & unmount cleanup
  const progressRef = useRef(0);
  const timeRef = useRef(0);

  const saveProgress = useCallback(async (percentage: number, currentTime: number, isCompleted: boolean = false) => {
    try {
      if (!videoId || !courseId) return;
      await fetchWithAuth('/progress/save', {
        method: 'POST',
        body: JSON.stringify({
          videoId,
          courseId,
          watchedPercentage: percentage,
          lastWatchedTime: currentTime,
          completed: isCompleted
        })
      });
      setLastSavedProgress(percentage);
      if (isCompleted && onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  }, [videoId, courseId, onComplete]);

  // 1. Fetch saved progress on mount / videoId change
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const data = await fetchWithAuth<ProgressData>(`/progress/${videoId}`);
        if (data) {
          const savedPct = data.watched_percentage || 0;
          const savedTime = data.last_watched_time || 0;
          setLastSavedProgress(savedPct);
          setCurrentProgress(savedPct);
          progressRef.current = savedPct;
          timeRef.current = savedTime;
          if (savedTime > 0) {
            setPendingSeek(savedTime);
          }
          if (isDrive && savedPct < 95) {
            saveProgress(100, 0, true);
            setCurrentProgress(100);
            progressRef.current = 100;
          }
        } else {
          setLastSavedProgress(0);
          setCurrentProgress(0);
          progressRef.current = 0;
          timeRef.current = 0;
          setPendingSeek(null);
          if (isDrive) {
            saveProgress(100, 0, true);
            setCurrentProgress(100);
            progressRef.current = 100;
          }
        }
      } catch (err) {
        console.error('Error fetching progress:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [videoId, isDrive, saveProgress]);

  // Handle seeking when pendingSeek is loaded
  useEffect(() => {
    if (pendingSeek !== null && playerRef.current && playNatively) {
      const video = playerRef.current as HTMLVideoElement;
      if (video && video.readyState >= 1) {
        video.currentTime = pendingSeek;
        setHasResumed(true);
        setPendingSeek(null);
      }
    }
  }, [pendingSeek, playNatively]);

  // Handle native video events
  const onNativeTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    if (!video.duration) return;
    const progress = (video.currentTime / video.duration) * 100;
    const percentage = Math.floor(progress);
    setCurrentProgress(percentage);
    progressRef.current = percentage;
    timeRef.current = video.currentTime;

    if (percentage >= lastSavedProgress + 5) {
      saveProgress(percentage, video.currentTime, percentage >= 95);
    }
  };

  const onNativeLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    setDuration(video.duration);
    setIsReady(true);
    setLoading(false);
    if (!hasResumed && pendingSeek !== null) {
      video.currentTime = pendingSeek;
      setHasResumed(true);
      setPendingSeek(null);
    }
  };

  // 2. Save progress on component unmount
  useEffect(() => {
    return () => {
      const finalPct = progressRef.current;
      const finalTime = timeRef.current;
      if (videoId && courseId && finalPct > 0) {
        const body = JSON.stringify({
          videoId,
          courseId,
          watchedPercentage: finalPct,
          lastWatchedTime: finalTime,
          completed: finalPct >= 95
        });
        const token = localStorage.getItem('access_token');
        if (token) {
          fetch(`${API_URL}/progress/save`, {
            method: 'POST',
            body,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }).catch(err => console.error("Error saving progress on unmount:", err));
        }
      }
    };
  }, [videoId, courseId]);

  // Handle Tab Close / Unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!videoId || !courseId) return;
      const body = JSON.stringify({
        videoId,
        courseId,
        watchedPercentage: progressRef.current,
        lastWatchedTime: timeRef.current,
        completed: progressRef.current >= 95
      });
      const token = localStorage.getItem('access_token');
      if (token) {
        fetch(`${API_URL}/progress/save`, {
          method: 'POST',
          body,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          keepalive: true
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [videoId, courseId]);

  return (
    <div className="relative group w-full h-full min-h-[400px] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between">
      {/* Percentage Overlay removed for clean aesthetic */}

      {/* Main Video Stream Container */}
      <div className="flex-1 w-full h-full relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 z-10 bg-black/55 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}

        {playNatively ? (
          /* S3 Videos — Native HTML5 player */
          <video
            ref={playerRef as React.RefObject<HTMLVideoElement>}
            src={url}
            className="w-full h-full object-contain cursor-pointer absolute inset-0 rounded-2xl"
            controls
            autoPlay
            onTimeUpdate={onNativeTimeUpdate}
            onLoadedMetadata={onNativeLoadedMetadata}
            onEnded={() => saveProgress(100, duration, true)}
            onPause={() => {
              setIsPlaying(false);
              saveProgress(progressRef.current, timeRef.current, progressRef.current >= 95);
            }}
            onPlay={() => setIsPlaying(true)}
            controlsList="nodownload"
          />
        ) : isDrive ? (
          /* Google Drive Videos — iframe /preview (most reliable) */
          <div className="w-full h-full absolute inset-0 rounded-2xl min-h-[400px] overflow-hidden">
            <iframe
              src={`https://drive.google.com/file/d/${fileId}/preview`}
              className="w-full h-full border-0 absolute inset-0 rounded-2xl min-h-[400px]"
              allow="autoplay; encrypted-media"
              allowFullScreen
              onLoad={() => setLoading(false)}
            />
            {/* Overlay to mask and block the Google Drive pop-out/external link button (top-right corner) */}
            <div className="absolute top-0 right-0 w-20 h-14 bg-black z-30 pointer-events-auto cursor-default" title="Playback Controls" />
          </div>
        ) : (
          /* Other URLs — ReactPlayer */
          <ReactPlayer
            ref={playerRef as React.RefObject<ReactPlayer>}
            url={url}
            width="100%"
            height="100%"
            controls
            playing={isPlaying}
            onProgress={(state: { played: number; playedSeconds: number }) => {
              const pct = Math.floor(state.played * 100);
              setCurrentProgress(pct);
              progressRef.current = pct;
              timeRef.current = state.playedSeconds;
              if (pct >= lastSavedProgress + 5) saveProgress(pct, state.playedSeconds, pct >= 95);
            }}
            onReady={() => {
              setLoading(false);
              if (playerRef.current && 'getDuration' in playerRef.current) {
                 setDuration(playerRef.current.getDuration());
                 if (!hasResumed && pendingSeek !== null) {
                   playerRef.current.seekTo(pendingSeek, 'seconds');
                   setHasResumed(true);
                   setPendingSeek(null);
                 }
              }
            }}
            onEnded={() => saveProgress(100, duration, true)}
            onPause={() => saveProgress(progressRef.current, timeRef.current, progressRef.current >= 95)}
            config={{ file: { attributes: { controlsList: 'nodownload', style: { width: '100%', height: '100%', objectFit: 'contain' } } } }}
          />
        )}
      </div>

      {/* Drive Iframe Manual Sync Bar removed */}

      {/* Persistent Bottom Progress Bar (only visible for non-Drive videos) */}
      {!isDrive && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-10">
          <div className="h-full bg-white/40 transition-all duration-300" style={{ width: `${currentProgress}%` }} />
        </div>
      )}
    </div>
  );
};
