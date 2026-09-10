// Ported from dubinc/dub/packages/ui/src/modal.tsx
import * as React from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { cn } from "../../lib/utils";
// ponytail: vaul (~35KB) splits into its own chunk, fetched only when a
// mobile drawer actually opens.
const MobileDrawer = React.lazy(() => import("./drawer-lazy"));

export interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  desktopOnly?: boolean;
  footer?: React.ReactNode;
}
export function ResponsiveModal({
  open,
  onOpenChange,
  children,
  className,
  title,
  description,
  desktopOnly = false,
  footer,
}: ResponsiveModalProps) {
  const { isMobile } = useMediaQuery();

  if (isMobile && !desktopOnly) {
    return (
      <React.Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>}>
        <MobileDrawer
          open={open}
          onOpenChange={onOpenChange}
          className={className}
          title={title}
          description={description}
          footer={footer}
        >
          {children}
        </MobileDrawer>
      </React.Suspense>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-lg", className)}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
        {footer && (
          <div className="-mx-6 -mb-6 mt-4 border-t border-border bg-background px-6 py-4">{footer}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
