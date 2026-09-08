import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../../components/ui/accordion";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import { BeamLines } from "../../components/ui/beam-lines";
import type { BeamSource, BeamHub } from "../../components/ui/beam-lines";
import { ConicBorderCard } from "../../components/ui/conic-border-card";
import {
  BentoGrid,
  BentoCard,
  BentoHeader,
} from "../../components/ui/bento-grid";
import {
  ArrowRight,
  Check,
  Lock,
  Sparkles,
  X,
  Camera,
  Zap,
  Users,
  ShieldCheck,
  TrendingUp,
  Building2,
  PartyPopper,
  Layers,
  Star,
  Smile,
  UserCheck,
  ScanFace,
} from "lucide-react";
import { cn } from "../../lib/utils";

/* ------------------------------------------------------------------ */
/* Data Constants                                                     */
/* ------------------------------------------------------------------ */

const TICKS = ["No app download", "100% private", "High-res downloads"];

const STUDIOS = [
  "Studio Lumière",
  "Aura Weddings",
  "Vivid Stories",
  "Knot & Lens",
  "Epic Moments",
  "The Wedding Collective",
];

const STEPS = [
  { id: "upload", label: "1. Upload album" },
  { id: "selfie", label: "2. Guest selfie" },
  { id: "match", label: "3. Instant matches" },
] as const;

type DemoStep = (typeof STEPS)[number]["id"];

const STATS = [
  {
    value: "2.1s",
    label: "Average Match Time",
    desc: "Lightning fast facial matching across 10,000+ event photos",
    icon: Zap,
  },
  {
    value: "99.4%",
    label: "Matching Precision",
    desc: "Pinpoint facial recognition even in low-light and candid shots",
    icon: ShieldCheck,
  },
  {
    value: "0 Apps",
    label: "Zero Friction",
    desc: "Runs 100% in mobile Safari, Chrome & Firefox without downloads",
    icon: Users,
  },
  {
    value: "100%",
    label: "Privacy Guaranteed",
    desc: "Selfies processed in RAM and auto-deleted within seconds",
    icon: Lock,
  },
];

const HOW_IT_WORKS = [
  {
    badge: "Step 01",
    title: "Upload & generate QR",
    body: "Upload your DSLR or mirrorless photos to a new event album. Fyndr creates a print-ready QR code with custom event PIN instantly.",
    note: "All photos processed in background",
    icon: Camera,
  },
  {
    badge: "Step 02",
    title: "Guests scan & snap",
    body: "Guests point their phone at the table QR code. No app install, no account required. They snap a quick selfie in their browser.",
    note: "Selfie deleted immediately after match",
    icon: UserCheck,
  },
  {
    badge: "Step 03",
    title: "Personal gallery delivers",
    body: "Only photos containing the guest appear in under 2 seconds. High-resolution originals are immediately ready to download and share.",
    note: "Instant download, zero hunting",
    icon: Zap,
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Photo Delivery",
    oldWay: "Dumping 5,000 photos into a Google Drive or Dropbox folder link",
    fyndrWay: "Instant table QR standee with personal face-matched delivery",
  },
  {
    feature: "Guest Experience",
    oldWay: "Scrolling through thousands of strangers' photos looking for themselves",
    fyndrWay: "1-second browser selfie finds only their photos instantly",
  },
  {
    feature: "Loading & Speed",
    oldWay: "Waiting minutes for heavy folder thumbnails to buffer on mobile",
    fyndrWay: "Instant personalized gallery ready in under 2 seconds",
  },
  {
    feature: "Host Support",
    oldWay: "Frustrated guests constantly text the couple asking for photos",
    fyndrWay: "Guests download and post to Instagram while still at the venue",
  },
  {
    feature: "Photographer Growth",
    oldWay: "Zero studio branding — hours spent manually emailing individual shots",
    fyndrWay: "Studio name, WhatsApp booking link & branding on every guest's phone",
  },
];

const USE_CASES = [
  {
    tag: "Weddings",
    title: "Wedding receptions & sangeets",
    body: "Delight 500+ wedding guests with instant access to their photos while they're still dressed up and celebrating.",
    icon: Sparkles,
  },
  {
    tag: "Corporate",
    title: "Conferences & galas",
    body: "Deliver executive portraits and event candids to attendees with zero manual tagging or sorting.",
    icon: Building2,
  },
  {
    tag: "Private",
    title: "Birthday & anniversary parties",
    body: "Give friends and family their own personalized memories album in seconds.",
    icon: PartyPopper,
  },
  {
    tag: "Sports",
    title: "Marathons & sports meets",
    body: "Match thousands of runners and athletes to their race day photos by face without bib number errors.",
    icon: TrendingUp,
  },
];

