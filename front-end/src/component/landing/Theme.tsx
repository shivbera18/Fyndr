import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { cn } from "../../lib/utils";

export type Theme = "light" | "dark";
export function SunIcon({ className = "h-4 w-4" }: { className?: string }): React.JSX.Element {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 256 256"
      aria-hidden="true"
    >
      <path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z" />
    </svg>
  );
}

export function MoonIcon({ className = "h-4 w-4" }: { className?: string }): React.JSX.Element {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 256 256"
      aria-hidden="true"
    >
      <path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z" />
    </svg>
  );
}

const STORAGE_KEY = "fy-theme";

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* private mode — fall through to system */
  }
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)")?.matches
  ) {
    return "dark";
  }
  return "light";
}
type ThemeCtx = { theme: Theme; toggle: (e?: React.MouseEvent) => void };

type ViewTransitionObject = {
  ready?: Promise<void>;
  finished?: Promise<void>;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => ViewTransitionObject;
};

const Ctx = createContext<ThemeCtx>({ theme: "light", toggle: () => {} });

/* System-aware theme provider — same class strategy as openstatus
   ThemeProvider (next-themes), without the dependency: the theme lives
   on <html data-theme> and tokens follow via CSS vars. */
export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* private mode — theme still applies for the session */
    }
  }, [theme]);

  const toggle = useCallback(
    (e?: React.MouseEvent) => {
      const doc = (typeof document !== "undefined" ? document : null) as DocumentWithViewTransition | null;

      const canAnimate =
        doc &&
        typeof doc.startViewTransition === "function" &&
        typeof window !== "undefined" &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!canAnimate) {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
        return;
      }

      const x = e?.clientX ?? (typeof window !== "undefined" ? window.innerWidth / 2 : 0);
      const y = e?.clientY ?? 0;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = doc.startViewTransition!(() => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
      });

      if (transition && "ready" in transition && transition.ready) {
        transition.ready
          .then(() => {
            const clipPath = [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ];
            document.documentElement.animate(
              {
                clipPath: theme === "dark" ? [...clipPath].reverse() : clipPath,
              },
              {
                duration: 400,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
                pseudoElement:
                  theme === "dark"
                    ? "::view-transition-old(root)"
                    : "::view-transition-new(root)",
              }
            );
          })
          .catch(() => {});
      }
    },
    [theme]
  );

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  return useContext(Ctx);
}

export function ThemeToggle(): React.JSX.Element {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      className="relative inline-flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:text-foreground transition-all duration-200 shadow-sm overflow-hidden active:scale-95 cursor-pointer"
      onClick={(e) => toggle(e)}
      aria-pressed={theme === "dark"}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      <SunIcon
        className={cn(
          "h-4 w-4 text-amber-500 transition-all duration-300 transform",
          theme === "dark"
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0 absolute"
        )}
      />
      <MoonIcon
        className={cn(
          "h-4 w-4 transition-all duration-300 transform",
          theme === "dark"
            ? "rotate-90 scale-0 opacity-0 absolute text-sky-400"
            : "rotate-0 scale-100 opacity-100 text-foreground"
        )}
      />
    </button>
  );

}
