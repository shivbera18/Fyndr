import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, PlusCircle, BarChart3, Sliders, User } from "lucide-react";
import { cn } from "../../lib/utils";

type SessionUser = {
  name?: string;
  email?: string;
};

const NAV_ITEMS = [
  { name: "My Events", link: "/dashboard", icon: Calendar },
  { name: "Create", link: "/create-event", icon: PlusCircle },
  { name: "Analytics", link: "/analytics", icon: BarChart3 },
  { name: "Studio", link: "/settings", icon: Sliders },
  { name: "Account", link: "/account", icon: User },
];

function BottomNav(): React.JSX.Element | null {
  const location = useLocation();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      setUser(raw ? (JSON.parse(raw) as SessionUser) : null);
    } catch {
      setUser(null);
    }
  }, [location]);
  // Only render bottom nav bar on dashboard/photographer routes for logged-in users
  const isDashboardRoute = useMemo(
    () =>
      location.pathname === "/dashboard" ||
      location.pathname === "/events" ||
      location.pathname === "/create-event" ||
      location.pathname === "/analytics" ||
      location.pathname === "/settings",
    [location.pathname]
  );

  if (!user || !isDashboardRoute) return null;

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      // ponytail: solid bg, no backdrop-blur — blur on a fixed bar repaints every scroll frame.
      className="fixed bottom-0 inset-x-0 z-40 bg-background border-t border-border px-3 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.link === "/dashboard"
            ? location.pathname === "/dashboard" || location.pathname === "/events"
            : location.pathname === item.link;
        return (
          <Link
            key={item.name}
            to={item.link}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center min-h-[44px] min-w-[60px] px-2 py-1 rounded-xl text-[11px] font-medium transition-all active:scale-95 no-underline",
              isActive
                ? "text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <Icon className={cn("size-5 mb-0.5", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default React.memo(BottomNav);
