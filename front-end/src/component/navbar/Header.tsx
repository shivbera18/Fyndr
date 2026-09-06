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
} from "../../components/ui/resizable-navbar";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "../landing/Theme";

type SessionUser = {
  name?: string;
  email?: string;
};

const NAV_ITEMS = [
  { name: "Overview", link: "/" },
  { name: "How it works", link: "/about" },
  { name: "Dashboard", link: "/dashboard" },
  { name: "GitHub", link: "https://github.com/shivbera18/Fyndr", external: true },
];

function Logo(): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-[32px] w-[32px] items-center justify-center rounded-xl bg-zinc-950 text-brand font-bold text-sm shadow-sm dark:border dark:border-zinc-800"
      >
        <Sparkles className="h-4 w-4 text-brand" />
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

  return (
    <Navbar>
      {/* Desktop Resizable Floating Nav */}
      <NavBody>
        <Link to="/" className="no-underline text-inherit flex items-center pr-2">
          <Logo />
        </Link>

        <NavItems items={NAV_ITEMS} />

        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full px-4 h-9 font-semibold text-xs"
                onClick={() => navigate("/dashboard")}
              >
                Dashboard
              </Button>
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
            {NAV_ITEMS.map((item) =>
              item.external ? (
                <a
                  key={item.name}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[44px] items-center px-3.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  {item.name}
                </a>
              ) : (
                <Link
                  key={item.name}
                  to={item.link}
                  onClick={() => setMobileOpen(false)}
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
