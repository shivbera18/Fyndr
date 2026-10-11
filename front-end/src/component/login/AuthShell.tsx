import * as React from "react";
import { Link } from "react-router-dom";
import { Camera, QrCode, ScanFace } from "lucide-react";
import { LogoMark } from "../brand/LogoMark";
import "../../components/ui/auth-split.css";

const HERO_SRC = `${process.env.PUBLIC_URL}/images/wedding.jpg`;

const POINTS = [
  { icon: Camera, text: "Upload the full gallery — originals stay in your Drive" },
  { icon: QrCode, text: "Guests scan a QR at the table, no app needed" },
  { icon: ScanFace, text: "One selfie finds every photo they're in" },
];

export interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

/* Split-screen auth shell: brand panel (hero-photo backdrop) + form column.
   Presentational only — all auth logic stays in the consuming page. */
export function AuthShell({ eyebrow, title, description, children }: AuthShellProps): React.JSX.Element {
  return (
    <div className="rk-auth">
      <aside className="rk-auth-panel relative overflow-hidden">
        <img
          src={HERO_SRC}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" aria-hidden />
        <div className="relative flex h-full flex-col justify-between gap-10">
          <Link to="/" className="inline-flex items-center gap-2.5 text-white no-underline">
            <LogoMark className="h-[32px] w-[32px]" />
            <span className="font-display text-xl font-bold tracking-tight">FYNDR</span>
          </Link>
          <div className="space-y-6">
            <h2 className="text-4xl">Every guest finds their photos in seconds.</h2>
            <ul className="space-y-3">
              {POINTS.map((p) => (
                <li key={p.text} className="flex items-center gap-3 text-sm text-white/85">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                    <p.icon className="h-4 w-4" />
                  </span>
                  {p.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="font-mono text-xs text-white/60">
            © {new Date().getFullYear()} FYNDR • Fast &amp; Private
          </p>
        </div>
      </aside>

      <div className="rk-auth-form">
        <div className="rk-auth-card">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2.5 text-foreground no-underline lg:hidden"
          >
            <LogoMark className="h-[32px] w-[32px]" />
            <span className="font-display text-xl font-bold tracking-tight">FYNDR</span>
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-6">{children}</div>
          <p className="mt-6 font-mono text-xs text-muted-foreground lg:hidden">
            © {new Date().getFullYear()} FYNDR • Fast &amp; Private
          </p>
        </div>
      </div>
    </div>
  );
}
