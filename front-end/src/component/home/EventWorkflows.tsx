import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BookOpen, Camera, Check, PartyPopper, QrCode } from "lucide-react";
import { LandingAccordion, LandingAccordionContent, LandingAccordionItem, LandingAccordionTrigger } from "./LandingAccordion";

const WORKFLOWS = [
  {
    id: "weddings",
    number: "01",
    title: "Weddings & sangeets",
    icon: Camera,
    prompt: "\u201CHow do 500 guests get their photos before the night ends?\u201D",
    description:
      "Print table QR standees, let guests selfie-search during dinner, and watch full-res downloads happen on the dance floor.",
    outcome: ["QR standees in one click", "Selfie search, no app", "Full-res downloads tonight"],
    formats: ["Baraat", "Stage groups", "Candids", "Portraits"],
  },
  {
    id: "corporate",
    number: "02",
    title: "Conferences & galas",
    icon: QrCode,
    prompt: "\u201CCan 2,000 attendees find their headshots without our team sorting?\u201D",
    description:
      "One event link per gala — execs scan badgeside QR codes and leave with their portraits and panel shots.",
    outcome: ["Badge-side QR codes", "Zero manual tagging", "Sponsor-ready galleries"],
    formats: ["Keynotes", "Panels", "Headshots", "Receptions"],
  },
  {
    id: "parties",
    number: "03",
    title: "Birthdays & anniversaries",
    icon: PartyPopper,
    prompt: "\u201CEveryone wants their family group — without texting me for weeks.\u201D",
    description:
      "Share one gallery link in the family group. Grandparents selfie-search once and keep every generation&apos;s photos.",
    outcome: ["One link for everyone", "Grandparent-simple flow", "No follow-up texts"],
    formats: ["Family groups", "Cake moments", "Decor", "Dance floor"],
  },
  {
    id: "sports",
    number: "04",
    title: "Marathons & meets",
    icon: BookOpen,
    prompt: "\u201CCan 5,000 runners find finish-line photos without bib numbers?\u201D",
    description:
      "Face search beats bib OCR in crowds and bad light — runners selfie-search at the finish village and share instantly.",
    outcome: ["No bib-number errors", "Works in crowds", "Instant social sharing"],
    formats: ["Start line", "Mid-race", "Finish", "Podium"],
  },
];

function WorkflowDetail({ workflow }: { workflow: (typeof WORKFLOWS)[number] }): React.JSX.Element {
  const Icon = workflow.icon;
  return (
    <div className="workflow-detail-inner">
      <div className="workflow-detail-icon"><Icon size={21} /></div>
      <p className="workflow-prompt">{workflow.prompt}</p>
      <h3>{workflow.title}</h3>
      <p className="workflow-description">{workflow.description}</p>
      <div className="workflow-proof-list">
        {workflow.outcome.map((item) => <span key={item}><Check size={14} /> {item}</span>)}
      </div>
      <div className="workflow-formats">{workflow.formats.map((item) => <span key={item}>{item}</span>)}</div>
    </div>
  );
}

export default function EventWorkflows(): React.JSX.Element {
  const [activeId, setActiveId] = useState(WORKFLOWS[0].id);
  const reduceMotion = useReducedMotion();
  const active = WORKFLOWS.find((item) => item.id === activeId) || WORKFLOWS[0];

  return (
    <section className="use-cases-section" data-nav-theme="dark" aria-labelledby="events-title">
      <div className="use-cases-inner">
        <div className="section-head-dark editorial-workflow-head">
          <span className="section-badge-dark"><BookOpen size={12} /> EVERY KIND OF EVENT</span>
          <h2 id="events-title">One face search.<br />Every celebration.</h2>
          <p>Fyndr fits wherever guests want their photos tonight — not in a Drive link next week.</p>
        </div>

        <div className="workflow-desktop">
          <div className="workflow-tabs" role="tablist" aria-label="Event workflows">
            {WORKFLOWS.map((workflow) => {
              const Icon = workflow.icon;
              const selected = workflow.id === active.id;
              return (
                <button
                  key={workflow.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`workflow-panel-${workflow.id}`}
                  className={selected ? "active" : ""}
                  onClick={() => setActiveId(workflow.id)}
                >
                  <span>{workflow.number}</span><Icon size={18} /><strong>{workflow.title}</strong>
                </button>
              );
            })}
          </div>
          <div className="workflow-panel" role="tabpanel" id={`workflow-panel-${active.id}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={reduceMotion ? false : { opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -12 }}
                transition={{ duration: 0.28 }}
              >
                <WorkflowDetail workflow={active} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <LandingAccordion defaultValue={WORKFLOWS[0].id} className="workflow-mobile">
          {WORKFLOWS.map((workflow) => (
            <LandingAccordionItem key={workflow.id} value={workflow.id} className="workflow-mobile-item">
              <LandingAccordionTrigger className="workflow-mobile-trigger"><span>{workflow.number}</span>{workflow.title}</LandingAccordionTrigger>
              <LandingAccordionContent className="workflow-mobile-content"><WorkflowDetail workflow={workflow} /></LandingAccordionContent>
            </LandingAccordionItem>
          ))}
        </LandingAccordion>
      </div>
    </section>
  );
}
