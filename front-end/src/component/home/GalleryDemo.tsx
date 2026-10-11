import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Camera, ChevronDown, QrCode, ScanFace, Sparkles } from "lucide-react";

const DEMOS = [
  {
    id: "bride",
    label: "Bride's family",
    question: "I was in the baraat and stage photos — where are mine?",
    answer:
      "Found 23 photos of you across the baraat, stage, and family groups — including 6 where you are front and center. Full-resolution originals are ready below.",
    sources: [
      { index: 1, title: "Baraat_0142.jpg", detail: "Baraat · matched 0.94", excerpt: "You, dancing left of the groom — red sherwani, marigold backdrop." },
      { index: 2, title: "Stage_Family_0087.jpg", detail: "Stage group · matched 0.91", excerpt: "You, second row center — family blessing moment under the chandelier." },
    ],
  },
  {
    id: "friend",
    label: "College friends",
    question: "Just our table's group shots from sangeet night?",
    answer:
      "Found 14 group shots with you from Table 12 — sangeet performances, dance floor, and the midnight photo booth strip.",
    sources: [
      { index: 1, title: "Sangeet_Table12_0031.jpg", detail: "Table group · matched 0.93", excerpt: "All eight of you mid-toast, stage lights in the background." },
      { index: 2, title: "DanceFloor_0219.jpg", detail: "Candid · matched 0.89", excerpt: "You and two friends laughing at the edge of the dance floor." },
    ],
  },
  {
    id: "couple",
    label: "The couple",
    question: "Every portrait of just the two of us?",
    answer:
      "Found 41 couple portraits — sunset lawn, mandap close-ups, and the sparkler exit. The full-res set is queued for download.",
    sources: [
      { index: 1, title: "Portraits_Sunset_0004.jpg", detail: "Golden hour · matched 0.97", excerpt: "Silhouette against the sunset lawn, veils in the wind." },
      { index: 2, title: "Mandap_Closeup_0112.jpg", detail: "Ceremony · matched 0.95", excerpt: "Exchange-of-garlands close-up, 85mm shallow depth." },
    ],
  },
];

function CitedAnswer({ item }: { item: (typeof DEMOS)[number] }): React.JSX.Element {
  return (
    <p>
      {item.answer} <button type="button" className="demo-inline-citation">[1]</button>{" "}
      <button type="button" className="demo-inline-citation">[2]</button>
    </p>
  );
}

export default function GalleryDemo(): React.JSX.Element {
  const [activeId, setActiveId] = useState(DEMOS[0].id);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const reduceMotion = useReducedMotion();
  const active = DEMOS.find((item) => item.id === activeId) || DEMOS[0];

  const selectDemo = (id: string) => {
    setActiveId(id);
    setSourcesOpen(false);
    setDraft("");
  };

  const submitDemo = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    const normalized = draft.toLowerCase();
    const next = DEMOS.find(
      (item) => item.question.toLowerCase().includes(normalized) || item.label.toLowerCase().includes(normalized)
    );
    if (next) selectDemo(next.id);
  };

  return (
    <section id="gallery-demo" className="chat-demo-section" data-nav-theme="light" aria-labelledby="gallery-demo-title">
      <div className="chat-demo-wave" aria-hidden="true">
        <div className="chat-demo-wave-glow" />
        <svg viewBox="0 0 1440 980" preserveAspectRatio="none">
          <defs>
            <linearGradient id="fy-wave-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#0ea5e9" />
              <stop offset="0.58" stopColor="#7dd3fc" />
              <stop offset="1" stopColor="#e0f2fe" />
            </linearGradient>
            <linearGradient id="fy-wave-center" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#e0f2fe" />
              <stop offset="0.48" stopColor="#ffffff" />
              <stop offset="1" stopColor="#dbeafe" />
            </linearGradient>
            <linearGradient id="fy-wave-bottom" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#bae6fd" />
              <stop offset="0.55" stopColor="#38bdf8" />
              <stop offset="1" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <path className="chat-wave-layer chat-wave-layer-top" fill="url(#fy-wave-top)" d="M-120 190C170 22 384-56 660 60s420 210 900 60v860H-120z" />
          <path className="chat-wave-layer chat-wave-layer-center" fill="url(#fy-wave-center)" d="M-120 258c264 30 390-40 660 30s420 170 900 40v652H-120z" />
          <path className="chat-wave-layer chat-wave-layer-bottom" fill="url(#fy-wave-bottom)" d="M-120 601c293 25 417-45 660 10s420 140 900 30v339H-120z" />
        </svg>
      </div>
      <div className="chat-demo-inner">
        <div className="section-head-light">
          <span className="section-badge-light"><Sparkles size={12} /> SELFIE SEARCH</span>
          <h2 id="gallery-demo-title">Scan. Snap.<br />Your photos appear.</h2>
          <p>Fyndr matches one guest selfie against the whole album and keeps full-resolution downloads one tap away.</p>
        </div>

        <motion.div
          className="premium-chat-demo"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="premium-chat-status"><span><i /> Fyndr gallery · live demo</span><span>Face search · full-res</span></div>

          <div className="premium-chat-body">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                className="premium-chat-exchange"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <div className="premium-user-message">{active.question}</div>
                <article className="premium-assistant-answer">
                  <div className="premium-answer-mark">
                    <ScanFace size={17} />
                  </div>
                  <div>
                    <button type="button" className="premium-source-toggle" onClick={() => setSourcesOpen((value) => !value)}>
                      <Camera size={14} /> {active.sources.length} matched photos <ChevronDown size={14} className={sourcesOpen ? "open" : ""} />
                    </button>
                    <CitedAnswer item={active} />
                    <AnimatePresence initial={false}>
                      {sourcesOpen && (
                        <motion.div
                          className="premium-source-grid"
                          initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {active.sources.map((source) => (
                            <article key={source.index} className="premium-source-card">
                              <header><QrCode size={14} /><strong>[{source.index}] {source.title}</strong></header>
                              <small>{source.detail}</small>
                              <p>{source.excerpt}</p>
                            </article>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </article>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="premium-chat-controls">
            <div className="premium-suggestions" aria-label="Sample guest searches">
              {DEMOS.map((item) => (
                <button key={item.id} type="button" className={item.id === active.id ? "active" : ""} onClick={() => selectDemo(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <form className="premium-demo-composer" onSubmit={submitDemo}>
              <ScanFace size={17} />
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Describe your photos — try “baraat”…" />
              <button type="submit" aria-label="Submit demo search"><ArrowUp size={17} /></button>
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
