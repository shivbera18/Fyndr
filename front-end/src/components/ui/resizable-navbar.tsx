import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import { Menu, X } from "lucide-react";
import { cn } from "../../lib/utils";

export interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

export interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

export interface NavItem {
  name: string;
  link: string;
  external?: boolean;
}

export interface NavItemsProps {
  items: NavItem[];
  className?: string;
  onItemClick?: () => void;
}

export interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

export interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose?: () => void;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState<boolean>(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 30) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  });

  return (
    <motion.header
      ref={ref}
      className={cn(
        "sticky inset-x-0 top-0 z-40 w-full transition-all duration-200 py-2.5",
        className
      )}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible }
            )
          : child
      )}
    </motion.header>
  );
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  return (
    <motion.div
      animate={{
        width: visible ? "min(100%, 920px)" : "min(100%, 980px)",
        y: visible ? 4 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 240,
        damping: 30,
      }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full flex-row items-center justify-between self-start rounded-full px-4 py-2 border border-neutral-200/80 dark:border-neutral-800/80 bg-background/80 dark:bg-neutral-900/80 shadow-xs backdrop-blur-md lg:flex",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "relative hidden flex-row items-center justify-center space-x-1 text-sm font-medium text-muted-foreground lg:flex",
        className
      )}
    >
      {items.map((item, idx) => {
        const isExternal = item.external || item.link.startsWith("http");

        const content = (
          <>
            {hovered === idx && (
              <motion.div
                layoutId="nav-hovered"
                className="absolute inset-0 h-full w-full rounded-full bg-accent/60"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-20 transition-colors">{item.name}</span>
          </>
        );

        if (isExternal) {
          return (
            <a
              key={`link-${idx}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHovered(idx)}
              onClick={onItemClick}
              className="relative px-3.5 py-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            >
              {content}
            </a>
          );
        }

        return (
          <Link
            key={`link-${idx}`}
            to={item.link}
            onMouseEnter={() => setHovered(idx)}
            onClick={onItemClick}
            className="relative px-3.5 py-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            {content}
          </Link>
        );
      })}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <motion.div
      animate={{
        width: visible ? "calc(100% - 1.5rem)" : "calc(100% - 1rem)",
        y: visible ? 4 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 240,
        damping: 30,
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-1rem)] flex-col items-center justify-between rounded-full px-4 py-2 border border-neutral-200/80 dark:border-neutral-800/80 bg-background/90 dark:bg-neutral-900/90 shadow-xs backdrop-blur-md lg:hidden",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between gap-2",
        className
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "absolute inset-x-0 top-full mt-2 z-50 flex w-full flex-col items-start justify-start gap-4 rounded-2xl border border-border bg-background/95 p-5 shadow-xl backdrop-blur-md",
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border border-border/70 bg-background/80 p-2 text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "button",
  children,
  className,
  variant = "primary",
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
} & (
  | React.ComponentPropsWithoutRef<"a">
  | React.ComponentPropsWithoutRef<"button">
)) => {
  const baseStyles =
    "px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold relative cursor-pointer transition-all duration-150 inline-flex items-center justify-center text-center";

  const variantStyles = {
    primary:
      "bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98]",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
    outline:
      "border border-border bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
    ghost: "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50",
  };

  return (
    <Tag
      href={href || undefined}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Tag>
  );
};
