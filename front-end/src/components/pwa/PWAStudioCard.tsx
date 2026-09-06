import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PWAInstallButton } from './PWAInstallButton';
import { LogoMark } from '../../component/brand/LogoMark';
import { CheckCircle2, Laptop, ShieldCheck, Zap, HardDrive } from 'lucide-react';

export function PWAStudioCard() {
  const { isInstalled } = usePWAInstall();

  return (
    <Card className="overflow-hidden border-border/80 shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <LogoMark className="size-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                Desktop &amp; Mobile App
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Install Fyndr Studio as a standalone desktop app or mobile home screen shortcut.
              </CardDescription>
            </div>
          </div>

          <div>
            {isInstalled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                <CheckCircle2 className="size-3.5" />
                Installed (Standalone)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                <Laptop className="size-3.5" />
                Available to Install
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60">
            <Zap className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">1-Click Launch</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Launch directly from your dock or taskbar without opening a browser.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60">
            <HardDrive className="size-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">Offline Vault</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Access client galleries and event statistics even with spotty Wi-Fi.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60">
            <ShieldCheck className="size-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">Zero Tab Clutter</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Dedicated distraction-free window optimized for high-volume uploads.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-border/60">
          <p className="text-xs text-muted-foreground">
            {isInstalled
              ? 'You are running Fyndr Studio in standalone app mode.'
              : 'Works on macOS, Windows, ChromeOS, iOS Safari, and Android.'}
          </p>
          {!isInstalled && (
            <PWAInstallButton
              variant="button"
              label="Install Fyndr Studio"
              className="min-h-[44px] text-xs px-4"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
