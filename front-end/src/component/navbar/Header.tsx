import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
  NavItem,
} from "../../components/ui/resizable-navbar";
import { LogoMark } from "../brand/LogoMark";
import { ThemeToggle } from "../landing/Theme";

function Logo(): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className="h-[32px] w-[32px]" />
      <span className="font-sans font-bold text-lg tracking-tight text-foreground">
        FYNDR
      </span>
    </span>
  );
}

type SessionUser = {
  name?: string;
  email?: string;
};

function getNavItems(pathname: string, user: SessionUser | null): NavItem[] {
  // 1. Landing Page (/) -> exact landing page options
  if (pathname === "/") {
    return [
      { name: "Overview", link: "/" },
      { name: "Features", link: "/#features" },
      { name: "How it works", link: "/#how-it-works" },
      { name: "Pricing", link: "/#pricing" },
      { name: "Dashboard", link: "/dashboard" },
    ];
  }

  // 2. Dashboard / My Events (/dashboard, /events)
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/events")) {
    return [
      { name: "My Events", link: "/dashboard" },
      { name: "Create Event", link: "/create-event" },
      { name: "Studio Analytics", link: "/analytics" },
      { name: "Settings", link: "/settings" },
      { name: "Home", link: "/" },
    ];
  }

  // 3. Create Event page (/create-event)
  if (pathname.startsWith("/create-event")) {
    return [
      { name: "My Events", link: "/dashboard" },
      { name: "Create Event", link: "/create-event" },
      { name: "Studio Analytics", link: "/analytics" },
      { name: "Settings", link: "/settings" },
      { name: "Home", link: "/" },
    ];
  }

  // 4. Analytics page (/analytics)
  if (pathname.startsWith("/analytics")) {
    return [
      { name: "Studio Analytics", link: "/analytics" },
      { name: "My Events", link: "/dashboard" },
      { name: "Create Event", link: "/create-event" },
      { name: "Settings", link: "/settings" },
      { name: "Home", link: "/" },
    ];
  }

  // 5. Settings page (/settings)
  if (pathname.startsWith("/settings")) {
    return [
      { name: "Settings", link: "/settings" },
      { name: "My Events", link: "/dashboard" },
      { name: "Create Event", link: "/create-event" },
      { name: "Studio Analytics", link: "/analytics" },
      { name: "Home", link: "/" },
    ];
  }

  // 6. Event photo selection / gallery (/select)
  if (pathname.startsWith("/select")) {
    return [
      { name: "Dashboard", link: "/dashboard" },
      { name: "Event Gallery", link: pathname },
      { name: "How it works", link: "/about" },
      { name: "Home", link: "/" },
    ];
  }

  // 7. Guest scan / selfie (/collect, /camera)
  if (pathname.startsWith("/collect") || pathname.startsWith("/camera")) {
    return [
      { name: "Find Photos", link: pathname },
      { name: "How it works", link: "/about" },
    ];
  }

  // 8. About / others
  return [
    { name: "Overview", link: "/" },
    { name: "How it works", link: "/about" },
    { name: "Dashboard", link: "/dashboard" },
  ];
}


export default function Header(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = getNavItems(location.pathname, user);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      setUser(raw ? (JSON.parse(raw) as SessionUser) : null);
    } catch {
      setUser(null);
    }
    setMobileOpen(false);
  }, [location]);

  const logout = () => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch {}
    setUser(null);
    navigate("/login");
  };

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item: NavItem
  ) => {
    if (item.link.includes("#")) {
      const hash = item.link.split("#")[1];
      if (location.pathname === "/") {
        e.preventDefault();
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
        window.history.pushState(null, "", item.link);
      }
    } else if (item.link === "/" && location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.pushState(null, "", "/");
    }
  };

  return (
    <Navbar>
      {/* Desktop Resizable Floating Nav */}
      <NavBody>
        <Link to="/" className="no-underline text-inherit flex items-center pr-2">
          <Logo />
        </Link>

        <NavItems items={navItems} onItemClick={handleNavClick} />

        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              {location.pathname === "/" ? (
                <Button
                  size="sm"
                  className="rounded-full px-4 h-9 font-semibold text-xs shadow-xs"
                  onClick={() => navigate("/dashboard")}
                >
                  Dashboard
                </Button>
              ) : (
                <span className="hidden sm:inline-block text-xs font-medium text-muted-foreground px-1">
                  {user.name || "Photographer"}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full px-3.5 h-9 font-medium text-xs text-muted-foreground hover:text-foreground"
                onClick={logout}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full px-3.5 h-9 font-medium text-xs text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/login")}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                className="rounded-full px-4 h-9 font-semibold text-xs shadow-sm"
                onClick={() => navigate("/login")}
              >
                Get started
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
      </NavBody>

      {/* Mobile Resizable Nav */}
      <MobileNav>
        <MobileNavHeader>
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="no-underline text-inherit flex items-center"
          >
            <Logo />
          </Link>

          <div className="flex items-center gap-2">
            <MobileNavToggle
              isOpen={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
            />
            <ThemeToggle />
          </div>
        </MobileNavHeader>

        <MobileNavMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)}>
          <nav className="flex w-full flex-col gap-1" aria-label="Mobile Navigation">
            {navItems.map((item) =>
              item.external ? (
                <a
                  key={item.name}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    setMobileOpen(false);
                    handleNavClick(e, item);
                  }}
                  className="flex min-h-[44px] items-center px-3.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  {item.name}
                </a>
              ) : (
                <Link
                  key={item.name}
                  to={item.link}
                  onClick={(e) => {
                    setMobileOpen(false);
                    handleNavClick(e, item);
                  }}
                  className="flex min-h-[44px] items-center px-3.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  {item.name}
                </Link>
              )
            )}
          </nav>

          <div className="flex w-full flex-col gap-2 pt-3 border-t border-border">
            {user ? (
              <>
                <Button
                  variant="secondary"
                  className="w-full min-h-[44px] rounded-xl font-semibold"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate("/dashboard");
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] rounded-xl"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] rounded-xl font-medium"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate("/login");
                  }}
                >
                  Sign in
                </Button>
                <Button
                  className="w-full min-h-[44px] rounded-xl font-semibold shadow-sm"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate("/login");
                  }}
                >
                  Get started
                </Button>
              </>
            )}
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
