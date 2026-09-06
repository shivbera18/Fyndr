import { useLocation } from 'react-router-dom';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';
import { Button } from '../ui/button';
import { LogoMark } from '../../component/brand/LogoMark';
import { Download, X } from 'lucide-react';

export function PWAInstallBanner() {
  const location = useLocation();
  const {
    canInstall,
    isInstalled,
    isDismissed,
    isIOS,
    showGuideModal,
    setShowGuideModal,
    installApp,
    dismiss,
  } = usePWAInstall();

  // Route-aware messaging
  const pathname = location.pathname;
  let title = 'Install Fyndr App';
  let subtitle = 'Fast, convenient event photo sharing at your fingertips.';

  if (
    pathname.startsWith('/camera') ||
    pathname.startsWith('/collect') ||
    pathname.startsWith('/select')
  ) {
    title = 'Save your event photos';
    subtitle = 'Install Fyndr for 1-tap photo access and faster downloads anytime.';
  } else if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/create-event') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/account')
  ) {
    title = 'Install Fyndr Studio';
    subtitle = 'Add to your desktop or home screen for fast event management.';
  }

  // Do not render if installed, dismissed, or unsupported
  if (isInstalled || isDismissed || !canInstall) {
    return null;
  }

  return (
    <>
      <aside
        aria-label="Install application"
        className="fixed bottom-16 sm:bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 z-40 max-w-sm sm:w-96 rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <LogoMark className="h-6 w-6" />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-sm font-semibold text-foreground tracking-tight truncate">
              {title}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
              {subtitle}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="brand"
                size="sm"
                className="min-h-[44px] px-3.5 text-xs font-semibold rounded-lg"
                onClick={() => {
                  if (isIOS) {
                    setShowGuideModal(true);
                  } else {
                    installApp();
                  }
                }}
              >
                <Download className="size-3.5 mr-1.5" />
                Install
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] px-3 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowGuideModal(true)}
              >
                Learn More
              </Button>
            </div>
          </div>

          <button
            type="button"
            aria-label="Dismiss banner"
            onClick={() => dismiss(7)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>
      </aside>

      <PWAInstallModal
        open={showGuideModal}
        onOpenChange={setShowGuideModal}
        onInstall={async () => {
          await installApp();
        }}
        isIOS={isIOS}
      />
    </>
  );
}
