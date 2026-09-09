import React, { type ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface BentoGridProps {
  className?: string;
  children: ReactNode;
}

export const BentoGrid = React.memo(function BentoGrid({ className, children }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 w-full",
        className
      )}
    >
      {children}
    </div>
  );
});

export interface BentoCardProps {
  className?: string;
  header?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
}

export const BentoCard = React.memo(function BentoCard({
  className,
  header,
  icon,
  title,
  description,
  children,
  onClick,
}: BentoCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-6 backdrop-blur-md transition-all duration-300 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-lg dark:hover:shadow-neutral-900/50",
        className
      )}
    >
      {/* Ambient background hover beam */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Visual Header / Skeleton Graphic */}
      {header && (
        <div className="relative mb-5 w-full overflow-hidden rounded-xl">
          {header}
        </div>
      )}

      {/* Card Content */}
      <div className="relative z-10 flex flex-col justify-end space-y-2">
        {icon && (
          <div className="size-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200 mb-2 transition-transform group-hover:scale-105">
            {icon}
          </div>
        )}
        {title && (
          <h3 className="font-sans font-semibold text-lg tracking-tight text-neutral-900 dark:text-neutral-100">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 font-normal leading-relaxed">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  );
});

export function BentoHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/50",
        className
      )}
    >
      {/* Dot Grid Pattern */}
      <div className="absolute inset-0 bg-dot-grid opacity-70 pointer-events-none" />
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export function BentoTitle({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <h3
      className={cn(
        "font-sans font-semibold text-lg tracking-tight text-neutral-900 dark:text-neutral-100",
        className
      )}
    >
      {children}
    </h3>
  );
}

export function BentoDescription({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed",
        className
      )}
    >
      {children}
    </p>
  );
}

export function BentoSkeleton({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative w-full h-44 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-100/40 dark:bg-neutral-900/40 overflow-hidden flex items-center justify-center",
        className
      )}
    >
      <div className="absolute inset-0 bg-dot-grid opacity-50" />
      <div className="absolute -inset-x-20 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent animate-pulse" />
      {children}
    </div>
  );
}
