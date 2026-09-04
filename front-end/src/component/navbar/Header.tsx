import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../../components/ui/drawer";
import { ThemeToggle } from "../landing/Theme";
import { useMediaQuery } from "../../hooks/useMediaQuery";

type SessionUser = {
  name?: string;
  email?: string;
};

function readSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem("user");
    return raw === null ? null : (JSON.parse(raw) as SessionUser);
  } catch {
    return null;
  }
}

function Logo(): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-zinc-900 text-brand font-bold text-sm shadow-sm"
      >
        ✦
      </span>
      <span className="font-display font-bold text-lg tracking-tight text-foreground">
        FYNDR
      </span>
    </span>
  );
}

export default function Header(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isDesktop } = useMediaQuery();

  useEffect(() => {
    setUser(readSession());
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    if (isDesktop) {
      setMobileOpen(false);
    }
  }, [isDesktop]);

  const logout = () => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch {}
    setUser(null);
    navigate("/login");
  };

  const displayName =
    user === null
      ? ""
      : user.name ?? user.email?.split("@")[0] ?? "Photographer";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="no-underline text-inherit flex items-center">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground" aria-label="Primary">
          <Link to="/" className="transition-colors hover:text-foreground">
            Overview
          </Link>
          <Link to="/about" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link to="/dashboard" className="transition-colors hover:text-foreground">
            Dashboard
          </Link>
          <a
            href="https://github.com/shivbera18/Fyndr"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </nav>

        {/* Desktop CTA actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">
                {displayName}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
              >
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate("/login")}>
                Get started
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu button and drawer */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
        <DrawerContent className="px-4 pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader className="flex items-center justify-between px-0 pb-4 border-b border-border">
            <DrawerTitle asChild>
              <Link to="/" onClick={() => setMobileOpen(false)}>
                <Logo />
              </Link>
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </DrawerHeader>

          <nav className="flex flex-col gap-1 py-4" aria-label="Mobile Navigation">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-[44px] items-center px-3 rounded-md text-base font-medium text-foreground hover:bg-accent transition-colors"
            >
              Overview
            </Link>
            <Link
              to="/about"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-[44px] items-center px-3 rounded-md text-base font-medium text-foreground hover:bg-accent transition-colors"
            >
              How it works
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-[44px] items-center px-3 rounded-md text-base font-medium text-foreground hover:bg-accent transition-colors"
            >
              Dashboard
            </Link>
            <a
              href="https://github.com/shivbera18/Fyndr"
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-[44px] items-center px-3 rounded-md text-base font-medium text-foreground hover:bg-accent transition-colors"
            >
              GitHub
            </a>
          </nav>

          <div className="flex flex-col gap-2 pt-2 pb-6 border-t border-border">
            {user ? (
              <>
                <div className="px-3 py-1.5 text-xs text-muted-foreground font-mono">
                  Signed in as <span className="font-semibold text-foreground">{displayName}</span>
                </div>
                <Button
                  variant="secondary"
                  className="w-full min-h-[44px]"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate("/dashboard");
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  className="w-full min-h-[44px]"
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
                  className="w-full min-h-[44px]"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate("/login");
                  }}
                >
                  Sign in
                </Button>
                <Button
                  className="w-full min-h-[44px]"
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
        </DrawerContent>
      </Drawer>
    </header>
  );
}
