import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { ShieldCheck, Mail, ExternalLink } from "lucide-react";
import { LogoMark } from "./brand/LogoMark";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function Footer(): React.JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border bg-background text-foreground transition-colors">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Top bar: Brand pill & Quick links */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-4 sm:p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm shadow-xs">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-2.5 no-underline text-foreground">
              <LogoMark className="h-[34px] w-[34px]" />
              <span className="font-display font-bold text-lg tracking-tight text-foreground">
                FYNDR
              </span>
            </Link>
            <Badge variant="brand" className="text-[11px] font-semibold px-2 py-0.5">
              v1.0
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm text-muted-foreground font-medium">
            <Link
              to="/"
              className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              Overview
            </Link>
            <Link
              to="/about"
              className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              How it works
            </Link>
            <a
              href="#pricing"
              className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              Pricing
            </a>
            <Link
              to="/dashboard"
              className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              Sign in
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/70 bg-background/80 text-xs text-muted-foreground font-medium w-fit">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span>All systems operational</span>
          </div>
        </div>

        {/* Middle: 3-column informational breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-bold text-foreground">Modern Event Photo Delivery</h4>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-md leading-relaxed">
              Built specifically for wedding and event photographers. Guests scan a table QR code, take a 1-second selfie, and receive their personal gallery instantly. 100% private ephemeral memory processing.
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Badge variant="secondary" className="gap-1 text-xs">
                <ShieldCheck className="h-3 w-3 text-brand" />
                Zero selfie storage
              </Badge>
              <Badge variant="outline" className="text-xs">
                Mobile web native
              </Badge>
              <Badge variant="outline" className="text-xs">
                Full DSLR resolution
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-foreground">Photography Studios</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link to="/dashboard" className="hover:text-foreground transition-colors">
                  Create event album
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-foreground transition-colors">
                  Privacy &amp; AI architecture
                </Link>
              </li>
              <li>
                <a href="#pricing" className="hover:text-foreground transition-colors">
                  Studio pricing tiers
                </a>
              </li>
              <li>
                <Link to="/login" className="hover:text-foreground transition-colors">
                  Client portal access
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-foreground">Contact &amp; Open Source</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <a
                  href="mailto:shiv@fyndr.in"
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  shiv@fyndr.in
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/shivbera18/Fyndr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <GithubIcon className="h-3.5 w-3.5" />
                  GitHub Repository
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <span className="text-xs text-muted-foreground/80 font-mono">
                  Oracle Cloud + Cloudflare R2
                </span>
              </li>
            </ul>
          </div>
        </div>

        <Separator />

        {/* Bottom copyright and legal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-muted-foreground">
          <span>
            © {currentYear} FYNDR. Crafted with precision for wedding &amp; event photographers.
          </span>
          <div className="flex items-center gap-3">
            <Link to="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <span aria-hidden="true">•</span>
            <Link to="/" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span aria-hidden="true">•</span>
            <a
              href="https://github.com/shivbera18/Fyndr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
