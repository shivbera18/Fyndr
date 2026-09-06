import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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
type ThemeCtx = { theme: Theme; toggle: () => void };

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => void;
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

  const toggle = useCallback(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("theme-transition");
      window.setTimeout(() => {
        document.documentElement.classList.remove("theme-transition");
      }, 450);
    }

    const doc = (typeof document !== "undefined" ? document : null) as DocumentWithViewTransition | null;
    if (doc && typeof doc.startViewTransition === "function") {
      doc.startViewTransition(() => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
      });
    } else {
      setTheme((prev) => (prev === "light" ? "dark" : "light"));
    }
  }, []);

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
      className="relative inline-flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-all duration-300 shadow-sm overflow-hidden"
      onClick={toggle}
      aria-pressed={theme === "dark"}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center transition-all duration-500 ease-out transform select-none text-base",
          theme === "dark"
            ? "rotate-0 scale-100 opacity-100 text-amber-400"
            : "-rotate-90 scale-0 opacity-0 absolute"
        )}
        aria-hidden="true"
      >
        ☀
      </span>
      <span
        className={cn(
          "inline-flex items-center justify-center transition-all duration-500 ease-out transform select-none text-base",
          theme === "dark"
            ? "rotate-90 scale-0 opacity-0 absolute"
            : "rotate-0 scale-100 opacity-100 text-sky-500"
        )}
        aria-hidden="true"
      >
        ☾
      </span>
    </button>
  );
}
