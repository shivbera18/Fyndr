import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "../../lib/utils";

export type Theme = "light" | "dark";

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
      className="relative inline-flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm overflow-hidden"
      onClick={(e) => toggle(e)}
      aria-pressed={theme === "dark"}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center transition-all duration-300 ease-out transform select-none",
          theme === "dark"
            ? "rotate-0 scale-100 opacity-100 text-amber-400"
            : "-rotate-90 scale-0 opacity-0 absolute"
        )}
        aria-hidden="true"
      >
        <Sun className="h-4 w-4" />
      </span>
      <span
        className={cn(
          "inline-flex items-center justify-center transition-all duration-300 ease-out transform select-none",
          theme === "dark"
            ? "rotate-90 scale-0 opacity-0 absolute"
            : "rotate-0 scale-100 opacity-100 text-sky-500"
        )}
        aria-hidden="true"
      >
        <Moon className="h-4 w-4" />
      </span>
    </button>
  );

}
