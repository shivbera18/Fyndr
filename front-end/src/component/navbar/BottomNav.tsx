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
      location.pathname === "/settings" ||
      location.pathname === "/account",
    [location.pathname]
  );

  if (!user || !isDashboardRoute) return null;

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      // ponytail: solid bg, no backdrop-blur — blur on a fixed bar repaints every scroll frame.
      className="flex flex-row items-stretch justify-around fixed bottom-0 inset-x-0 z-40 bg-background border-t border-black/10 px-3 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden"
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
              "relative flex flex-col items-center justify-center min-h-[44px] min-w-[60px] px-2 py-1 rounded-xl text-[11px] tracking-wide transition-all active:scale-95 no-underline",
              isActive
                ? "text-foreground font-semibold bg-black/[0.06] dark:bg-white/10"
                : "text-muted-foreground font-medium hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/10"
            )}
          >
            <Icon className={cn("size-5 mb-0.5", isActive ? "text-foreground" : "text-muted-foreground")} aria-hidden="true" />
            <span>{item.name}</span>
            {isActive && (
              <span aria-hidden="true" className="absolute top-1 h-1 w-1 rounded-full bg-foreground" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default React.memo(BottomNav);
