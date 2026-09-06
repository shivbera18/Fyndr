import { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';
import { Button } from '../ui/button';
import { Download, Smartphone } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PWAInstallButtonProps {
  variant?: 'header' | 'button' | 'badge';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  label?: string;
}

export function PWAInstallButton({
  variant = 'button',
  size = 'default',
  className,
  label,
}: PWAInstallButtonProps) {
  const { canInstall, isInstalled, isIOS, installApp } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  if (isInstalled || !canInstall) {
    return null;
  }

  const handleClick = () => {
    if (isIOS) {
      setModalOpen(true);
    } else {
      installApp();
    }
  };

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full',
            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
            'hover:bg-emerald-500/20 active:scale-95 transition-all duration-150',
            className
          )}
          title="Install Fyndr App"
        >
          <Download className="size-3.5" />
          <span>{label || 'Install App'}</span>
        </button>
      ) : variant === 'badge' ? (
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full',
            'bg-secondary text-secondary-foreground border border-border hover:bg-accent',
            'transition-colors cursor-pointer',
            className
          )}
        >
          <Smartphone className="size-3 text-emerald-500" />
          <span>{label || 'Install App'}</span>
        </button>
      ) : (
        <Button
          variant="brand"
          size={size}
          className={cn('font-semibold rounded-xl', className)}
          onClick={handleClick}
        >
          <Download className="size-4 mr-2" />
          {label || 'Install App'}
        </Button>
      )}

      <PWAInstallModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onInstall={async () => {
          await installApp();
        }}
        isIOS={isIOS}
      />
    </>
  );
}
