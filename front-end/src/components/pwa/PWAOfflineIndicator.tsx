import { useEffect, useState, useRef } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '../../lib/utils';

export function PWAOfflineIndicator() {
  const { isOffline } = usePWAInstall();
  const [showReconnected, setShowReconnected] = useState(false);
  const prevOfflineRef = useRef(isOffline);

  useEffect(() => {
    // If was offline and now is online, show "Back online" briefly
    if (prevOfflineRef.current && !isOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    prevOfflineRef.current = isOffline;
  }, [isOffline]);

  if (!isOffline && !showReconnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 inset-x-0 mx-auto w-fit z-50 pointer-events-none px-4"
    >
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-2',
          isOffline
            ? 'bg-amber-950/80 text-amber-200 border border-amber-500/30'
            : 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/30'
        )}
      >
        {isOffline ? (
          <>
            <WifiOff className="size-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span>Offline Mode — Saved photos available</span>
          </>
        ) : (
          <>
            <Wifi className="size-3.5 text-emerald-400 shrink-0" />
            <span>Back online</span>
          </>
        )}
      </div>
    </div>
  );
}
