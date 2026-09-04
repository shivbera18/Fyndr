import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../landing.css";
import { Button, Reveal, SectionHead, cn } from "../landing/primitives";
import Header from "../navbar/Header";
import Footer from "../Footer";

/* ------------------------------------------------------------------ */
/* Data (copy preserved from the previous landing)                     */
/* ------------------------------------------------------------------ */

const TICKS = ["No app download", "100% private", "High-res downloads"];

const STUDIOS = [
  "APEX PHOTO CO.",
  "MOMENT FRAME",
  "LUMINA WEDDINGS",
  "SHUTTER & SOUL",
  "VELVET LENS",
];

const STEPS = [
  { id: "upload", label: "1 · Upload" },
  { id: "selfie", label: "2 · Selfie" },
  { id: "match", label: "3 · Matches" },
] as const;

type DemoStep = (typeof STEPS)[number]["id"];

const HOW_IT_WORKS = [
  {
    icon: "📤",
    badge: "Photographer",
    title: "Upload event photos",
    body: "Drag and drop your high-resolution gallery — hundreds or thousands of photos in one go.",
    note: "📁 DSLR, mirrorless, or mobile photos supported",
  },
  {
    icon: "📱",
    badge: "At the event",
    title: "Share QR code",
    body: "Display your event QR on table standees, screens, or send the link. Optional 6-digit PIN for invited guests.",
    note: "🖨️ Instant QR download ready for printing",
  },
  {
    icon: "⚡",
    badge: "Guest experience",
    title: "Selfie & instant match",
    body: "Guests scan, take a quick selfie in their browser, and immediately see and download their photos.",
    note: "🎉 No account or mobile app required",
    dark: true,
  },
];

const OLD_WAY = [
  "Massive 5,000-photo Drive links",
  "Guests spend 45+ minutes searching folders",
  "Most guests give up and never find photos",
  "“Where are my photos?” messages for weeks",
  "Compressed low-quality chat-app shares",
];

const FYNDR_WAY = [
  "One QR code at the event or via link",
  "Face match finds their photos in ~2 seconds",
  "Every guest finds their candid moments",
  "Full-resolution originals, ready to frame",
  "Guests tag your studio everywhere",
];

const USE_CASES = [
  {
    icon: "💍",
    tag: "Most popular",
    title: "Weddings & receptions",
    body: "Bride, groom, family, and hundreds of guests get personal moments without the wait.",
  },
  {
    icon: "👔",
    tag: "High volume",
    title: "Galas & conferences",
    body: "Keynotes, speaker portraits, and networking photos delivered effortlessly.",
  },
  {
    icon: "🎉",
    tag: "Zero friction",
    title: "Birthdays & parties",
    body: "Candid laughs and group pictures with friends before the night ends.",
  },
  {
    icon: "🎓",
    tag: "Instant access",
    title: "Graduations & sports",
    body: "Stage walks, medal ceremonies, and action shots found in seconds.",
  },
];

const FEATURES = [
  {
    icon: "🔍",
    title: "AI face recognition",
    body: "Finds guests across group shots, side profiles, and candids in under two seconds.",
  },
  {
    icon: "📲",
    title: "Zero app download",
    body: "No app store, logins, or passwords. Opens in any standard mobile browser.",
  },
  {
    icon: "🖼️",
    title: "Full-resolution files",
    body: "Crisp originals straight from your DSLR or mirrorless camera.",
  },
  {
    icon: "🔒",
    title: "100% private",
    body: "Selfies match live and are never stored or shared with third parties.",
  },
  {
    icon: "🔑",
    title: "PIN-protected galleries",
    body: "A 6-digit access PIN keeps galleries visible to invited guests only.",
  },
  {
    icon: "🏷️",
    title: "Studio branding",
    body: "Galleries carry your studio name and logo — referrals on autopilot.",
  },
];

const QUOTES = [
  {
    quote:
      "At our last 500-guest wedding, over 380 guests downloaded their photos before the reception even ended.",
    author: "Marcus Chen",
    role: "Lead Photographer, Lumina Weddings",
  },
  {
    quote:
      "No more “where are my photos?” emails. Clients scan the QR code and find everything themselves.",
    author: "Priya Patel",
    role: "Founder, Shutter & Soul Studios",
  },
  {
    quote:
      "The QR on every table gave our conference a premium feel. Attendees loved the instant delivery.",
    author: "David Miller",
    role: "Event Director, Apex Visuals",
  },
];

const FAQS = [
  {
    q: "How do guests find their photos?",
    a: "Guests scan the event QR code with their phone camera, take a 1-second selfie in their browser, and instantly see every photo they appear in.",
  },
  {
    q: "Do guests need to install an app or register?",
    a: "No. Fyndr works directly inside mobile Safari, Chrome, and other standard browsers — no download, no account, no password.",
  },
  {
    q: "Are guest selfies kept private?",
    a: "Yes, 100%. Selfies are processed in real time solely to match photos and are immediately discarded — never stored or shared.",
  },
  {
    q: "Can I upload high-resolution DSLR photos?",
    a: "Yes. Upload full-resolution JPEG, PNG, or WebP images from any professional camera or phone.",
  },
  {
    q: "How many photos per event?",
    a: "Thousands per gallery. Fyndr processes entire event galleries smoothly, from intimate parties to 5,000-attendee conferences.",
  },
  {
    q: "Is Fyndr free to try?",
    a: "Yes. Create events for free with QR generation, uploads, and matching included. No credit card required.",
  },
];
const d = (ms: number): React.CSSProperties =>
  ({ "--fy-d": `${ms}ms` }) as React.CSSProperties;

