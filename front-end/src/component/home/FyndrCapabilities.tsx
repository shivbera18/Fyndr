import { useEffect, useRef, useState } from "react";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function useParallax(reduced: boolean): React.RefObject<HTMLElement> {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (reduced) {
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
      return undefined;
    }
    let frame = 0;
    const move = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--px", x.toFixed(3));
        el.style.setProperty("--py", y.toFixed(3));
      });
    };
    const leave = () => {
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
    };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, [reduced]);
  return ref;
}

type Doc = { id: string; name: string; ext: string; x: number; y: number; rel: "high" | "low"; depth: number; dur: string; delay: string };

const MATCH_DOCS: Doc[] = [
  { id: "bride", name: "Bride portraits", ext: "214", x: 14, y: 28, rel: "high", depth: 1.15, dur: "7.2s", delay: "0s" },
  { id: "family", name: "Family groups", ext: "186", x: 84, y: 22, rel: "high", depth: 0.95, dur: "8.4s", delay: "-1.4s" },
  { id: "decor", name: "Decor wide shots", ext: "342", x: 82, y: 78, rel: "low", depth: 0.55, dur: "9s", delay: "-2.2s" },
  { id: "venue", name: "Venue empty halls", ext: "98", x: 14, y: 80, rel: "low", depth: 0.4, dur: "8s", delay: "-0.6s" },
];

function curveBetween(doc: Doc): string {
  const x2 = 50;
  const y2 = 58;
  const mx = (doc.x + x2) / 2;
  const my = (doc.y + y2) / 2;
  const dx = x2 - doc.x;
  const dy = y2 - doc.y;
  return `M ${doc.x} ${doc.y} Q ${mx - dy * 0.15} ${my + dx * 0.12} ${x2} ${y2}`;
}

