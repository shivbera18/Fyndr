import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./navbar/Header";
import Footer from "./Footer";
import { Button } from "../components/ui/button";
import { Callout, PageHero, PageShell, StepGuide } from "../components/ui/page-kit";
import { Check, Copy, ShieldCheck } from "lucide-react";

const pillars = [
  { title: "Lightning fast", desc: "Photos matched in under 2 seconds." },
  { title: "Zero app install", desc: "Runs directly in mobile browsers." },
  { title: "Studio branded", desc: "Grow your photography business." },
  { title: "Full resolution", desc: "Original DSLR quality downloads." },
];

const SETUP_STEPS = [
  {
    title: "Upload the gallery",
    body: "Drop the full shoot — originals stay in your linked Drive, 640px previews serve the gallery.",
  },
  {
    title: "Share the QR",
    body: "Print the table standee or share the event link. Guests open it in their browser, no app.",
  },
  {
    title: "Guests find themselves",
    body: "One selfie matches every photo they're in within two seconds. Selfies are discarded immediately.",
  },
];

const SNIPPET = "Scan the QR at your table → take a selfie → get your photos.";

const About = (): React.JSX.Element => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const copySnippet = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <PageShell header={<Header />} footer={<Footer />}>
      <PageHero
        kicker="About Fyndr"
        title="Event photo sharing without the friction"
        lead="We're on a mission to eliminate the friction of event photo sharing. Fyndr connects event guests to their memories in seconds — no apps, no hunting through strangers' pictures."
      />

      {/* Problem vs Solution */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            The problem
          </p>
          <h2 className="mt-2 text-xl font-bold">The 5,000 Photo Dilemma</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Event photographers take thousands of stunning photos, but delivering them is
            painful. Shared cloud links overwhelm guests, forcing them to hunt through
            hundreds of strangers&apos; pictures. Most guests never see their best moments.
          </p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm ring-1 ring-primary/20 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            The solution
          </p>
          <h2 className="mt-2 text-xl font-bold">Scan QR → Instant Personal Gallery</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Guests scan a QR code at the table, take a quick selfie, and get every photo
            they appear in within two seconds. High-resolution downloads, complete privacy,
            zero apps.
          </p>
        </div>
      </div>

      {/* Setup steps */}
      <div className="mt-10 space-y-4">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          How it works
        </p>
        <StepGuide steps={SETUP_STEPS} />
      </div>

      {/* Privacy Promise */}
      <Callout variant="success" title="Our Strict Privacy Promise" className="mt-10">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          Guest selfies are processed strictly in real-time to find photos and are
          immediately discarded. We never sell, store, or train on guest face data.
        </span>
      </Callout>

      {/* 4 Core Pillars */}
      <div className="mt-10 space-y-4">
        <p className="block text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Built on four core pillars
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((item) => (
            <div key={item.title} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <p className="font-semibold text-sm text-foreground">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Share snippet */}
      <div className="mt-10 space-y-3">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Tell your guests
        </p>
        <div className="flex flex-col items-stretch gap-2 rounded-xl bg-[#141210] p-4 text-[#f7f5f1] sm:flex-row sm:items-center">
          <code className="flex-1 font-mono text-sm">{SNIPPET}</code>
          <Button
            type="button"
            variant="secondary"
            onClick={copySnippet}
            className="min-h-[44px] shrink-0"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" /> Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Call to action */}
      <div className="py-10 text-center">
        <Button size="lg" onClick={() => navigate("/login")} className="min-h-[48px] px-8 text-base">
          Start Creating Events Free →
        </Button>
      </div>
    </PageShell>
  );
};

export default About;
