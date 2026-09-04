import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Lock,
  Sparkles,
  X,

} from "lucide-react";
import { cn } from "../../lib/utils";

/* ------------------------------------------------------------------ */
/* Data                                                               */
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

const HOW_IT_WORKS = [
  {
    badge: "Step 01",
    title: "Upload & generate QR",
    body: "Upload your DSLR or mirrorless photos to a new event album. Fyndr creates a print-ready QR code with custom access PIN in seconds.",
    note: "AI processes faces in background",
    dark: false,
    icon: "📸",
  },
  {
    badge: "Step 02",
    title: "Guests scan & snap",
    body: "Guests point their phone at the table QR code. No app install, no account required. They snap a quick selfie with their phone camera.",
    note: "Selfie deleted immediately after match",
    dark: true,
    icon: "🤳",
  },
  {
    badge: "Step 03",
    title: "Personal gallery delivers",
    body: "ArcFace face embeddings and FAISS index surface every photo containing the guest in under 2 seconds. High-resolution downloads directly.",
    note: "Instant download, zero hunting",
    dark: false,
    icon: "⚡",
  },
];

const OLD_WAY = [
  "Photographer sends a Google Drive or Dropbox link with 5,000 photos",
  "Guests open the link on mobile and wait minutes for thumbnails to load",
  "Guests scroll through thousands of strangers' photos looking for themselves",
  "Frustrated guests give up and text the bride: “Where are our photos?”",
  "Photographer spends hours manually finding and emailing specific shots",
];

const FYNDR_WAY = [
  "Photographer displays a branded QR standee at tables and reception",
  "Guests scan on phone, snap a 1-second selfie — no app download needed",
  "AI matches faces in under 2 seconds and displays only their photos",
  "Guests download full-resolution originals and share to social immediately",
  "Studio branding on every guest gallery turns attendees into new client leads",
];

const USE_CASES = [
  {
    tag: "Weddings",
    title: "Wedding receptions & sangeets",
    body: "Delight 500+ wedding guests with instant access to their photos while they're still dressed up and celebrating.",
    icon: "💍",
  },
  {
    tag: "Corporate",
    title: "Conferences & galas",
    body: "Deliver executive portraits and event candids to attendees with zero manual tagging or sorting.",
    icon: "🏢",
  },
  {
    tag: "Private",
    title: "Birthday & anniversary parties",
    body: "Give friends and family their own personalized memories album in seconds.",
    icon: "🎉",
  },
  {
    tag: "Sports",
    title: "Marathons & sports meets",
    body: "Match thousands of runners and athletes to their race day photos by face without bib number errors.",
    icon: "🏃",
  },
];

const FEATURES = [
  {
    title: "High-speed AI face matching",
    body: "State-of-the-art ArcFace 512-dimensional embeddings deliver precision matching in under 2 seconds per selfie.",
    icon: "⚡",
  },
  {
    title: "Zero app friction",
    body: "Works 100% in mobile browsers (Safari, Chrome, Firefox). Guests scan and download without App Store visits or passwords.",
    icon: "📱",
  },
  {
    title: "Full DSLR resolution",
    body: "Downloads preserve original resolution and EXIF data so prints and social posts look crisp.",
    icon: "🖼️",
  },
  {
    title: "Studio branding on every page",
    body: "Showcase your studio name, contact info, booking link, and promotions on every guest gallery view.",
    icon: "🎨",
  },
  {
    title: "Privacy by design",
    body: "Guest selfies are processed strictly in RAM for matching and immediately discarded. Never stored, sold, or trained on.",
    icon: "🔒",
  },
  {
    title: "Bulk drag & drop upload",
    body: "Queue up to 100 photos at a time with real-time progress indicators and background processing.",
    icon: "☁️",
  },
];

const QUOTES = [
  {
    quote:
      "Guests were blown away at our last wedding. Within 10 minutes of placing the QR cards, over 200 guests had found and downloaded their photos. My inquiries doubled.",
    author: "Rohan & Prianka",
    role: "Aura Wedding Cinema, Mumbai",
  },
  {
    quote:
      "We stopped getting endless WhatsApp messages asking for specific event photos. Fyndr paid for itself on day one just in saved photographer hours.",
    author: "Kavita S.",
    role: "Vivid Stories Studio, Delhi",
  },
  {
    quote:
      "The face recognition is shockingly fast and accurate, even with varying lighting and angles. It's the standard for our studio now.",
    author: "Arjun Mehta",
    role: "Lead Photographer, Studio Lumière",
  },
];

