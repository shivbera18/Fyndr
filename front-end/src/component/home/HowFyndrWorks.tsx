import { useEffect } from "react";
import { Link } from "react-router-dom";

const STEPS = [
  {
    number: "01",
    title: "Upload the album.",
    text: "Upload DSLR photos to an event once — indexing runs in the background while you shoot.",
  },
  {
    number: "02",
    title: "Guests take a selfie.",
    text: "Guests scan the table QR and snap one selfie in their browser. No app, no account.",
  },
  {
    number: "03",
    title: "Gallery in seconds.",
    text: "Only their photos appear — full-resolution, ready to download and share tonight.",
  },
];

function UploadScene({ on }: { on: boolean }): React.JSX.Element {
  return (
    <div className={`hw-scene hw-bring ${on ? "is-on" : ""}`} aria-hidden="true">
      <span style={{ "--r": "-10deg", "--x": "0px" } as React.CSSProperties}>RAW</span>
      <span style={{ "--r": "7deg", "--x": "18px" } as React.CSSProperties}>JPG</span>
      <span style={{ "--r": "-3deg", "--x": "8px" } as React.CSSProperties}>4K</span>
    </div>
  );
}

function SelfieScene({ on }: { on: boolean }): React.JSX.Element {
  return (
    <div className={`hw-scene hw-find ${on ? "is-on" : ""}`} aria-hidden="true">
      <p className="hw-find-q">Scan QR → selfie</p>
      <p className="hw-find-line">Table 12 group shot</p>
      <p className="hw-find-line is-hit">You, in 14 photos</p>
      <p className="hw-find-line">Dance floor candids</p>
    </div>
  );
}

function GalleryScene({ on }: { on: boolean }): React.JSX.Element {
  return (
    <div className={`hw-scene hw-proof ${on ? "is-on" : ""}`} aria-hidden="true">
      <p>14 photos of you, ready to download.</p>
      <span>Mehta Wedding · QR gallery</span>
    </div>
  );
}

const SCENES = [UploadScene, SelfieScene, GalleryScene];

export default function HowFyndrWorks({
  active,
  onActive,
}: {
  active: number;
  onActive: (next: number | ((prev: number) => number)) => void;
}): React.JSX.Element {
  useEffect(() => {
    const id = window.setInterval(() => {
      onActive((prev: number) => (prev + 1) % STEPS.length);
    }, 3400);
    return () => window.clearInterval(id);
  }, [onActive]);

  return (
    <section id="how-it-works" className="how-it-works-section" data-nav-theme="light" aria-label="How Fyndr works">
      <div className="how-it-works-inner">
        <header className="hw-head">
          <h2>How it works.</h2>
          <p>Three steps, from the camera card to a guest&apos;s phone — before dessert.</p>
        </header>

        <div className="hw-grid">
          {STEPS.map((step, index) => {
            const Scene = SCENES[index];
            const on = active === index;
            return (
              <article
                key={step.number}
                className={`hw-card ${on ? "is-on" : ""}`}
                onMouseEnter={() => onActive(index)}
                onFocus={() => onActive(index)}
                tabIndex={0}
              >
                <Scene on={on} />
                <div className="hw-copy">
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </article>
            );
          })}
        </div>

        <p className="hw-cta">
          <Link to="/login">Create your first event →</Link>
        </p>
      </div>
    </section>
  );
}