function MatchCard({ reduced }: { reduced: boolean }): React.JSX.Element {
  const ref = useParallax(reduced);
  const [active, setActive] = useState<string | null>(null);

  return (
    <article ref={ref} className="bx-card bx-card-retrieval" aria-labelledby="bx-match-title" onMouseLeave={() => setActive(null)}>
      <div className="bx-copy">
        <h3 id="bx-match-title">Find every guest.</h3>
        <p>One selfie pulls their photos from a 10,000-shot album in seconds.</p>
      </div>
      <div className="bx-visual">
        <div className="bx-retrieve">
          <div className="bx-retrieve-glow" />
          <svg className="bx-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {MATCH_DOCS.map((doc) => (
              <path key={doc.id} className={`bx-path ${doc.rel} ${active === doc.id ? "is-on" : ""}`} d={curveBetween(doc)} pathLength={1} />
            ))}
          </svg>
          <div className="bx-focal" aria-hidden="true">
            <span className="bx-focal-ring bx-focal-ring-b" />
            <span className="bx-focal-ring bx-focal-ring-a" />
            <span className="bx-focal-core" />
          </div>
          <p className="bx-query">
            Show me in every photo
            <span className="bx-caret" aria-hidden="true" />
          </p>
          {MATCH_DOCS.map((doc) => {
            const toward = doc.rel === "high" ? 0.42 : 0.28;
            const away = doc.rel === "low" ? -0.18 : 0;
            return (
              <div
                key={doc.id}
                className={`bx-doc-slot ${active === doc.id ? "is-on" : ""}`}
                data-rel={doc.rel}
                style={{
                  left: `${doc.x}%`,
                  top: `${doc.y}%`,
                  "--pull-x": `${(50 - doc.x) * toward}px`,
                  "--pull-y": `${(58 - doc.y) * toward}px`,
                  "--away-x": `${(50 - doc.x) * away}px`,
                  "--away-y": `${(58 - doc.y) * away}px`,
                  "--depth": doc.depth,
                  "--dur": doc.dur,
                  "--delay": doc.delay,
                } as React.CSSProperties}
              >
                <div className="bx-doc-float">
                  <div className="bx-doc-shift">
                    <button
                      type="button"
                      className="bx-doc"
                      onMouseEnter={() => setActive(doc.id)}
                      onFocus={() => setActive(doc.id)}
                      onBlur={() => setActive(null)}
                    >
                      <span className="bx-ext">{doc.ext}</span>
                      <span className="bx-doc-name">{doc.name}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

const QR_SOURCES = [
  { id: "qr", name: "Table QR", icon: "QR" },
  { id: "pin", name: "Event PIN", icon: "PIN" },
  { id: "selfie", name: "Selfie", icon: "◉" },
];

const GALLERY_FORMATS = [
  { id: "raw", name: "Full-res JPG", icon: "JPG" },
  { id: "share", name: "WhatsApp share", icon: "⇪" },
  { id: "dl", name: "Instant download", icon: "↓" },
];

function OrbitRing({
  items,
  variant,
  active,
  setActive,
}: {
  items: { id: string; name: string; icon: string }[];
  variant: "outer" | "inner";
  active: string | null;
  setActive: (id: string | null) => void;
}): React.JSX.Element {
  return (
    <div className={`bx-ring bx-ring-${variant}`}>
      {items.map((item, index) => {
        const angle = (360 / items.length) * index + (variant === "inner" ? 36 : 0);
        return (
          <div key={item.id} className="bx-spoke" style={{ transform: `rotate(${angle}deg)` }}>
            <div className="bx-orbit-pos">
              <div className="bx-counter">
                <div className="bx-level" style={{ transform: `rotate(${-angle}deg)` }}>
                  <button
                    type="button"
                    className={`bx-node ${active === item.id ? "is-on" : ""}`}
                    aria-label={item.name}
                    onMouseEnter={() => setActive(item.id)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(item.id)}
                    onBlur={() => setActive(null)}
                  >
                    {item.icon}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CheckinCard(): React.JSX.Element {
  const [active, setActive] = useState<string | null>(null);

  return (
    <article className="bx-card bx-card-orbit" aria-labelledby="bx-checkin-title">
      <div className="bx-visual">
        <div className={`bx-orbit-stage ${active ? "is-live" : ""}`}>
          <div className="bx-track bx-track-outer" />
          <div className="bx-track bx-track-inner" />
          <OrbitRing items={QR_SOURCES} variant="outer" active={active} setActive={setActive} />
          <OrbitRing items={GALLERY_FORMATS} variant="inner" active={active} setActive={setActive} />
          <div className="bx-hub" aria-hidden="true">
            <span>QR</span>
          </div>
        </div>
      </div>
      <div className="bx-copy">
        <h3 id="bx-checkin-title">Scan, snap, delivered.</h3>
        <p>QR check-in plus selfie search — no app, no account, full-resolution downloads.</p>
      </div>
    </article>
  );
}

const FACE_STEPS = [
  { id: "detect", label: "Detect" },
  { id: "match", label: "Match" },
  { id: "deliver", label: "Deliver" },
];

const FACE_ROWS = [
  { id: "you", text: "14 photos matched to this guest.", detect: true, match: true },
  { id: "cousin", text: "Cousin&apos;s family group on stage.", detect: true, match: false },
  { id: "decor", text: "Empty decor wide shot, no faces.", detect: false, match: false },
];

function FaceCard({ reduced }: { reduced: boolean }): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return undefined;
    const id = window.setInterval(() => setStep((current) => (current + 1) % FACE_STEPS.length), 2400);
    return () => window.clearInterval(id);
  }, [reduced, paused]);

  const phase = FACE_STEPS[reduced ? 2 : step].id;

  return (
    <article
      className="bx-card bx-card-intel"
      aria-labelledby="bx-face-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="bx-copy">
        <h3 id="bx-face-title">Face search in seconds.</h3>
        <p>Detect every face, match one guest, deliver only their photos.</p>
      </div>
      <div className="bx-visual">
        <div className={`bx-intel is-${phase}`}>
          <p className="bx-intel-query">
            Find me in this album
            <span className="bx-caret" aria-hidden="true" />
          </p>
          <div className="bx-intel-phases">
            {FACE_STEPS.map((item, index) => (
              <button key={item.id} type="button" className={phase === item.id ? "is-on" : ""} onClick={() => setStep(index)}>
                {item.label}
              </button>
            ))}
            <i style={{ transform: `translateX(${(reduced ? 2 : step) * 100}%)` }} />
          </div>
          <div className="bx-intel-list">
            {FACE_ROWS.map((row) => {
              const on = phase === "deliver" ? row.detect && row.match : phase === "match" ? row.match : row.detect;
              return (
                <p key={row.id} className={`bx-intel-row ${on ? "is-on" : ""} ${phase === "deliver" && !on ? "is-out" : ""}`}>
                  <i aria-hidden="true" />
                  {row.text}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}

const EVENT_NODES = [
  { id: "event", label: "Event", x: 230, y: 150, hub: true },
  { id: "qr", label: "QR scan", x: 58, y: 42 },
  { id: "selfie", label: "Selfie", x: 392, y: 40 },
  { id: "gallery", label: "Gallery", x: 414, y: 168 },
  { id: "download", label: "Download", x: 52, y: 236 },
  { id: "lead", label: "Studio lead", x: 286, y: 272 },
];

const EVENT_EDGES: [string, string][] = [
  ["event", "qr"],
  ["event", "selfie"],
  ["event", "gallery"],
  ["event", "download"],
  ["event", "lead"],
  ["qr", "selfie"],
  ["selfie", "gallery"],
  ["gallery", "download"],
  ["gallery", "lead"],
];

function JourneyCard({ reduced }: { reduced: boolean }): React.JSX.Element {
  const ref = useParallax(reduced);
  const [active, setActive] = useState<string | null>(null);
  const nodeById: Record<string, (typeof EVENT_NODES)[number]> = Object.fromEntries(
    EVENT_NODES.map((node) => [node.id, node])
  );
  const related: Record<string, true> = {};
  if (active) {
    related[active] = true;
    EVENT_EDGES.forEach(([from, to]) => {
      if (from === active) related[to] = true;
      if (to === active) related[from] = true;
    });
  }
  const focus = active ? nodeById[active] : null;
  const shift = focus ? `translate(${(focus.x - 230) / 16}px, ${(focus.y - 148) / 16}px)` : "translate(0px, 0px)";

  return (
    <article ref={ref} className="bx-card bx-card-graph" aria-labelledby="bx-journey-title">
      <div className="bx-copy">
        <h3 id="bx-journey-title">The night, connected.</h3>
        <p>QR scan, selfie, gallery, download, and your studio lead — one guest journey.</p>
      </div>
      <div className="bx-visual">
        <div className="bx-graph-visual">
          <div className="bx-graph-parallax">
            <div className="bx-graph-shift" style={{ transform: shift }}>
              <svg className="bx-graph-svg" viewBox="0 0 460 300" role="img" aria-label="Guest journey">
                {EVENT_EDGES.map(([from, to]) => {
                  const a = nodeById[from];
                  const b = nodeById[to];
                  const hot = active !== null && related[from] && related[to];
                  const dim = active !== null && !hot;
                  return (
                    <line
                      key={`${from}-${to}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      className={`bx-edge ${hot ? "is-hot" : ""} ${dim ? "is-dim" : ""}`}
                    />
                  );
                })}
                {EVENT_NODES.map((node) => {
                  const on = active === node.id;
                  const dim = active !== null && !related[node.id];
                  const fill = dim ? "rgba(255,255,255,0.28)" : "#f4f4f4";
                  return (
                    <g
                      key={node.id}
                      className="bx-g-node"
                      tabIndex={0}
                      role="button"
                      aria-label={node.label}
                      onMouseEnter={() => setActive(node.id)}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive(node.id)}
                      onBlur={() => setActive(null)}
                    >
                      {node.hub && <circle cx={node.x} cy={node.y} r="34" fill="rgba(255,255,255,0.035)" />}
                      {node.hub && (
                        <circle cx={node.x} cy={node.y} r="24" fill="none" stroke={on || !dim ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)"} strokeWidth={1.2} />
                      )}
                      <circle cx={node.x} cy={node.y} r="16" fill="transparent" />
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.hub ? 15 : on ? 6 : 4.5}
                        fill={node.hub ? "#101010" : fill}
                        stroke={node.hub ? "rgba(255,255,255,0.55)" : "transparent"}
                        strokeWidth={node.hub ? 1.2 : 0}
                      />
                      <text
                        className={`bx-g-label ${node.hub ? "hub" : ""}`}
                        x={node.x}
                        y={node.hub ? node.y + 36 : node.y - 14}
                        textAnchor="middle"
                        fill={dim ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.86)"}
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

const WHISPERS = [
  { id: "near", text: "Bride and groom portraits at sunset.", level: "mid", x: "28%", y: "28%", depth: 0.55 },
  { id: "stage", text: "Stage performance wide shot", level: "low", x: "80%", y: "20%", depth: 1 },
  { id: "table", text: "Table 12 group photo", level: "low", x: "78%", y: "82%", depth: 0.75 },
  { id: "hall", text: "Empty hall before guests", level: "low", x: "20%", y: "80%", depth: 0.85 },
];

function SearchCard({ reduced }: { reduced: boolean }): React.JSX.Element {
  const ref = useParallax(reduced);
  return (
    <article ref={ref} className="bx-card bx-card-search" aria-labelledby="bx-search-title">
      <div className="bx-copy">
        <h3 id="bx-search-title">Search by face.</h3>
        <p>Find yourself instead of scrolling thousands of strangers&apos; photos.</p>
      </div>
      <div className="bx-visual">
        <div className="bx-search-stage">
          <p className="bx-search-query">table 12 · sangeet night</p>
          <div className="bx-search-field">
            <span className="bx-search-link" aria-hidden="true" />
            {WHISPERS.map((item) => (
              <p
                key={item.id}
                className="bx-whisper"
                data-level={item.level}
                style={{ "--x": item.x, "--y": item.y, "--depth": item.depth } as React.CSSProperties}
              >
                <span className="bx-whisper-shift">{item.text}</span>
              </p>
            ))}
            <p className="bx-hit">
              <span className="bx-hit-em">You, center frame</span> — Table 12 group, sangeet night.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

const TRUST_SOURCES = [
  { id: "qr", name: "Table QR scan", ext: "QR", pos: "q3" },
  { id: "selfie", name: "Guest selfie", ext: "SELF", pos: "policy" },
  { id: "album", name: "Event album", ext: "10K", pos: "finance" },
  { id: "share", name: "Download link", ext: "JPG", pos: "product" },
];

const TRUST_ORDER = ["qr", "selfie", "album", "share"];

function PrivacyCard({ reduced }: { reduced: boolean }): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const active = hovered || TRUST_ORDER[reduced ? 0 : step];

  useEffect(() => {
    if (reduced || hovered) return undefined;
    const id = window.setInterval(() => {
      setStep((current) => (current + 1) % TRUST_ORDER.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [reduced, hovered]);

  return (
    <article className="bx-card bx-card-trust" aria-labelledby="bx-privacy-title">
      <div className="bx-copy">
        <h3 id="bx-privacy-title">Private by design.</h3>
        <p>Selfies live in RAM for the match, then auto-delete. No biometric storage.</p>
      </div>
      <div className="bx-visual">
        <div className="bx-trust-field is-live">
          {TRUST_SOURCES.map((source) => (
            <div key={source.id} className={`bx-source-pos ${source.pos}`}>
              <button
                type="button"
                className={`bx-source ${active === source.id ? "is-on" : ""}`}
                onMouseEnter={() => setHovered(source.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(source.id)}
                onBlur={() => setHovered(null)}
              >
                <span className="bx-source-ext">{source.ext}</span>
                {source.name}
                <span className="bx-check" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path d="M2 5.2 4 7.2 8 2.8" fill="none" stroke="#141414" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            </div>
          ))}
          <div className="bx-answer-wrap">
            <p className="bx-question">Where does my selfie go?</p>
            <p className="bx-answer">
              <span className="bx-em is-on">Matched in memory</span> then{" "}
              <span className="bx-em is-on">deleted in 60 seconds</span> — nothing stored.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function FyndrCapabilities(): React.JSX.Element {
  const reduced = useReducedMotion();

  return (
    <section id="capabilities" className="bento-section" data-nav-theme="dark" aria-label="Fyndr capabilities">
      <div className="bento-inner">
        <div className="section-head-dark">
          <h2>Core capabilities.</h2>
          <p>Six working parts of the scan-snap-deliver workflow.</p>
        </div>

        <div className="bx-grid">
          <MatchCard reduced={reduced} />
          <CheckinCard />
          <FaceCard reduced={reduced} />
          <JourneyCard reduced={reduced} />
          <SearchCard reduced={reduced} />
          <PrivacyCard reduced={reduced} />
        </div>
      </div>
    </section>
  );
}
