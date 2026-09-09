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
import AccountMenu from "./AccountMenu";
import { User } from "lucide-react";
import { PWAInstallButton } from "../../components/pwa";
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
  _id?: string;
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

  // 2. Photographer pages — stable order, no Home (logo links home)
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/create-event") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/account")
  ) {
    return [
      { name: "My Events", link: "/dashboard" },
      { name: "Create Event", link: "/create-event" },
      { name: "Studio Analytics", link: "/analytics" },
      { name: "Settings", link: "/settings" },
    ];
  }

  // 6. Event photo selection / gallery (/select)
  if (pathname.startsWith("/select")) {
    return [
      { name: "Dashboard", link: "/dashboard" },
      { name: "Event Gallery", link: pathname },
      { name: "How it works", link: "/about" },
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
    const loadUser = () => {
      try {
        const raw = localStorage.getItem("user");
        setUser(raw ? (JSON.parse(raw) as SessionUser) : null);
      } catch {
        setUser(null);
      }
    };
    loadUser();
    window.addEventListener("user-updated", loadUser);
    setMobileOpen(false);
    return () => window.removeEventListener("user-updated", loadUser);
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
    if (item.external || item.link.startsWith("http")) return;

    if (item.link.includes("#")) {
      const hash = item.link.split("#")[1];
      if (location.pathname === "/") {
        const el = document.getElementById(hash);
        if (el) {
          e.preventDefault();
          // ponytail: route through the router so location.hash stays in sync
          // (pushState bypassed React Router — hash section never scrolled,
          // back button broke). Home scrolls via location.hash.
          navigate(item.link);
          el.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else if (item.link === "/" && location.pathname === "/") {
      e.preventDefault();
      navigate("/");
      window.scrollTo({ top: 0, behavior: "smooth" });
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
          <PWAInstallButton variant="header" />
          {user ? (
            <>
              {location.pathname === "/" && (
                <Button
                  size="sm"
                  className="rounded-full px-4 h-9 font-semibold text-xs shadow-xs"
                  onClick={() => navigate("/dashboard")}
                >
                  Dashboard
                </Button>
              )}
              <AccountMenu
                user={user}
                onLogout={logout}
                onUserUpdated={(updated) => setUser(updated)}
              />
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
                  className="flex min-h-[44px] items-center px-3.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {item.name}
                </Link>
              )
            )}
          </nav>

          <div className="flex w-full flex-col gap-2 pt-3 border-t border-border">
            {user ? (
              <>
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border">
                  <div className="flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground font-semibold text-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : <User className="size-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{user.name || "Photographer"}</p>
                    <p className="text-[11px] text-muted-foreground truncate font-mono">{user.email || ""}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] rounded-xl text-xs font-medium flex items-center justify-center gap-2"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate("/account");
                  }}
                >
                  <User className="size-3.5" />
                  My Account
                </Button>
                <Button
                  variant="secondary"
                  className="w-full min-h-[44px] rounded-xl font-semibold text-xs"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate("/dashboard");
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  className="w-full min-h-[44px] rounded-xl text-xs text-destructive hover:bg-destructive/10"
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
            <PWAInstallButton
              variant="button"
              size="sm"
              className="w-full min-h-[44px]"
            />
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