const QUOTES = [
  {
    quote:
      "Guests were blown away at our last wedding. Within 10 minutes of placing the QR cards, over 200 guests had found and shared their photos.",
    author: "Rohan & Prianka",
    role: "Aura Wedding Cinema, Mumbai",
  },
  {
    quote:
      "We stopped getting endless WhatsApp messages asking for specific event photos. Fyndr paid for itself on day one just in saved staff time.",
    author: "Kavita S.",
    role: "Vivid Stories Studio, Delhi",
  },
  {
    quote:
      "The face recognition is shockingly fast and accurate, even with varying lighting and angles. It's the standard for our events now.",
    author: "Arjun Mehta",
    role: "Lead Photographer, Studio Lumière",
  },
];

const FAQS = [
  {
    q: "Do event guests need to download an app or create an account?",
    a: "No! Guests simply open their default phone camera, scan the event QR code, enter the 6-digit event PIN, and take a quick selfie. Everything runs instantly in their mobile browser with 0 app installs.",
  },
  {
    q: "Is guest selfie data private and secure?",
    a: "Yes, 100%. The guest selfie is used in real-time only to calculate facial matching for searching the current event. The selfie file is processed in memory and deleted immediately within 60 seconds. We never store or sell guest selfies.",
  },
  {
    q: "How fast is the face recognition search?",
    a: "Search typically completes in 1 to 2 seconds for albums with up to 10,000 photos, powered by high-speed facial indexing.",
  },
  {
    q: "Can guests download original full-resolution photos?",
    a: "Yes! Guests can download the original, full-quality image uploaded by the photographer directly to their phone camera roll, preserving full detail and EXIF metadata.",
  },
  {
    q: "Can I customize the guest portal with my photography studio branding?",
    a: "Yes! You can set your studio name, phone/WhatsApp number, address, and special booking offers. Guests see your branding on their gallery page and can message you directly.",
  },
  {
    q: "What if a photo contains multiple people or was taken in low light?",
    a: "Our neural face detection accurately detects multiple faces in group photos down to small face sizes, even in dimly lit ballroom environments.",
  },
  {
    q: "Can multiple photographers upload to the same event simultaneously?",
    a: "Yes. Multiple team members can upload concurrently to the same event dashboard. All photos are automatically queued, deduplicated by hash, and processed in real time.",
  },
  {
    q: "How do I print table cards and standees for the event venue?",
    a: "Fyndr automatically generates ready-to-print vector QR codes and PIN tent cards from your event dashboard. You can download print-ready PDFs sized for standard table cards.",
  },
];

const PRICING_TIERS = [
  {
    name: "Free Forever",
    price: "$0",
    inrPrice: "₹0",
    period: "free for lifetime",
    description: "Perfect for testing Fyndr or small private gatherings.",
    highlighted: false,
    badge: "Starter",
    compareNote: "Matches FotoOwl Rider free tier",
    features: [
      "1 active event gallery",
      "Up to 1,000 photos per event",
      "Instant QR code & PIN generator",
      "Lightning AI face search",
      "Full original resolution downloads",
      "100% ephemeral privacy (RAM only)",
      "Community support",
    ],
    cta: "Start free tier",
    variant: "outline" as const,
  },
  {
    name: "Studio Pro",
    price: "$19",
    inrPrice: "₹999",
    period: "per month (billed annually)",
    description: "Built for busy wedding and event photography studios.",
    highlighted: true,
    badge: "Most Popular",
    compareNote: "20% less than FotoOwl Biker ($24 / ₹1,250)",
    features: [
      "Unlimited active events",
      "Up to 25,000 photos per event",
      "Custom studio branding & WhatsApp lead link",
      "Live analytics & guest contact capture",
      "Instant multi-photographer upload",
      "Priority AI queue indexing",
      "Dedicated gallery support",
    ],
    cta: "Start Pro trial",
    variant: "default" as const,
  },
  {
    name: "Agency & Scale",
    price: "$25",
    inrPrice: "₹1,699",
    period: "per month (billed annually)",
    description: "For large scale festival, sports, and convention coverage.",
    highlighted: false,
    badge: "Enterprise",
    compareNote: "20% less than FotoOwl Pilot ($31 / ₹2,083)",
    features: [
      "50,000+ photos per single event",
      "Dedicated GPU indexing cluster",
      "White-label custom domain (photos.yourstudio.com)",
      "Sponsor logo placements & banner ads",
      "Custom SLA & on-site technical support",
      "Direct API access & custom integrations",
      "Unlimited sub-event folders",
    ],
    cta: "Contact team",
    variant: "outline" as const,
  },
];
/* Camera-to-cloud beams: three shooters merge into one live gallery */
const CAMERA_SOURCES: [BeamSource, BeamSource, BeamSource] = [
  {
    icon: <Camera className="size-5" />,
    boxClass: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
    title: "Shooter A · Canon",
    sub: "Own FTP login · auto-transfer ON",
  },
  {
    icon: <Camera className="size-5" />,
    boxClass: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    title: "Shooter B · Nikon",
    sub: "Own FTP login · auto upload ON",
  },
  {
    icon: <Camera className="size-5" />,
    boxClass: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
    title: "Shooter C · Sony",
    sub: "Own FTP login · auto FTP ON",
  },
];

