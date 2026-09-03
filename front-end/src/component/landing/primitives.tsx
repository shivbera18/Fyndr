import React, { useEffect, useRef } from "react";

/* cn() — 1-line joiner; skips clsx for a single call-site pattern. */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "brand";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  children: React.ReactNode;
};

/* shadcn cva shape (openstatus button.tsx) without the dependency:
   variant + size unions composed into fy-btn-* classes. */
export function Button({
  variant = "default",
  size = "md",
  href,
  onClick,
  type = "button",
  className,
  children,
}: ButtonProps): React.JSX.Element {
  const cls = cn(`fy-btn fy-btn-${variant} fy-btn-${size}`, className);
  if (href !== undefined) {
    return (
      <a className={cls} href={href} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

type SectionHeadProps = {
  eyebrow: string;
  title: string;
  lede?: string;
};

export function SectionHead({ eyebrow, title, lede }: SectionHeadProps) {
  return (
    <div className="fy-section-head">
      <span className="fy-eyebrow">
        <span className="fy-dot" aria-hidden="true" />
        {eyebrow}
      </span>
      <h2 className="fy-h2" style={{ marginTop: "0.875rem" }}>
        {title}
      </h2>
      {lede !== undefined && <p className="fy-lede">{lede}</p>}
    </div>
  );
}

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** stagger delay in ms, applied as --fy-d */
  delay?: number;
};

type CSSVars = React.CSSProperties & Record<"--fy-d", string>;

/* Scroll reveal via native IntersectionObserver (no animation library —
   mirrors openstatus/tailwindcss-animate usage: CSS does the work). */

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.disconnect();
          }
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={cn("fy-reveal", className)}
      style={{ "--fy-d": `${delay}ms` } as CSSVars}
    >
      {children}
    </div>
  );
}
