import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";

type LandingAccordionProps = {
  children: React.ReactNode;
  type?: "single";
  collapsible?: boolean;
  defaultValue?: string | null;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

const LandingAccordionContext = React.createContext<{
  handleToggle: (itemValue: string) => void;
  isItemOpen: (itemValue: string) => boolean;
} | null>(null);

const LandingAccordionItemContext = React.createContext<{ value: string; isOpen: boolean } | null>(null);

export function LandingAccordion({
  children,
  defaultValue = null,
  value,
  onValueChange,
  className = "",
}: LandingAccordionProps): React.JSX.Element {
  const [internalValue, setInternalValue] = React.useState<string | null>(defaultValue);
  const activeValue = value !== undefined ? value : internalValue;

  const handleToggle = (itemValue: string) => {
    const next = activeValue === itemValue ? null : itemValue;
    if (value === undefined) setInternalValue(next);
    if (next !== null) onValueChange?.(next);
  };

  const isItemOpen = (itemValue: string) => activeValue === itemValue;

  return (
    <LandingAccordionContext.Provider value={{ handleToggle, isItemOpen }}>
      <div className={cn("faq-accordion-list", className)}>{children}</div>
    </LandingAccordionContext.Provider>
  );
}

export function LandingAccordionItem({
  value,
  children,
  className = "",
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  const context = React.useContext(LandingAccordionContext);
  if (!context) throw new Error("LandingAccordionItem must be used within LandingAccordion");
  const isOpen = context.isItemOpen(value);
  return (
    <LandingAccordionItemContext.Provider value={{ value, isOpen }}>
      <div className={cn("faq-accordion-item", className)}>{children}</div>
    </LandingAccordionItemContext.Provider>
  );
}

export function LandingAccordionTrigger({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  const accordionContext = React.useContext(LandingAccordionContext);
  const itemContext = React.useContext(LandingAccordionItemContext);
  if (!accordionContext || !itemContext) throw new Error("LandingAccordionTrigger must be used within LandingAccordionItem");
  const { handleToggle } = accordionContext;
  const { value, isOpen } = itemContext;
  return (
    <button type="button" onClick={() => handleToggle(value)} aria-expanded={isOpen} className={cn("faq-trigger-btn", className)}>
      <span className="faq-question-text">{children}</span>
      <span className={cn("faq-icon-box", isOpen && "is-open")}>
        <motion.span className="faq-icon-symbol" animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.22, ease: "easeInOut" }}>
          +
        </motion.span>
      </span>
    </button>
  );
}

export function LandingAccordionContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  const itemContext = React.useContext(LandingAccordionItemContext);
  if (!itemContext) throw new Error("LandingAccordionContent must be used within LandingAccordionItem");
  const { isOpen } = itemContext;
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="content"
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: "auto",
            opacity: 1,
            transition: {
              height: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.2, delay: 0.05 },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.12 },
            },
          }}
          className="faq-content-box"
        >
          <div className={cn("faq-answer-inner", className)}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