const CAMERA_HUB: BeamHub = {
  icon: <Zap className="size-4" />,
  title: "Live event gallery",
  sub: "New shots land in ~10s",
  pill: "JPEG-only · Port 21 · No laptop",
};

/* ------------------------------------------------------------------ */
/* Interactive Face Matcher Simulation Component                      */
/* ------------------------------------------------------------------ */

function InteractiveFaceMatcher() {
  const [matching, setMatching] = useState(false);
  const [matchCount, setMatchCount] = useState(14);

  const triggerMatch = () => {
    setMatching(true);
    setTimeout(() => {
      setMatching(false);
      setMatchCount((prev) => (prev === 14 ? 22 : 14));
    }, 700);
  };

  return (
    <div className="flex flex-col h-full justify-between space-y-4">
      <div className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 p-4 overflow-hidden">
        {/* Face detection target canvas */}
        <div className="relative h-44 w-full rounded-lg bg-neutral-950/80 overflow-hidden flex items-center justify-center border border-neutral-800">
          <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />

          {/* Bounding box simulation */}
          <div className="relative size-32 border-2 border-emerald-400/80 rounded-xl p-2.5 flex flex-col justify-between shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
            <div className="flex justify-between items-start text-[10px] font-mono text-emerald-400">
              <span>{matching ? "Scanning..." : "Face Detected"}</span>
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <div className="flex flex-col items-center justify-center">
              <ScanFace className="size-12 text-emerald-400/80 animate-pulse" />
            </div>

            <div className="flex justify-between items-end text-[10px] font-mono text-neutral-300">
              <span>Status</span>
              <span className="text-emerald-400 font-bold">{matchCount} Photos Found</span>
            </div>

            {/* Corner crosshairs */}
            <div className="absolute -top-1 -left-1 size-2 border-t-2 border-l-2 border-white" />
            <div className="absolute -top-1 -right-1 size-2 border-t-2 border-r-2 border-white" />
            <div className="absolute -bottom-1 -left-1 size-2 border-b-2 border-l-2 border-white" />
            <div className="absolute -bottom-1 -right-1 size-2 border-b-2 border-r-2 border-white" />
          </div>

          {/* Scanning sweep line */}
          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-[pulse_2s_ease-in-out_infinite]" />
        </div>

        {/* User-friendly telemetry ticker */}
        <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-neutral-600 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-800/80 pt-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3 text-emerald-500" />
            <span>Search speed: &lt; 1 second</span>
          </div>
          <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {matchCount} Matches Delivered
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Instant Face Matching
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Finds only your photos across the entire album
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={triggerMatch}
          className="text-xs rounded-full min-h-[44px] px-4 border-neutral-300 dark:border-neutral-700"
        >
          {matching ? "Scanning..." : "Simulate"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Interactive Demo Card                                              */
/* ------------------------------------------------------------------ */

function DemoPanel({ step }: { step: DemoStep }) {
  if (step === "upload") {
    return (
      <div className="space-y-3 p-4 bg-neutral-100/70 dark:bg-neutral-900/70 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-foreground">Grand Wedding Reception</span>
          <Badge variant="secondary" className="text-xs font-mono">3,420 photos</Badge>
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-[85%] animate-pulse" />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>Uploading &amp; indexing photos…</span>
            <span>85% complete</span>
          </div>
        </div>
      </div>
    );
  }

  if (step === "selfie") {
    return (
      <div className="space-y-3 p-4 bg-neutral-100/70 dark:bg-neutral-900/70 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Smile className="size-5" />
          </div>
          <div>
            <span className="font-semibold text-sm text-foreground block">Quick guest selfie taken</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 font-mono">
              <Check className="size-3.5" /> Matched in 1.2 seconds
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Selfie processed in RAM and deleted automatically after matching. 100% private.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-white dark:bg-neutral-900 text-foreground rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase font-mono">
          Your personal gallery
        </span>
        <Badge variant="brand" className="text-xs font-mono">14 matches</Badge>
      </div>
      <p className="text-lg font-bold text-foreground">Found 14 photos of you</p>
      <div className="grid grid-cols-4 gap-2 pt-1">
        {[0, 1, 2, 3].map((n) => (
          <div
            key={n}
            className="aspect-square rounded-lg bg-neutral-100 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700/80 flex items-center justify-center text-[10px] text-muted-foreground font-mono"
          >
            Photo {n + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoCard() {
  const [step, setStep] = useState<DemoStep>("match");
  const [isAuto, setIsAuto] = useState(true);

  useEffect(() => {
    if (!isAuto) return;
    const order: DemoStep[] = ["upload", "selfie", "match"];
    const id = window.setInterval(() => {
      setStep((prev: DemoStep) => order[(order.indexOf(prev) + 1) % order.length]);
    }, 3600);
    return () => window.clearInterval(id);
  }, [isAuto]);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/70">
        <span className="size-2.5 rounded-full bg-red-400/80 inline-block" />
        <span className="size-2.5 rounded-full bg-yellow-400/80 inline-block" />
        <span className="size-2.5 rounded-full bg-emerald-400/80 inline-block" />
        <span className="text-xs text-muted-foreground ml-2 font-mono">fyndr.live/event/demo</span>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800 pb-3 overflow-x-auto scrollbar-hide">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setIsAuto(false);
                setStep(s.id);
              }}
              className={cn(
                "px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[44px] flex items-center justify-center",
                step === s.id
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <DemoPanel step={step} />

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span className="inline-flex items-center gap-1.5 font-mono">
            <Lock className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            RAM-only · 100% Private
          </span>
          <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            Original DSLR Files
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ Accordion Component                                            */
/* ------------------------------------------------------------------ */

function Faq() {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="faq-0"
      className="w-full max-w-3xl mx-auto space-y-3"
    >
      {FAQS.map((item, i) => (
        <AccordionItem
          key={`faq-${i}`}
          value={`faq-${i}`}
          className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 px-5 transition-colors data-[state=open]:bg-white dark:data-[state=open]:bg-neutral-900"
        >
          <AccordionTrigger className="text-left font-semibold text-sm sm:text-base py-4 hover:no-underline hover:text-foreground">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4 pt-1">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/* ------------------------------------------------------------------ */
/* Home Page Component                                                */
/* ------------------------------------------------------------------ */

export default function Home(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      let attempts = 0;
      let timer: number | null = null;
      const scrollToElement = () => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        } else if (attempts < 5) {
          attempts++;
          timer = window.setTimeout(scrollToElement, 100);
        }
      };
      timer = window.setTimeout(scrollToElement, 100);
      return () => {
        if (timer !== null) clearTimeout(timer);
      };
    }
  }, [location.hash, location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-emerald-500/20 selection:text-emerald-500 relative">
      {/* Straight vertical boundary lines extending all the way to the top of the viewport */}
      <div className="pointer-events-none fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[1240px] border-x border-neutral-200 dark:border-neutral-800 z-30" />

      {/* Ambient background dot grid & green glow extending behind navbar and hero */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1240px] h-[850px] overflow-hidden z-0">
        <div className="absolute inset-0 bg-dot-grid opacity-70 mask-radial-fade" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[750px] h-[450px] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-[120px]" />
      </div>

      <Header />

      {/* Main Container framed with Section Boundaries */}
      <main className="flex-1 w-full max-w-[1240px] mx-auto pb-20 sm:pb-0 relative z-10">
        {/* ============================================================ */}
        {/* 1. HERO SECTION WITH ACETERNITY AMBIENT LIGHT & BEAMS        */}
        {/* ============================================================ */}
        <section className="relative py-12 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-neutral-200 dark:border-neutral-800">

          <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
            {/* Eyebrow Status Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-900/80 px-4 py-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-200 backdrop-blur-md shadow-xs">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>The modern way to deliver event photos · Zero app needed</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground font-sans leading-[1.08] max-w-3xl">
              FIND YOURSELF IN EVERY CELEBRATION.
            </h1>

            {/* Sub-headline */}
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl font-normal leading-relaxed">
              No more scrolling through 5,000 photos in messy folders.
              Photographers upload once — guests scan a QR, take a selfie,
              and get their photos in seconds.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2 w-full sm:w-auto">
              <Button
                size="lg"
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto rounded-full px-8 py-3.5 font-semibold text-sm bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-sm min-h-[48px] flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                Create free event
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                }
                className="w-full sm:w-auto rounded-full px-8 py-3.5 font-medium text-sm border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 min-h-[48px] transition-all active:scale-95"
              >
                See how it works
              </Button>
            </div>

            {/* Ticks */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-mono">
              {TICKS.map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <Check className="size-4 text-emerald-500" />
                  {t}
                </span>
              ))}
            </div>
          </div>

        {/* Hero Visual: journey beams merging into delivery */}
        <div className="mt-14 w-full max-w-5xl mx-auto">
          <BeamLines />
        </div>
        </section>

        {/* ============================================================ */}
        {/* 2. METRICS & IMPACT BAR                                      */}
        {/* ============================================================ */}
        <section className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="grid grid-cols-2 lg:grid-cols-4 bg-white/40 dark:bg-neutral-950/40 backdrop-blur-md [&>*:nth-child(odd)]:border-r [&>*:nth-child(-n+2)]:border-b lg:[&>*:nth-child(-n+2)]:border-b-0 lg:[&>*:not(:last-child)]:border-r border-neutral-200 dark:border-neutral-800">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="p-6 sm:p-7 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                      {stat.value}
                    </span>
                    <span className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
                      <Icon className="size-4 text-emerald-500" />
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                    {stat.label}
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal font-normal">
                    {stat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. SOCIAL PROOF STUDIO MARQUEE                               */}
        {/* ============================================================ */}
        <section className="border-b border-neutral-200 dark:border-neutral-800 py-6 bg-neutral-50/50 dark:bg-neutral-950/50 overflow-hidden">
          <div className="px-4 text-center">
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground mb-4 block">
              Trusted by leading wedding &amp; event studios
            </span>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {STUDIOS.map((studio) => (
                <span
                  key={studio}
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Sparkles className="size-3 text-emerald-500" /> {studio}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4. SIGNATURE BENTO GRID SHOWCASE                             */}
        {/* ============================================================ */}
        <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 space-y-12 border-b border-neutral-200 dark:border-neutral-800">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="font-mono text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold">
              Next-Gen Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Built for modern event photographers
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Speed, privacy, and client delight — everything the job needs, nothing it doesn't.
            </p>
          </div>

          <BentoGrid className="lg:grid-cols-3">
            {/* Bento Card 1: Interactive Face Matcher (Spans 2 cols on lg) */}
            <BentoCard
              className="lg:col-span-2 min-h-[380px]"
              header={
                <BentoHeader className="h-64">
                  <InteractiveFaceMatcher />
                </BentoHeader>
              }
              title="Instant AI Face Matching"
              description="Guests take a quick selfie in their browser and instantly see every photo they appear in — zero manual searching through thousands of files."
            />

            {/* Bento Card 2: 100% Ephemeral Privacy (Wrapped in ConicBorderCard with Dedicated Headroom) */}
            <div className="h-full">
              <ConicBorderCard
                active={true}
                badge={
                  <Badge className="bg-emerald-500 text-neutral-950 font-mono text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 shadow-md">
                    100% Ephemeral
                  </Badge>
                }
                className="flex flex-col justify-between h-full space-y-4"
              >
                <div className="space-y-4 pt-1">
                  <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-sans font-semibold text-lg tracking-tight text-neutral-900 dark:text-neutral-100">
                      Privacy by Design
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Guest selfies are computed strictly in temporary RAM and auto-deleted within 60 seconds. Zero biometric storage.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-3 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                    <span>Memory Retention</span>
                    <span className="text-emerald-500 font-bold">&lt; 60s TTL</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                    <span>Biometric Storage</span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-bold">0 bytes</span>
                  </div>
                </div>
              </ConicBorderCard>
            </div>

            {/* Bento Card 3: Live Studio Analytics & Leads */}
            <BentoCard
              className="min-h-[300px]"
              icon={<TrendingUp className="size-4 text-emerald-500" />}
              title="Live Studio Analytics & Leads"
              description="Capture verified attendee contacts directly through their gallery session and direct WhatsApp booking prompts."
            >
              <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-2 gap-2 text-center font-mono">
                <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800/60">
                  <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">240+</div>
                  <div className="text-[10px] text-muted-foreground">Guest Scans</div>
                </div>
                <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800/60">
                  <div className="text-lg font-bold text-emerald-500">18</div>
                  <div className="text-[10px] text-muted-foreground">New Leads</div>
                </div>
              </div>
            </BentoCard>

            {/* Bento Card 4: High-Volume Photo Upload (Spans 2 cols on lg) */}
            <BentoCard
              className="lg:col-span-2 min-h-[300px]"
              icon={<Layers className="size-4 text-blue-500" />}
              title="High-Volume Photo Upload"
              description="Upload thousands of photos at once. Fyndr processes the album in the background while preserving full original quality and metadata."
            >
              <div className="mt-4 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
                    Fast Parallel Upload
                  </span>
                </div>
                <div className="flex items-center gap-4 text-neutral-500 dark:text-neutral-400">
                  <span>Full DSLR Quality</span>
                  <span>Zero Manual Sorting</span>
                  <span className="text-emerald-500 font-bold">Free Forever Tier</span>
                </div>
              </div>
            </BentoCard>
            {/* Bento Card 5: Live Interactive Demo (Full width) */}
            <BentoCard
              className="lg:col-span-3"
              header={<DemoCard />}
              title="Try the flow right here"
              description="A miniature of the guest journey — upload, selfie, matched album in seconds. Tap the steps above to jump around."
            />
          </BentoGrid>
        </section>
        {/* ============================================================ */}
        {/* 4B. CAMERA-TO-CLOUD (SHOOTERS MERGE INTO LIVE GALLERY)        */}
        {/* ============================================================ */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 space-y-12 border-b border-neutral-200 dark:border-neutral-800">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="secondary">Camera-to-Cloud</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Shoot. It lands in the gallery.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Every shooter gets their own FTP login. Cameras auto-transfer JPEGs over a phone hotspot — photos appear live, no laptop in the middle.
            </p>
          </div>
          <div className="max-w-5xl mx-auto">
            <BeamLines sources={CAMERA_SOURCES} hub={CAMERA_HUB} />
          </div>
        </section>

        {/* ============================================================ */}
        {/* 5. INTERACTIVE ROLE EXPLORER (TABS)                          */}
        {/* ============================================================ */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 space-y-8 border-b border-neutral-200 dark:border-neutral-800">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="secondary">Tailored Solutions</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Designed for every participant in the event
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Choose your perspective to see how Fyndr elevates the photo delivery workflow.
            </p>
          </div>

          <Tabs defaultValue="photographer" className="w-full max-w-4xl mx-auto">
            <div className="flex justify-center mb-8">
              <TabsList className="grid w-full grid-cols-3 max-w-md h-11 p-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full">
                <TabsTrigger value="photographer" className="rounded-full text-xs font-semibold">
                  Photographers
                </TabsTrigger>
                <TabsTrigger value="guests" className="rounded-full text-xs font-semibold">
                  Event Guests
                </TabsTrigger>
                <TabsTrigger value="organizers" className="rounded-full text-xs font-semibold">
                  Hosts &amp; Planners
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="photographer">
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-6 sm:p-8 backdrop-blur-md shadow-sm space-y-6">
                <div className="flex items-start gap-4">
                  <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <Camera className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Zero Client Support Burden</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload your finished event folder once. No sorting, no renaming, no answering “can you email me that photo from table 4?”.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
                    <h4 className="font-semibold text-sm text-foreground">Studio Brand Exposure</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Your logo, booking links, and contact info appear directly on every guest's phone as they save their pictures.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
                    <h4 className="font-semibold text-sm text-foreground">Fastest Delivery in Town</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Deliver same-day candids while guests are still energized and posting to Instagram stories.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="guests">
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-6 sm:p-8 backdrop-blur-md shadow-sm space-y-6">
                <div className="flex items-start gap-4">
                  <div className="size-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <Users className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Instant Magic For Every Guest</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      No app downloads, no password creation. Scan table QR, take a selfie, and see your personal album instantly.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
                    <h4 className="font-semibold text-sm text-foreground">Full Resolution Downloads</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Download crisp original quality files straight to your phone camera roll, without compression.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
                    <h4 className="font-semibold text-sm text-foreground">100% Private Selfies</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Selfies are used solely for in-memory matching and immediately discarded.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="organizers">
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-6 sm:p-8 backdrop-blur-md shadow-sm space-y-6">
                <div className="flex items-start gap-4">
                  <div className="size-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                    <Sparkles className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Unforgettable Event Experiences</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Give attendees a modern touchpoint that becomes the talk of the evening.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
                    <h4 className="font-semibold text-sm text-foreground">Custom Table Standees</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Generate gorgeous printable vector table cards and signs that match the wedding or event aesthetic.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
                    <h4 className="font-semibold text-sm text-foreground">Real-Time Guest Engagement</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Watch attendee scans climb live during the reception or corporate gala.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* ============================================================ */}
        {/* 6. HOW IT WORKS WORKFLOW                                     */}
        {/* ============================================================ */}
        <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 space-y-12 border-b border-neutral-200 dark:border-neutral-800">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="secondary">How it works</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Effortless for photographers, magic for guests
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Deliver memorable photo experiences in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((s, idx) => (
              <div
                key={s.title}
                className={cn(
                  "rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 space-y-4 backdrop-blur-md transition-all duration-200 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md bg-white/70 dark:bg-neutral-900/70",
                  idx === 1 ? "ring-1 ring-emerald-500/40 border-emerald-500/40" : ""
                )}
              >
                <span className="size-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 inline-flex items-center justify-center text-foreground">
                  <s.icon className="size-6 text-emerald-500" />
                </span>
                <div>
                  <Badge variant={idx === 1 ? "brand" : "secondary"} className="font-mono text-xs">
                    {s.badge}
                  </Badge>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {s.body}
                </p>
                <div className="text-xs font-mono pt-3 border-t border-neutral-200 dark:border-neutral-800 inline-flex items-center gap-1.5 w-full text-neutral-500 dark:text-neutral-400">
                  <Check className="size-3.5 text-emerald-500 shrink-0" /> {s.note}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 7. WHY SWITCH (TRADITIONAL VS FYNDR COMPARISON MATRIX)        */}
        {/* ============================================================ */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 space-y-12 border-b border-neutral-200 dark:border-neutral-800">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="secondary">Why Switch</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Stop sending folders guests never open
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Give guests an experience they rave about — and stop answering “where are my photos?”.
            </p>
          </div>

          <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md shadow-sm">
            {/* Table Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-neutral-800 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-red-500/10 text-destructive flex items-center justify-center">
                    <X className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                      The Traditional Way
                    </h3>
                    <p className="text-xs text-muted-foreground">Google Drive &amp; Cloud Folders</p>
                  </div>
                </div>
                <Badge variant="destructive" className="font-mono text-[10px] uppercase">
                  Frustrating
                </Badge>
              </div>

              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Check className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                      The Fyndr Experience
                    </h3>
                    <p className="text-xs text-muted-foreground">Instant Face-Matched Gallery</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500 text-neutral-950 font-mono text-[10px] font-bold uppercase">
                  Delightful
                </Badge>
              </div>
            </div>

            {/* Comparison Rows with Horizontal & Vertical Boundaries */}
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800 font-sans text-sm">
              {COMPARISON_ROWS.map((row) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors"
                >
                  <div className="p-4 sm:p-5 flex items-start gap-3">
                    <X className="size-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block mb-0.5">
                        {row.feature}
                      </span>
                      <span className="text-neutral-600 dark:text-neutral-400 text-xs sm:text-sm leading-relaxed">
                        {row.oldWay}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 flex items-start gap-3 bg-emerald-500/[0.02]">
                    <Check className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-0.5">
                        {row.feature}
                      </span>
                      <span className="text-neutral-900 dark:text-neutral-100 font-medium text-xs sm:text-sm leading-relaxed">
                        {row.fyndrWay}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 8. USE CASES                                                 */}
        {/* ============================================================ */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 space-y-12 border-b border-neutral-200 dark:border-neutral-800">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="secondary">Use cases</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Perfect for every event
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              From intimate weddings to 5,000-attendee conferences, Fyndr scales seamlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {USE_CASES.map((u) => (
              <div
                key={u.title}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-6 space-y-3 backdrop-blur-md transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div className="flex items-center justify-between">
                  <span className="size-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 inline-flex items-center justify-center text-foreground">
                    <u.icon className="size-5 text-emerald-500" />
                  </span>
                  <Badge variant="outline" className="text-xs font-mono">{u.tag}</Badge>
                </div>
                <h3 className="font-bold text-base text-foreground">{u.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{u.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 9. TESTIMONIALS                                              */}
        {/* ============================================================ */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 space-y-12 border-b border-neutral-200 dark:border-neutral-800">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="secondary">Testimonials</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Photographers love Fyndr
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              How studios and planners transformed client satisfaction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {QUOTES.map((t) => (
              <div
                key={t.author}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-6 sm:p-8 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-1 text-amber-500" role="img" aria-label="5 out of 5 stars">
                    {[0, 1, 2, 3, 4].map((starIdx) => (
                      <Star key={starIdx} className="size-4 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <blockquote className="text-sm text-foreground italic leading-relaxed">
                    “{t.quote}”
                  </blockquote>
                </div>
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800">
                  <div className="font-semibold text-sm text-foreground">{t.author}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 10. PRICING TIERS                                            */}
        {/* ============================================================ */}
        <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 space-y-12 border-b border-neutral-200 dark:border-neutral-800">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="secondary">Transparent Pricing</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Simple, transparent pricing for every studio
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Transparent plans with 15–20% lower rates than FotoOwl.ai, full original resolution downloads, and 100% ephemeral privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {PRICING_TIERS.map((tier) => {
              if (tier.highlighted) {
                return (
                  <ConicBorderCard
                    key={tier.name}
                    active={true}
                    badge={
                      <Badge className="bg-emerald-500 text-neutral-950 font-mono text-xs font-bold uppercase tracking-wider px-3 py-1 shadow-sm">
                        {tier.badge}
                      </Badge>
                    }
                    className="flex flex-col justify-between space-y-6"
                  >
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-bold text-xl text-neutral-900 dark:text-neutral-100">
                          {tier.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                            {tier.price}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            /mo ({tier.inrPrice})
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {tier.compareNote}
                        </p>
                      </div>

                      <ul className="space-y-2.5 text-xs text-neutral-700 dark:text-neutral-300 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                        {tier.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2">
                            <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      size="lg"
                      onClick={() => navigate("/login")}
                      className="w-full rounded-full min-h-[44px] text-sm font-semibold bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all active:scale-95"
                    >
                      {tier.cta}
                    </Button>
                  </ConicBorderCard>
                );
              }

              return (
                <div
                  key={tier.name}
                  className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-6 flex flex-col justify-between space-y-6 backdrop-blur-md"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-xl text-neutral-900 dark:text-neutral-100">
                        {tier.name}
                      </h3>
                      {tier.badge && (
                        <Badge variant="secondary" className="font-mono text-xs">
                          {tier.badge}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">{tier.description}</p>
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                          {tier.price}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          /mo ({tier.inrPrice})
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {tier.compareNote}
                      </p>
                    </div>

                    <ul className="space-y-2.5 text-xs text-neutral-700 dark:text-neutral-300 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                      {tier.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/login")}
                    className="w-full rounded-full min-h-[44px] text-sm font-semibold border-neutral-200 dark:border-neutral-800 transition-all active:scale-95"
                  >
                    {tier.cta}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 11. FAQ SECTION                                              */}
        {/* ============================================================ */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 space-y-12 border-b border-neutral-200 dark:border-neutral-800">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="secondary">FAQ</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Everything you need to know about setting up and using Fyndr.
            </p>
          </div>

          <Faq />
        </section>

        {/* ============================================================ */}
        {/* 12. FINAL CTA CARD                                           */}
        {/* ============================================================ */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-950 text-white p-8 sm:p-12 lg:p-16">
            <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />
            <div className="absolute top-0 right-0 size-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
              <div className="space-y-5">
                <Badge variant="brand">Get started today</Badge>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight font-sans">
                  Ready to modernize your photo delivery?
                </h2>
                <p className="text-neutral-400 text-sm sm:text-base max-w-lg leading-relaxed">
                  Set up your first event in under 2 minutes. Free forever to test — zero credit card required.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    size="lg"
                    onClick={() => navigate("/login")}
                    className="min-h-[48px] rounded-full text-sm font-semibold px-7 bg-white text-neutral-950 hover:bg-neutral-100 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                  >
                    Create photographer account
                    <ArrowRight className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate("/about")}
                    className="min-h-[48px] rounded-full text-sm font-semibold border-neutral-800 text-white hover:bg-neutral-900 transition-all active:scale-95"
                  >
                    About Fyndr
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm p-6 space-y-4">
                <span className="font-bold text-sm text-white block">Everything included:</span>
                <ul className="space-y-2.5 text-xs sm:text-sm text-neutral-300">
                  {[
                    "Instant event QR codes & PIN",
                    "Fast AI face recognition (< 2s)",
                    "Full-resolution original downloads",
                    "Zero app download for guests",
                    "100% RAM-only privacy guarantee",
                    "Custom studio branding & WhatsApp leads",
                  ].map((li) => (
                    <li key={li} className="flex items-center gap-2.5 font-medium">
                      <Check className="size-4 text-emerald-400 shrink-0" />
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* MOBILE STICKY CTA BAR */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-md border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] flex gap-3 sm:hidden">
        <Button
          size="lg"
          onClick={() => navigate("/login")}
          className="flex-1 min-h-[44px] rounded-full text-sm font-semibold"
        >
          Get Started Free
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() =>
            document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
          }
          className="flex-1 min-h-[44px] rounded-full text-sm"
        >
          See Demo
        </Button>
      </div>

      <Footer />
    </div>
  );
}