/* ------------------------------------------------------------------ */
/* Interactive demo — auto-cycling Upload → Selfie → Matches           */
/* ------------------------------------------------------------------ */

function DemoPanel({ step }: { step: DemoStep }) {
  if (step === "upload") {
    return (
      <div className="fy-demo-panel" key="upload">
        <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
          Grand Wedding Reception
        </div>
        <div className="fy-micro">3,420 photos in gallery</div>
        <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.875rem" }}>
          {[92, 100, 78].map((w, i) => (
            <div
              key={i}
              className="fy-shimmer"
              style={{ height: "0.75rem", width: `${w}%` }}
            />
          ))}
        </div>
        <div className="fy-micro" style={{ marginTop: "0.75rem" }}>
          Uploading originals…
        </div>
      </div>
    );
  }
  if (step === "selfie") {
    return (
      <div className="fy-demo-panel" key="selfie">
        <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
          🙂 Quick guest selfie taken
        </div>
        <div style={{ color: "var(--fy-success)", fontWeight: 600, fontSize: "0.875rem", marginTop: "0.25rem" }}>
          ✓ Matched in 1.2 seconds
        </div>
        <div className="fy-micro" style={{ marginTop: "0.5rem" }}>
          Selfie deleted automatically after matching.
        </div>
      </div>
    );
  }
  return (
    <div className="fy-demo-result" key="match">
      <div className="fy-micro" style={{ color: "rgba(255,255,255,0.7)" }}>
        YOUR PERSONAL GALLERY
      </div>
      <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "0.125rem" }}>
        Found 14 photos of you
      </div>
      <div className="fy-photo-row" aria-hidden="true">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="fy-photo" />
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
    <div className="fy-demo fy-float">
      <div className="fy-demo-bar" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="fy-demo-body">
        <div className="fy-demo-steps" role="tablist" aria-label="How matching works">
          {STEPS.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={step === s.id}
              className={cn("fy-demo-step", step === s.id && "is-active")}
              onClick={() => setStep(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div aria-live="polite">
          <DemoPanel step={step} />
        </div>
        <div className="fy-micro">
          🔒 Privacy guaranteed · Full-quality original files
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                               */
/* ------------------------------------------------------------------ */

function Faq() {
  const [open, setOpen] = useState<number>(0);
  return (
    <div className="fy-faq">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className={cn("fy-faq-item", isOpen && "is-open")}>
            <button
              className="fy-faq-q"
              aria-expanded={isOpen}
              aria-controls={`fy-faq-a-${i}`}
              onClick={() => setOpen(isOpen ? -1 : i)}
            >
              {item.q}
              <span className="fy-faq-icon" aria-hidden="true">
                +
              </span>
            </button>
            <div className="fy-faq-a" id={`fy-faq-a-${i}`} role="region">
              <div className="fy-faq-a-inner">
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page (structure mirrors openstatus home.mdx: hero → visual → logos  */
/* → features → interactive → grid → FAQ → CTA)                        */
/* ------------------------------------------------------------------ */

export default function Home(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="fy">
      <Header />

      {/* HERO */}
      <section className="fy-hero">
        <div className="fy-container fy-hero-grid">
          <div>
            <span
              className="fy-badge fy-badge-brand fy-enter"
              style={d(0)}
            >
              ✦ The modern way to deliver event photos
            </span>
            <h1
              className="fy-h1 fy-enter"
              style={d(80)}
            >
              Find yourself in every celebration
            </h1>
            <p
              className="fy-lede fy-enter"
              style={d(160)}
            >
              No more scrolling through 5,000 photos in messy folders.
              Photographers upload once — guests scan a QR, take a selfie,
              and get their photos in seconds.
            </p>
            <div
              className="fy-hero-actions fy-enter"
              style={d(240)}
            >
              <Button size="lg" onClick={() => navigate("/login")}>
                Create free event →
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                See how it works
              </Button>
            </div>
            <div
              className="fy-hero-ticks fy-enter"
              style={d(320)}
            >
              {TICKS.map((t) => (
                <span key={t}>
                  <span className="fy-tick" aria-hidden="true">
                    ✓
                  </span>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div
            className="fy-enter"
            style={d(200)}
          >
            <DemoCard />
          </div>
        </div>
      </section>

      {/* LOGO CLOUD */}
      <div className="fy-logos" aria-label="Trusted by event studios">
        <div className="fy-logo-track">
          {[...STUDIOS, ...STUDIOS].map((s, i) => (
            <span key={i} aria-hidden={i >= STUDIOS.length}>
              ◆ {s}
            </span>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="fy-section" id="how-it-works">
        <div className="fy-container">
          <Reveal>
            <SectionHead
              eyebrow="How it works"
              title="Effortless for photographers, magic for guests"
              lede="Deliver memorable photo experiences in three simple steps."
            />
          </Reveal>
          <div className="fy-cards-3">
            {HOW_IT_WORKS.map((s, i) => (
              <Reveal key={s.title} delay={i * 90}>
                <div className={cn("fy-card", s.dark === true && "fy-card-dark")}>
                  <span className="fy-icon" aria-hidden="true">
                    {s.icon}
                  </span>
                  <div className="fy-micro">{s.badge}</div>
                  <h3 style={{ marginTop: "0.375rem" }}>{s.title}</h3>
                  <p>{s.body}</p>
                  <div className="fy-card-note">{s.note}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHY SWITCH */}
      <section className="fy-section" style={{ paddingTop: 0 }}>
        <div className="fy-container">
          <Reveal>
            <SectionHead
              eyebrow="Why switch"
              title="Stop sending folders guests never open"
              lede="Give guests an experience they rave about — and stop answering “where are my photos?”."
            />
          </Reveal>
          <div className="fy-split">
            <Reveal>
              <div className="fy-panel fy-panel-bad">
                <h3>✕ The traditional way</h3>
                <ul>
                  {OLD_WAY.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="fy-panel fy-panel-good">
                <h3>✓ The Fyndr experience</h3>
                <ul>
                  {FYNDR_WAY.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="fy-section" style={{ paddingTop: 0 }}>
        <div className="fy-container">
          <Reveal>
            <SectionHead
              eyebrow="Use cases"
              title="Perfect for every event"
              lede="From intimate weddings to 5,000-attendee conferences, Fyndr scales seamlessly."
            />
          </Reveal>
          <div className="fy-cards-4">
            {USE_CASES.map((u, i) => (
              <Reveal key={u.title} delay={(i % 4) * 70}>
                <div className="fy-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <span style={{ fontSize: "2rem" }} aria-hidden="true">
                      {u.icon}
                    </span>
                    <span className="fy-badge">{u.tag}</span>
                  </div>
                  <h3>{u.title}</h3>
                  <p>{u.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="fy-section" id="services" style={{ paddingTop: 0 }}>
        <div className="fy-container">
          <Reveal>
            <SectionHead
              eyebrow="Features"
              title="Built for modern event photographers"
              lede="Speed, privacy, and client delight — everything the job needs, nothing it doesn't."
            />
          </Reveal>
          <div className="fy-cards-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 80}>
                <div className="fy-card">
                  <span className="fy-icon" aria-hidden="true">
                    {f.icon}
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="fy-section" style={{ paddingTop: 0 }}>
        <div className="fy-container">
          <Reveal>
            <SectionHead
              eyebrow="Testimonials"
              title="Photographers love Fyndr"
              lede="How studios and planners transformed client satisfaction."
            />
          </Reveal>
          <div className="fy-cards-3">
            {QUOTES.map((t, i) => (
              <Reveal key={t.author} delay={i * 90}>
                <div className="fy-card fy-quote">
                  <div>
                    <div className="fy-stars" aria-label="5 out of 5 stars">
                      ★★★★★
                    </div>
                    <blockquote>“{t.quote}”</blockquote>
                  </div>
                  <footer>
                    <div style={{ fontWeight: 700 }}>{t.author}</div>
                    <div className="fy-micro">{t.role}</div>
                  </footer>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="fy-section" style={{ paddingTop: 0 }}>
        <div className="fy-container">
          <Reveal>
            <SectionHead
              eyebrow="FAQ"
              title="Frequently asked questions"
              lede="Everything you need to know about setting up and using Fyndr."
            />
          </Reveal>
          <Reveal>
            <Faq />
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="fy-section" style={{ paddingTop: 0 }}>
        <div className="fy-container">
          <Reveal>
            <div className="fy-dark fy-cta">
              <div>
                <h2 className="fy-h2">
                  Ready to modernize your photo delivery?
                </h2>
                <p className="fy-lede">
                  Set up your first event in under 2 minutes. Free to start —
                  no credit card required.
                </p>
                <div className="fy-hero-actions">
                  <Button variant="brand" size="lg" onClick={() => navigate("/login")}>
                    Create photographer account
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => navigate("/about")}
                  >
                    About Fyndr
                  </Button>
                </div>
              </div>
              <div className="fy-card">
                <div style={{ fontWeight: 700 }}>Everything included:</div>
                <ul className="fy-checklist">
                  {[
                    "Instant event QR codes & PIN",
                    "Fast AI face recognition",
                    "Full-resolution downloads",
                    "Zero app download for guests",
                    "Complete privacy guarantee",
                    "Custom studio branding",
                  ].map((li) => (
                    <li key={li}>
                      <span className="fy-tick" aria-hidden="true">
                        ✓
                      </span>
                      {li}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
