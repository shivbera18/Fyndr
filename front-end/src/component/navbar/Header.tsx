import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../landing/primitives";

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
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: "0.625rem" }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "var(--fy-primary, #18181b)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fy-brand, #b9ff66)",
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        ✦
      </span>
      <span
        style={{
          fontWeight: 700,
          fontSize: "1.125rem",
          letterSpacing: "-0.02em",
          fontFamily: "var(--fy-font-display)",
        }}
      >
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
    setMobileOpen(false);
    setUser(readSession());
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  const displayName =
    user === null
      ? ""
      : user.name ?? user.email?.split("@")[0] ?? "Photographer";

  return (
    <header className="fy-nav">
      <div className="fy-container fy-nav-inner">
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Logo />
        </Link>

        <nav
          className={`fy-nav-links${mobileOpen ? " is-open" : ""}`}
          aria-label="Primary"
        >
          <Link to="/" onClick={() => setMobileOpen(false)}>
            Overview
          </Link>
          <Link to="/about" onClick={() => setMobileOpen(false)}>
            How it works
          </Link>
          <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
            Dashboard
          </Link>
          <a
            href="https://github.com/shivbera18/Fyndr"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          {mobileOpen &&
            (user ? (
              <>
                <Button variant="secondary" onClick={() => navigate("/dashboard")}>
                  Open dashboard
                </Button>
                <Button variant="outline" onClick={logout}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate("/login")}>
                  Sign in
                </Button>
                <Button onClick={() => navigate("/login")}>
                  Get started
                </Button>
              </>
            ))}
        </nav>

        <div className="fy-nav-cta">
          {user ? (
            <>
              <span className="fy-micro">{displayName}</span>
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
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate("/login")}>
                Get started
              </Button>
            </>
          )}
          <button
            className="fy-btn fy-btn-outline fy-btn-sm fy-menu-btn"
            onClick={() => setMobileOpen((v: boolean) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>
    </header>
  );
}
