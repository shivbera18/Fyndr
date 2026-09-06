import React from 'react';
import { ResponsiveModal } from '../ui/responsive-modal';
import { Button } from '../ui/button';
import { LogoMark } from '../../component/brand/LogoMark';
import {
  Share,
  PlusSquare,
  Zap,
  Download,
  WifiOff,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export interface PWAInstallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: () => Promise<unknown> | void;
  isIOS: boolean;
}

export function PWAInstallModal({
  open,
  onOpenChange,
  onInstall,
  isIOS,
}: PWAInstallModalProps) {
  const [installing, setInstalling] = React.useState(false);

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      await onInstall();
    } finally {
      setInstalling(false);
      onOpenChange(false);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-md p-6"
    >
      {isIOS ? (
        // iOS Safari Step-by-Step Guide
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
            <LogoMark className="h-8 w-8" />
          </div>

          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Add Fyndr to Your Home Screen
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Install Fyndr in 3 simple steps on iOS Safari to save your event photos forever.
          </p>

          <div className="mt-6 w-full space-y-3 text-left">
            <div className="flex items-start gap-3.5 rounded-xl border border-border bg-accent/40 p-3.5 transition-colors">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 font-bold text-xs">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  Tap the <span className="font-semibold text-blue-500">Share</span> button
                  <Share className="size-4 text-blue-500 inline shrink-0" />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Located in the bottom Safari toolbar (or top bar on iPad).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl border border-border bg-accent/40 p-3.5 transition-colors">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 font-bold text-xs">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  Select <span className="font-semibold text-emerald-500">Add to Home Screen</span>
                  <PlusSquare className="size-4 text-emerald-500 inline shrink-0" />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scroll down the share sheet options list.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl border border-border bg-accent/40 p-3.5 transition-colors">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 font-bold text-xs">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  Tap <span className="font-semibold text-foreground">Add</span> in the top right
                  <CheckCircle2 className="size-4 text-emerald-500 inline shrink-0" />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fyndr icon will appear directly on your home screen.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 w-full">
            <Button
              variant="brand"
              size="lg"
              className="w-full min-h-[44px] text-sm font-semibold rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Got It!
            </Button>
          </div>
        </div>
      ) : (
        // Standard Android / Desktop / Chrome Install Modal
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
            <LogoMark className="h-8 w-8" />
          </div>

          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Install Fyndr App
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enjoy instant 1-tap access, lightning-fast high-res photo downloads, and offline gallery browsing.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-accent/30 p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Zap className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground">1-Tap Instant Launch</h4>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Open straight from home screen or dock without browser tabs.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-accent/30 p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Download className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground">Direct Downloads</h4>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Save high-resolution original photos straight to your gallery.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-accent/30 p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <WifiOff className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground">Offline Photo Vault</h4>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  View saved event photos and details even without internet.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-accent/30 p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground">Zero Store Bloat</h4>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  No app store login or password; ultra lightweight (&lt;3MB).
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5 w-full">
            <Button
              variant="brand"
              size="lg"
              loading={installing}
              className="w-full min-h-[44px] text-sm font-semibold rounded-xl"
              onClick={handleInstallClick}
            >
              Install App
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full min-h-[38px] text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Maybe Later
            </Button>
          </div>
        </div>
      )}
    </ResponsiveModal>
  );
}
