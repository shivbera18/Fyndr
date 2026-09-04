import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/badge";

export default function Footer(): React.JSX.Element {
  return (
    <footer className="w-full border-t border-zinc-800 bg-zinc-950 text-zinc-300">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <Link to="/" className="inline-flex items-center gap-2.5 no-underline text-white">
            <span
              aria-hidden="true"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-brand text-brand-ink font-bold text-sm"
            >
              ✦
            </span>
            <span className="font-display font-bold text-lg tracking-tight text-white">
              FYNDR
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-6 text-sm font-medium" aria-label="Footer">
            <Link to="/" className="transition-colors hover:text-white">
              Overview
            </Link>
            <Link to="/about" className="transition-colors hover:text-white">
              How it works
            </Link>
            <Link to="/dashboard" className="transition-colors hover:text-white">
              Dashboard
            </Link>
            <Link to="/login" className="transition-colors hover:text-white">
              Sign in
            </Link>
          </nav>

          <span className="text-xs text-zinc-500 font-mono">
            Contact: shiv@fyndr.in
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-6 border-t border-zinc-800/60 text-xs text-zinc-400">
          <p className="max-w-xl">
            Built for photographers — zero friction. Guests scan QR → selfie →
            instant matches. Selfies are never stored.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="brand">Free to start</Badge>
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700">
              Private
            </Badge>
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700">
              No app
            </Badge>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-6 border-t border-zinc-800/60 text-xs text-zinc-500">
          <span>© {new Date().getFullYear()} FYNDR — Crafted by Shiv Bera</span>
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-zinc-300 transition-colors">
              Privacy Policy
            </Link>
            <span aria-hidden="true">•</span>
            <span>v1 • Fast &amp; Private</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
