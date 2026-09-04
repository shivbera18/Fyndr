import React from "react";
import { useNavigate } from "react-router-dom";
import "../../landing.css";
import Header from "./navbar/Header";
import Footer from "./Footer";
import { Button, Reveal, SectionHead } from "./landing/primitives";

const pillars = [
  { title: "Lightning fast", desc: "Photos matched in under 2 seconds." },
  { title: "Zero app install", desc: "Runs directly in mobile browsers." },
  { title: "Studio branded", desc: "Grow your photography business." },
  { title: "Full resolution", desc: "Original DSLR quality downloads." },
];

const About = (): React.JSX.Element => {
  const navigate = useNavigate();
  return (
    <div>
      <Header />
      <div className="fy-page fy-container">
        <Reveal>
          <SectionHead
            eyebrow="About Fyndr"
            title="Event photo sharing without the friction"
            lede="We're on a mission to eliminate the friction of event photo sharing. Fyndr connects event guests to their memories instantly without bloated apps, passwords, or endless scrolling."
          />
        </Reveal>

        {/* Problem vs Solution */}
        <div className="fy-grid" style={{ marginBottom: "1.25rem" }}>
          <Reveal delay={50}>
            <div className="fy-card">
              <span className="fy-badge">The problem</span>
              <h3 style={{ marginTop: "0.75rem" }}>The 5,000 Photo Dilemma</h3>
              <p>
                Event photographers take thousands of stunning photos, but delivering them is
                painful. Shared cloud links overwhelm guests, forcing them to hunt through
                hundreds of strangers&apos; pictures. Most guests never see their best moments.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="fy-card fy-card-dark">
              <span className="fy-badge fy-badge-brand">The solution</span>
              <h3 style={{ marginTop: "0.75rem" }}>Scan QR → Instant Personal Gallery</h3>
              <p>
                Guests scan a QR code at the table, take a quick selfie, and get every photo
                they appear in within two seconds. High-resolution downloads, complete privacy,
                zero apps.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Privacy Promise */}
        <Reveal delay={150}>
          <div className="fy-card" style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <span className="fy-icon" aria-hidden="true">
                ✓
              </span>
              <div style={{ flex: 1, minWidth: "16rem" }}>
                <strong>Our Strict Privacy Promise</strong>
                <p style={{ margin: "0.25rem 0 0" }}>
                  Guest selfies are processed strictly in real-time to find photos and are
                  immediately discarded. We never sell, store, or train on guest face data.
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* 4 Core Pillars */}
        <Reveal delay={200}>
          <div className="fy-card" style={{ marginBottom: "1.25rem" }}>
            <p className="fy-eyebrow" style={{ marginBottom: "1rem" }}>
              Built on four core pillars
            </p>
            <div className="fy-cards-4">
              {pillars.map((item) => (
                <div key={item.title} className="fy-card">
                  <div style={{ fontSize: "0.8125rem", fontWeight: 700 }}>{item.title}</div>
                  <p className="fy-micro" style={{ margin: "0.375rem 0 0" }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Call to action */}
        <Reveal delay={250}>
          <div style={{ textAlign: "center", padding: "1.25rem 0" }}>
            <Button variant="default" size="lg" onClick={() => navigate("/login")}>
              Start Creating Events Free →
            </Button>
          </div>
        </Reveal>
      </div>
      <Footer />
    </div>
  );
};

export default About;
