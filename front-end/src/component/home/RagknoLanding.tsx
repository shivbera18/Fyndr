import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import DotGrid from "./DotGrid";
import KnowledgeMarquee from "./KnowledgeMarquee";
import FyndrCapabilities from "./FyndrCapabilities";
import HowFyndrWorks from "./HowFyndrWorks";
import GalleryDemo from "./GalleryDemo";
import EventWorkflows from "./EventWorkflows";
import LandingFaq from "./LandingFaq";
import LandingFooter from "./LandingFooter";
import LandingNav from "./LandingNav";
import useLandingReveal from "./useLandingReveal";
import "./ragkno-landing.css";
import "./ragkno-bento.css";
import "./ragkno-faq.css";

const ROTATING_WORDS = ["Weddings", "Events", "Memories"] as const;

function Hero(): React.JSX.Element {
  const words = useMemo(() => ROTATING_WORDS, []);
  const [wordIndex, setWordIndex] = useState(0);
  const currentWord = words[wordIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [words.length]);

  return (
    <>
      <section className="hero-section" data-nav-theme="dark">
        <img
          className="hero-image"
          src={`${process.env.PUBLIC_URL}/landing/hero-photo.webp`}
          alt="Open field at golden hour — every guest finds their photos"
          fetchPriority="high"
        />
        <div className="hero-overlay" aria-hidden="true" />
        <div className="hero-grid">
          <div className="hero-copy-block">
            <h1>
              Face search <br />
              <span className="hero-your-word">
                for your <span key={currentWord} className="typed-word">{currentWord}</span>
              </span>
            </h1>
            <p className="hero-copy">
              Upload once — guests scan a QR, take a selfie, and get their
              photos in seconds. No app, no scrolling through 5,000 strangers.
            </p>
            <div className="hero-actions">
              <Link to="/login" className="btn-primary-solid">
                Get Started <ArrowRight size={15} />
              </Link>
              <Link to="/#how-it-works" className="btn-glass">
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="prompt-band" data-nav-theme="light">
        <div className="prompt-dot-grid" aria-hidden="true">
          <DotGrid
            dotSize={3}
            gap={24}
            baseColor="#d8d0bf"
            activeColor="#a99c82"
            proximity={120}
            speedTrigger={90}
            shockRadius={210}
            shockStrength={1.8}
            resistance={760}
            returnDuration={1.35}
          />
        </div>
        <div className="prompt-card">
          <p>
            Event photo delivery that finds every guest in seconds — upload the
            album once, and face search does the sorting while the party is
            still on.
          </p>
          <div className="prompt-tags">
            <span>QR Check-in</span>
            <span>Selfie Search</span>
            <span>Instant Gallery</span>
            <span>Studio Leads</span>
          </div>
          <div className="prompt-actions">
            <span className="language-pill">No app needed</span>
            <Link to="/login" className="generate-pill">
              Create event <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        <p className="built-label">Built for your</p>
        <KnowledgeMarquee />
      </section>
    </>
  );
}

function FinalCta(): React.JSX.Element {
  return (
    <section
      className="cta-section"
      data-nav-theme="light"
      style={{ "--cta-image": `url(${process.env.PUBLIC_URL}/landing/cta-texture.webp)` } as React.CSSProperties}
    >
      <h2>Every guest finds their photos tonight</h2>
      <div className="cta-actions">
        <Link className="btn-primary-solid" to="/login">
          Get Started Now
        </Link>
        <Link className="btn-outline" to="/#gallery-demo">
          Try the demo
        </Link>
      </div>
    </section>
  );
}

export default function RagknoLanding(): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [howActive, setHowActive] = useState(0);
  useLandingReveal(rootRef);

  return (
    <div className="home-page ragkno-landing" ref={rootRef}>
      <LandingNav />
      <Hero />
      <FyndrCapabilities />
      <HowFyndrWorks active={howActive} onActive={setHowActive} />
      <GalleryDemo />
      <EventWorkflows />
      <LandingFaq />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}
