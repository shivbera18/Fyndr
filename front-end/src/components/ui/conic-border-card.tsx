import React, { type ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface ConicBorderCardProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  gradientClassName?: string;
  active?: boolean;
  badge?: ReactNode;
}

function ConicBorderCardInner({
  children,
  className,
  containerClassName,
  gradientClassName,
  active = true,
  badge,
}: ConicBorderCardProps) {
  if (!active) {
    return (
      <div className={cn("relative", badge ? "pt-3.5" : "", containerClassName)}>
        {badge && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30">
            {badge}
          </div>
        )}
        <div
          className={cn(
            "relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-all p-6",
            className
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative flex flex-col h-full", badge ? "pt-3.5" : "", containerClassName)}>
      {/* Floating Badge with Dedicated Headroom */}
      {badge && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30">
          {badge}
        </div>
      )}

      {/* Outer Border Container with Static Conic Gradient on touch — ponytail: infinite spin on a 400%-scale layer saturates mobile GPU during scroll. */}
      <div className="relative flex-1 rounded-2xl p-[1.5px] overflow-hidden transition-all duration-300 group shadow-sm hover:shadow-md">
        <div
          className={cn(
            "absolute inset-[-150%] motion-safe:animate-[spin_5s_linear_infinite] motion-reduce:animate-none pointer-events-none [background-image:conic-gradient(from_0deg,transparent_0_320deg,rgba(16,185,129,0.9)_340deg,rgba(59,130,246,0.9)_360deg)] opacity-90 group-hover:opacity-100 transition-opacity [@media(pointer:coarse)]:animate-none",
            gradientClassName
          )}
        />

        {/* Inner Content Card */}
        <div
          className={cn(
            "relative z-10 h-full w-full rounded-[calc(1rem-1.5px)] bg-white dark:bg-neutral-950 p-6 transition-colors",
            className
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
export const ConicBorderCard = React.memo(ConicBorderCardInner);
export default ConicBorderCard;
