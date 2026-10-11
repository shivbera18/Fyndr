import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { ShieldCheck, Mail, ExternalLink } from "lucide-react";
import { LogoMark } from "./brand/LogoMark";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const COLS: { heading: string; links: { label: React.ReactNode; to?: string; href?: string; external?: boolean }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Overview", to: "/" },
      { label: "How it works", to: "/#how-it-works" },
      { label: "Live demo", to: "/#gallery-demo" },
      { label: "Dashboard", to: "/dashboard" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Privacy & AI architecture", to: "/about" },
      { label: "Questions & privacy", to: "/#faq" },
      { label: "Create event album", to: "/dashboard" },
      { label: "Client portal access", to: "/login" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "About", to: "/about" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Create account", to: "/login" },
      { label: "Sign in", to: "/login" },
      { label: "Dashboard", to: "/dashboard" },
    ],
  },
];

export default function Footer(): React.JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full overflow-hidden border-t border-black/10 bg-[#f5f4f1] text-foreground">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-10 px-6 pb-9 pt-14 sm:px-8 lg:grid-cols-[minmax(240px,0.9fr)_minmax(0,2.7fr)] lg:gap-16 lg:px-16">
        {/* Brand column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-3 text-foreground no-underline">
              <LogoMark className="h-8 w-8" />
              <span className="font-display text-xl font-bold tracking-tight">FYNDR</span>
            </Link>
            <Badge variant="brand" className="px-2 py-0.5 text-[11px] font-semibold">
              v1.0
            </Badge>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Modern event photo delivery — built for wedding and event photographers. Guests scan a
            table QR, take a 1-second selfie, and find their photos. No app, no passwords.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-xs">
              <ShieldCheck className="h-3 w-3 text-brand" />
              Zero selfie storage
            </Badge>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              All systems operational
            </span>
          </div>
          <div className="flex flex-col gap-1.5 pt-1 text-xs text-muted-foreground sm:text-sm">
            <a
              href="mailto:shiv@fyndr.in"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <Mail className="h-3.5 w-3.5" />
              shiv@fyndr.in
            </a>
            <a
              href="https://github.com/shivbera18/Fyndr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              GitHub Repository
              <ExternalLink className="h-3 w-3" />
            </a>
            <span className="font-mono text-[11px] text-muted-foreground/80">
              Oracle Cloud + Cloudflare R2
            </span>
          </div>
          <p className="text-xs text-muted-foreground/80">© Fyndr {currentYear}. All rights reserved.</p>
        </div>

        {/* Link columns: Product / Resources / Legal / Account */}
        <nav aria-label="Footer" className="grid grid-cols-2 gap-7 sm:grid-cols-4 lg:gap-10">
          {COLS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-2.5">
              <h4 className="m-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground">
                {col.heading}
              </h4>
              {col.links.map((l) =>
                l.to ? (
                  <Link
                    key={l.label as string}
                    to={l.to}
                    className="text-[13px] leading-snug text-muted-foreground no-underline transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                ) : (
                  <a
                    key={l.label as string}
                    href={l.href}
                    target={l.external ? "_blank" : undefined}
                    rel={l.external ? "noopener noreferrer" : undefined}
                    className="text-[13px] leading-snug text-muted-foreground no-underline transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </a>
                )
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom legal strip */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2 px-6 pb-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-16">
        <span>© {currentYear} FYNDR. Crafted for wedding &amp; event photographers.</span>
        <div className="flex items-center gap-3">
          <Link to="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <span aria-hidden="true">•</span>
          <Link to="/privacy" className="transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <span aria-hidden="true">•</span>
          <Link to="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
        </div>
      </div>

      {/* Watermark band */}
      <div
        aria-hidden="true"
        className="pointer-events-none w-full select-none text-center text-[clamp(5rem,14vw,11rem)] font-extrabold leading-[0.85] tracking-tight text-black/[0.06]"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 40%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 40%)",
        }}
      >
        Fyndr
      </div>
    </footer>
  );
}
