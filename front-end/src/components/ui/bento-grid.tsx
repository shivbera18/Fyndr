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
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl glass-landing p-6 transition-all duration-300 hover:shadow-[0_12px_40px_rgb(0_0_0/0.12)] hover:-translate-y-0.5",
        className
      )}
    >
      {/* Ambient background hover beam */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Visual Header / Skeleton Graphic */}
      {header && (
        <div className="relative mb-5 w-full overflow-hidden rounded-xl">
          {header}
        </div>
      )}

      {/* Card Content */}
      <div className="relative z-10 flex flex-col justify-end space-y-2">
        {icon && (
          <div className="size-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800 mb-2 transition-transform group-hover:scale-105">
            {icon}
          </div>
        )}
        {title && (
          <h3 className="font-sans font-semibold text-lg tracking-tight text-neutral-900">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-sm text-neutral-600 font-normal leading-relaxed">
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
        "relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border border-neutral-200/80 bg-neutral-50/50",
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
        "font-sans font-semibold text-lg tracking-tight text-neutral-900",
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
        "text-sm text-neutral-600 leading-relaxed",
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
        "relative w-full h-44 rounded-xl border border-neutral-200/60 bg-neutral-100/40 overflow-hidden flex items-center justify-center",
        className
      )}
    >
      <div className="absolute inset-0 bg-dot-grid opacity-50" />
      <div className="absolute -inset-x-20 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent animate-pulse" />
      {children}
    </div>
  );
}
