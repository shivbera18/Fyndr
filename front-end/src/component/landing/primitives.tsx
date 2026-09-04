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

/* Modal — same contract as NeoModal (open/onClose/title/footer):
   Esc-close, scroll lock, backdrop-click close. */
type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
};

export function Modal({ open, onClose, title, children, footer, maxWidth = "32rem" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fy-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="fy-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="fy-modal-header">
          <span>{title}</span>
          <button className="fy-icon-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>
        <div className="fy-modal-body">{children}</div>
        {footer !== undefined && <div className="fy-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* Field — label + input/textarea + error/help (replaces NeoInput). */
type FieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  error?: string;
  help?: string;
  autoComplete?: string;
};

export function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  multiline = false,
  rows = 4,
  placeholder,
  error,
  help,
  autoComplete,
}: FieldProps) {
  const id = `fy-${name}`;
  return (
    <div className="fy-field">
      <label className="fy-label" htmlFor={id}>
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            {" *"}
          </span>
        )}
      </label>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          className="fy-textarea"
          value={value}
          rows={rows}
          placeholder={placeholder}
          required={required}
          aria-invalid={error !== undefined}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          name={name}
          className="fy-input"
          type={type}
          value={value}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={error !== undefined}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        />
      )}
      {error !== undefined && <span className="fy-error">{error}</span>}
      {help !== undefined && error === undefined && <span className="fy-help">{help}</span>}
    </div>
  );
}

/* Banner — inline status notice (replaces NeoAlert err/ok). */
export function Banner({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  return (
    <div className={cn("fy-banner", kind === "error" ? "fy-banner-error" : "fy-banner-success")} role={kind === "error" ? "alert" : "status"}>
      <span aria-hidden="true">{kind === "error" ? "⚠" : "✓"}</span>
      <span>{children}</span>
    </div>
  );
}

/* Tabs — underline tab bar. */
export type TabId = string;

export function Tabs<T extends TabId>({
  tabs,
  active,
  onChange,
}: {
  tabs: ReadonlyArray<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="fy-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={cn("fy-tab", active === t.id && "is-active")}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
