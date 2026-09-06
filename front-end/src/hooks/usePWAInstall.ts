import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

const DISMISS_KEY = 'fyndr_pwa_dismissed_until';

// Module-level cache so we never miss an early beforeinstallprompt event
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(e: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((listener) => listener(globalDeferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    promptListeners.forEach((listener) => listener(null));
  });
}

function checkIsInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isStandalone =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)')?.matches;
    const nav = navigator as NavigatorWithStandalone;
    const isIOSStandalone = nav?.standalone === true;
    const isAndroidApp =
      typeof document !== 'undefined' &&
      typeof document.referrer === 'string' &&
      document.referrer.includes('android-app://');
    return Boolean(isStandalone || isIOSStandalone || isAndroidApp);
  } catch {
    return false;
  }
}

function checkIsIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isAppleDevice = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isAppleDevice || isIPadOS;
}

function checkIsAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

function checkIsDismissed(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const until = localStorage.getItem(DISMISS_KEY);
    if (!until) return false;
    const timestamp = parseInt(until, 10);
    return !isNaN(timestamp) && Date.now() < timestamp;
  } catch {
    return false;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(checkIsInstalled);
  const [isDismissed, setIsDismissed] = useState<boolean>(checkIsDismissed);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  const isIOS = checkIsIOS();
  const isAndroid = checkIsAndroid();
  const isDesktop = !isIOS && !isAndroid;

  // Can install if not already installed, not dismissed, and either has native prompt or iOS manual flow
  const canInstall = !isInstalled && (Boolean(deferredPrompt) || isIOS);

  useEffect(() => {
    // 1. Sync prompt listener
    const onPromptChange = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
      if (!prompt) {
        setIsInstalled(checkIsInstalled());
      }
    };
    promptListeners.add(onPromptChange);

    // 2. Installed listener
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowGuideModal(false);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // 3. Online/offline listener
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 4. Standalone media query listener
    const mediaMatcher =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)')
        : null;
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    if (mediaMatcher?.addEventListener) {
      mediaMatcher.addEventListener('change', handleMediaChange);
    } else if (mediaMatcher?.addListener) {
      mediaMatcher.addListener(handleMediaChange);
    }

    return () => {
      promptListeners.delete(onPromptChange);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (mediaMatcher?.removeEventListener) {
        mediaMatcher.removeEventListener('change', handleMediaChange);
      } else if (mediaMatcher?.removeListener) {
        mediaMatcher.removeListener(handleMediaChange);
      }
    };
  }, []);

  const dismiss = useCallback((durationDays = 7) => {
    try {
      const until = Date.now() + durationDays * 24 * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_KEY, until.toString());
      setIsDismissed(true);
    } catch {
      setIsDismissed(true);
    }
  }, []);

  const installApp = useCallback(async (): Promise<'accepted' | 'dismissed' | 'manual-ios'> => {
    if (isIOS) {
      setShowGuideModal(true);
      return 'manual-ios';
    }

    if (!deferredPrompt) {
      setShowGuideModal(true);
      return 'dismissed';
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        globalDeferredPrompt = null;
        setIsInstalled(true);
        setShowGuideModal(false);
      } else {
        dismiss(3);
      }
      return choice.outcome;
    } catch (err) {
      console.warn('[PWA] Native install prompt error:', err);
      setShowGuideModal(true);
      return 'dismissed';
    }
  }, [deferredPrompt, isIOS, dismiss]);

  return {
    canInstall,
    isInstalled,
    isIOS,
    isAndroid,
    isDesktop,
    isOffline,
    isDismissed,
    showGuideModal,
    setShowGuideModal,
    installApp,
    dismiss,
  };
}
