import { LandingAccordion, LandingAccordionContent, LandingAccordionItem, LandingAccordionTrigger } from "./LandingAccordion";

export const FYNDR_FAQS = [
  {
    question: "Do guests need an app or account?",
    answer:
      "No. Guests open the event link or scan the table QR, enter the event PIN if set, and take one selfie in their phone browser. Their matched gallery appears in seconds — nothing to install, no password to remember.",
  },
  {
    question: "Where does the guest selfie go?",
    answer:
      "The selfie is processed in temporary server memory only to compute the face match for the current event, then auto-deleted within 60 seconds. Fyndr stores zero biometric data — no face database, no reuse across events.",
  },
  {
    question: "How fast is the face search?",
    answer:
      "Typically 1–2 seconds per search on albums up to 10,000 photos. Uploads index in the background, so guests can start finding photos while the photographer is still shooting.",
  },
  {
    question: "Do guests get full-resolution photos?",
    answer:
      "Yes. Guests download the original full-quality files the photographer uploaded — straight to their camera roll, ready for Instagram and printing. No watermarks on paid tiers, no compression surprises.",
  },
  {
    question: "Can I brand the gallery with my studio?",
    answer:
      "Yes. Studio name, logo, WhatsApp booking link, and offers appear on every guest&apos;s gallery screen — turning 500 guests into 500 impressions for your next booking.",
  },
  {
    question: "What about group photos and low light?",
    answer:
      "The detector finds multiple faces per frame down to small face sizes, tuned for wedding lighting — stage spots, dim dance floors, outdoor sun. If a guest appears in the frame, the search surfaces it.",
  },
  {
    question: "How do table QR standees work?",
    answer:
      "Each event generates a print-ready QR plus optional PIN tent cards from the dashboard. Place one per table — guests scan, selfie, and download without asking the couple or planner for a link.",
  },
];

export default function LandingFaq({
  badge = "FAQ",
  title = "Common questions, clear answers.",
  description = "Everything you need to know about guest privacy, face search, and studio branding.",
  data = FYNDR_FAQS,
  className = "",
}: {
  badge?: string;
  title?: string;
  description?: string;
  data?: { question: string; answer: string }[];
  className?: string;
}): React.JSX.Element {
  return (
    <section
      id="faq"
      className={`faq-root-section ${className}`.trim()}
      data-nav-theme="light"
      aria-label="Frequently Asked Questions"
    >
      <div className="faq-container">
        <div className="faq-grid">
          <div className="faq-left-col">
            {badge && <div className="faq-badge">{badge}</div>}

            <h2 className="faq-headline">
              {title === "Common questions, clear answers." ? (
                <>
                  Common questions,<br />clear answers.
                </>
              ) : (
                title
              )}
            </h2>

            <p className="faq-desc">{description}</p>
          </div>

          <div className="faq-right-col">
            <LandingAccordion defaultValue="item-0">
              {data.map((item, index) => (
                <LandingAccordionItem key={`faq-${index}`} value={`item-${index}`}>
                  <LandingAccordionTrigger>{item.question}</LandingAccordionTrigger>
                  <LandingAccordionContent>{item.answer}</LandingAccordionContent>
                </LandingAccordionItem>
              ))}
            </LandingAccordion>
          </div>
        </div>
      </div>
    </section>
  );
}
