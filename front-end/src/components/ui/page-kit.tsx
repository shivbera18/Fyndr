import * as React from "react";
import { cn } from "../../lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";

/* Shared revamp kit: RagKno editorial voice, warm paper wash, hairline borders.
   Pure presentational — no data fetching, no routing. Consumers pass app chrome
   (<Header/>, <Footer/>) via slots so ui/ never imports from component/. */

// ---------- PageShell ----------

export interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  maxWidth?: string;
}

export function PageShell({
  header,
  footer,
  showHeader = true,
  showFooter = true,
  maxWidth = "max-w-5xl",
  className,
  children,
  ...props
}: PageShellProps): React.JSX.Element {
  return (
    <div
      className={cn("min-h-screen flex flex-col bg-[#f7f5f1] text-foreground", className)}
      {...props}
    >
      {showHeader && header}
      <main className={cn("flex-1 w-full mx-auto px-4 sm:px-6 py-10 sm:py-14", maxWidth)}>
        {children}
      </main>
      {showFooter && footer}
    </div>
  );
}

// ---------- PageHero ----------

export interface PageHeroProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  align?: "center" | "left";
}

export function PageHero({
  kicker,
  title,
  lead,
  actions,
  align = "center",
  className,
  ...props
}: PageHeroProps): React.JSX.Element {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "space-y-4 max-w-2xl",
        centered ? "mx-auto text-center" : "text-left",
        className
      )}
      {...props}
    >
      {kicker && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {kicker}
        </p>
      )}
      <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
        {title}
      </h1>
      {lead && (
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed text-pretty">
          {lead}
        </p>
      )}
      {actions && (
        <div className={cn("flex flex-wrap gap-3 pt-1", centered && "justify-center")}>
          {actions}
        </div>
      )}
    </div>
  );
}

// ---------- SectionCard ----------

export interface SectionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
}

export function SectionCard({
  title,
  description,
  className,
  children,
  ...props
}: SectionCardProps): React.JSX.Element {
  return (
    <Card className={cn("border-black/10 bg-white shadow-sm", className)} {...props}>
      {(title || description) && (
        <CardHeader className="pb-3">
          {title && <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={title || description ? "pt-0" : "p-6"}>{children}</CardContent>
    </Card>
  );
}

// ---------- Callout ----------

type CalloutVariant = "info" | "success" | "warn" | "error";

const calloutStyles: Record<CalloutVariant, string> = {
  info: "border-l-blue-500 bg-blue-50/60 dark:bg-blue-950/20",
  success: "border-l-green-600 bg-green-50 dark:bg-green-950/20",
  warn: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20",
  error: "border-l-destructive bg-destructive/5",
};

export interface CalloutProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: CalloutVariant;
  title?: React.ReactNode;
}

export function Callout({
  variant = "info",
  title,
  className,
  children,
  ...props
}: CalloutProps): React.JSX.Element {
  return (
    <div
      role="note"
      className={cn(
        "rounded-r-lg border border-l-[3px] border-black/10 px-4 py-3 text-sm leading-relaxed",
        calloutStyles[variant],
        className
      )}
      {...props}
    >
      {title && <p className="font-semibold mb-0.5">{title}</p>}
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}

// ---------- StepGuide ----------

export interface StepGuideStep {
  title: React.ReactNode;
  body?: React.ReactNode;
}

export function StepGuide({
  steps,
  className,
  ...props
}: React.HTMLAttributes<HTMLOListElement> & { steps: StepGuideStep[] }): React.JSX.Element {
  return (
    <ol className={cn("divide-y divide-black/10 border-y border-black/10", className)} {...props}>
      {steps.map((step, i) => (
        <li key={i} className="flex gap-4 py-4 first:pt-4">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/15 bg-white text-xs font-bold tabular-nums"
          >
            {i + 1}
          </span>
          <div className="space-y-1 min-w-0">
            <p className="font-semibold text-sm sm:text-base">{step.title}</p>
            {step.body && (
              <div className="text-sm text-muted-foreground leading-relaxed">{step.body}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------- EmptyState ----------

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  actions?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  body,
  actions,
  className,
  ...props
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className={cn("mx-auto max-w-md text-center space-y-3 py-12", className)} {...props}>
      {icon && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white text-muted-foreground">
          {icon}
        </div>
      )}
      <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
      {body && <div className="text-sm sm:text-base text-muted-foreground leading-relaxed">{body}</div>}
      {actions && <div className="flex flex-wrap justify-center gap-3 pt-2">{actions}</div>}
    </div>
  );
}

// ---------- StatusBadge ----------

type StatusKind = "ok" | "pending" | "error" | "info";

const statusVariant: Record<StatusKind, "success" | "secondary" | "destructive" | "outline"> = {
  ok: "success",
  pending: "secondary",
  error: "destructive",
  info: "outline",
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: StatusKind;
  dot?: boolean;
}

const dotColor: Record<StatusKind, string> = {
  ok: "bg-green-600",
  pending: "bg-amber-500",
  error: "bg-destructive",
  info: "bg-blue-500",
};

export function StatusBadge({
  status = "info",
  dot = true,
  className,
  children,
  ...props
}: StatusBadgeProps): React.JSX.Element {
  return (
    <Badge variant={statusVariant[status]} className={cn("gap-1.5 min-h-[24px]", className)} {...props}>
      {dot && <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dotColor[status])} />}
      {children}
    </Badge>
  );
}

// ---------- UploadProgressBar ----------

export interface UploadProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  stage?: React.ReactNode;
  barClassName?: string;
}

export function UploadProgressBar({
  value,
  stage,
  barClassName,
  className,
  ...props
}: UploadProgressBarProps): React.JSX.Element {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      {stage && <p className="text-xs font-medium text-muted-foreground">{stage}</p>}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        className="h-[5px] w-full overflow-hidden rounded-full bg-black/10"
      >
        <div
          className={cn("rk-progress-fill h-full rounded-full bg-primary transition-[width]", barClassName)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