const FAQS = [
  {
    q: "Do event guests need to download an app or create an account?",
    a: "No! Guests simply open their phone camera, scan the event QR code, enter the 6-digit event PIN, and take a quick selfie directly in their mobile browser. No App Store download, no signup, no passwords.",
  },
  {
    q: "Is guest selfie data private and secure?",
    a: "Yes, 100%. The guest selfie is used in real-time only to calculate face embeddings for searching the current event album. Once the search finishes, the selfie is immediately discarded. We never retain face templates or share data.",
  },
  {
    q: "How fast is the face recognition search?",
    a: "Search typically completes in 1 to 2 seconds for albums with up to 10,000 photos, powered by 512-dimensional vector indexes.",
  },
  {
    q: "Can guests download original full-resolution photos?",
    a: "Yes! Guests can download the original, full-quality image uploaded by the photographer directly to their phone camera roll.",
  },
  {
    q: "Can I customize the guest portal with my photography studio branding?",
    a: "Yes! You can set your studio name, phone/WhatsApp number, address, and special booking offers. Guests see your branding whenever they search and download photos.",
  },
];

/* ------------------------------------------------------------------ */
/* Interactive Demo Card                                              */
/* ------------------------------------------------------------------ */

function DemoPanel({ step }: { step: DemoStep }) {
  if (step === "upload") {
    return (
      <div className="space-y-3 p-4 bg-muted/40 rounded-xl border border-border">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-foreground">Grand Wedding Reception</span>
          <Badge variant="secondary" className="text-xs">3,420 photos</Badge>
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full w-[85%] animate-pulse" />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Indexing faces…</span>
            <span>85% complete</span>
          </div>
        </div>
      </div>
    );
  }

  if (step === "selfie") {
    return (
      <div className="space-y-3 p-4 bg-muted/40 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand flex items-center justify-center text-brand-ink text-lg font-bold">
            🙂
          </div>
          <div>
            <span className="font-semibold text-sm text-foreground block">Quick guest selfie taken</span>
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">
              ✓ Matched in 1.2 seconds
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Selfie deleted automatically after matching. 100% private.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-zinc-900 text-white rounded-xl border border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-brand uppercase">
          Your personal gallery
        </span>
        <Badge variant="brand" className="text-xs">14 matches</Badge>
      </div>
      <p className="text-lg font-bold">Found 14 photos of you</p>
      <div className="grid grid-cols-4 gap-2 pt-1">
        {[0, 1, 2, 3].map((n) => (
          <div
            key={n}
            className="aspect-square rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-500"
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

  useEffect(() => {
    const order: DemoStep[] = ["upload", "selfie", "match"];
    const id = window.setInterval(() => {
      setStep((prev: DemoStep) => order[(order.indexOf(prev) + 1) % order.length]);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Card className="overflow-hidden border-border shadow-xl bg-card">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/30">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80 inline-block" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80 inline-block" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/80 inline-block" />
        <span className="text-xs text-muted-foreground ml-2 font-mono">fyndr.live/demo</span>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Step tabs */}
        <div className="flex items-center gap-1 border-b border-border pb-3 overflow-x-auto scrollbar-hide">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap min-h-[36px]",
                step === s.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <DemoPanel step={step} />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
          <Lock className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          <span>Privacy guaranteed · Full-quality original files</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ Accordion Component                                             */
/* ------------------------------------------------------------------ */

function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {FAQS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className="rounded-xl border border-border bg-card overflow-hidden transition-colors"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between p-4 sm:p-5 text-left font-semibold text-sm sm:text-base hover:bg-muted/40 transition-colors min-h-[44px]"
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground ml-2",
                  isOpen && "rotate-180 text-foreground"
                )}
              />
            </button>
            {isOpen && (
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-muted-foreground leading-relaxed">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Home Page Component                                                */
/* ------------------------------------------------------------------ */

export default function Home(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 space-y-20 sm:space-y-28 pb-20">
        {/* HERO SECTION */}
        <section className="pt-8 sm:pt-16 px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-14 items-center">
            <div className="space-y-6 text-center lg:text-left">
              <Badge variant="brand" className="inline-flex items-center gap-1.5 py-1 px-3">
                <Sparkles className="h-3.5 w-3.5" />
                The modern way to deliver event photos
              </Badge>

              <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-tight text-foreground leading-[1.1]">
                Find yourself in every celebration
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                No more scrolling through 5,000 photos in messy folders.
                Photographers upload once — guests scan a QR, take a selfie,
                and get their photos in seconds.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={() => navigate("/login")}
                  className="w-full sm:w-auto min-h-[48px] text-base font-semibold px-6 flex items-center justify-center gap-2"
                >
                  Create free event
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() =>
                    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="w-full sm:w-auto min-h-[48px] text-base"
                >
                  See how it works
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2 text-xs sm:text-sm text-muted-foreground">
                {TICKS.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 font-medium">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Interactive Demo Card: order swap on mobile */}
            <div className="order-first lg:order-last w-full max-w-md mx-auto lg:max-w-none">
              <DemoCard />
            </div>
          </div>
        </section>

        {/* LOGO TICKER */}
        <section className="border-y border-border py-6 bg-muted/20 overflow-hidden">
          <div className="max-w-[1240px] mx-auto px-4 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 block">
              Trusted by leading wedding &amp; event studios
            </span>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm font-semibold text-muted-foreground">
              {STUDIOS.map((studio) => (
                <span key={studio} className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <span className="text-brand font-bold">◆</span> {studio}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
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
            {HOW_IT_WORKS.map((s) => (
              <Card
                key={s.title}
                className={cn(
                  "border-border transition-shadow hover:shadow-md",
                  s.dark ? "bg-zinc-900 text-white" : ""
                )}
              >
                <CardContent className="p-6 sm:p-8 space-y-4">
                  <span className="text-3xl block" aria-hidden="true">
                    {s.icon}
                  </span>
                  <Badge variant={s.dark ? "brand" : "secondary"}>{s.badge}</Badge>
                  <h3 className={cn("text-xl font-bold", s.dark ? "text-white" : "text-foreground")}>
                    {s.title}
                  </h3>
                  <p className={cn("text-sm leading-relaxed", s.dark ? "text-zinc-300" : "text-muted-foreground")}>
                    {s.body}
                  </p>
                  <div className={cn("text-xs font-mono pt-2 border-t", s.dark ? "border-zinc-800 text-brand" : "border-border text-muted-foreground")}>
                    ✓ {s.note}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* WHY SWITCH (TRADITIONAL VS FYNDR) */}
        <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="secondary">Why switch</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Stop sending folders guests never open
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Give guests an experience they rave about — and stop answering “where are my photos?”.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-red-200 dark:border-red-950/60 bg-red-50/30 dark:bg-red-950/10">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-2 text-destructive font-bold text-lg">
                  <X className="h-5 w-5" />
                  <h3>The traditional way</h3>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {OLD_WAY.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="text-destructive font-bold">✕</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-green-200 dark:border-green-950/60 bg-green-50/30 dark:bg-green-950/10">
              <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-bold text-lg">
                  <Check className="h-5 w-5" />
                  <h3>The Fyndr experience</h3>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {FYNDR_WAY.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* USE CASES */}
        <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
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
              <Card key={u.title} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl" aria-hidden="true">
                      {u.icon}
                    </span>
                    <Badge variant="outline">{u.tag}</Badge>
                  </div>
                  <h3 className="font-bold text-base text-foreground">{u.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{u.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="secondary">Features</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Built for modern event photographers
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Speed, privacy, and client delight — everything the job needs, nothing it doesn't.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Card key={f.title} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6 space-y-3">
                  <span className="text-2xl block" aria-hidden="true">
                    {f.icon}
                  </span>
                  <h3 className="font-bold text-base text-foreground">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
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
              <Card key={t.author} className="flex flex-col justify-between">
                <CardContent className="p-6 sm:p-8 space-y-4">
                  <div className="text-amber-500 text-sm tracking-widest" aria-label="5 out of 5 stars">
                    ★★★★★
                  </div>
                  <blockquote className="text-sm text-foreground italic leading-relaxed">
                    “{t.quote}”
                  </blockquote>
                  <div className="pt-2 border-t border-border">
                    <div className="font-semibold text-sm text-foreground">{t.author}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="secondary">FAQ</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Frequently asked questions
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Everything you need to know about setting up and using Fyndr.
            </p>
          </div>

          <Faq />
        </section>

        {/* FINAL CTA CARD */}
        <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-zinc-950 text-white p-6 sm:p-12 border border-zinc-800 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
              <div className="space-y-4">
                <Badge variant="brand">Get started today</Badge>
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                  Ready to modernize your photo delivery?
                </h2>
                <p className="text-zinc-400 text-sm sm:text-base max-w-lg leading-relaxed">
                  Set up your first event in under 2 minutes. Free to start — no credit card required.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="brand"
                    size="lg"
                    onClick={() => navigate("/login")}
                    className="min-h-[48px] text-base font-semibold px-6"
                  >
                    Create photographer account
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate("/about")}
                    className="min-h-[48px] text-base text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
                  >
                    About Fyndr
                  </Button>
                </div>
              </div>

              <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardContent className="p-6 space-y-3">
                  <span className="font-semibold text-sm text-zinc-300 block">Everything included:</span>
                  <ul className="space-y-2 text-xs sm:text-sm text-zinc-300">
                    {[
                      "Instant event QR codes & PIN",
                      "Fast AI face recognition",
                      "Full-resolution downloads",
                      "Zero app download for guests",
                      "Complete privacy guarantee",
                      "Custom studio branding",
                    ].map((li) => (
                      <li key={li} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-brand shrink-0" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* MOBILE STICKY CTA BAR */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border p-3 flex gap-3 md:hidden pb-[env(safe-area-inset-bottom)]">
        <Button
          size="lg"
          onClick={() => navigate("/login")}
          className="flex-1 min-h-[44px] text-sm font-semibold"
        >
          Get Started Free
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() =>
            document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
          }
          className="flex-1 min-h-[44px] text-sm"
        >
          See Demo
        </Button>
      </div>

      <Footer />
    </div>
  );
}
