import React from "react";
import { Link } from "react-router-dom";

export default function Footer(): React.JSX.Element {
  return (
    <div className="fy-dark fy-bleed">
      <footer className="fy-container fy-footer">
        <div className="fy-footer-grid">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.625rem",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "var(--fy-brand, #b9ff66)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#191a23",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              ✦
            </span>
            <strong style={{ fontSize: "1.125rem", letterSpacing: "-0.02em" }}>
              FYNDR
            </strong>
          </span>
          <nav aria-label="Footer">
            <Link to="/">Overview</Link>
            <Link to="/about">How it works</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/login">Sign in</Link>
          </nav>
          <span className="fy-micro">Contact: shiv@fyndr.in</span>
        </div>

        <div className="fy-footer-grid" style={{ marginTop: "1.75rem" }}>
          <p className="fy-micro" style={{ margin: 0, maxWidth: "32rem" }}>
            Built for photographers — zero friction. Guests scan QR → selfie →
            instant matches. Selfies are never stored.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <span className="fy-badge fy-badge-brand">Free to start</span>
            <span className="fy-badge">Private</span>
            <span className="fy-badge">No app</span>
          </div>
        </div>

        <div className="fy-footer-bottom">
          <span>© {new Date().getFullYear()} FYNDR — Crafted by Shiv Bera</span>
          <span style={{ display: "flex", gap: "0.5rem" }}>
            <Link to="/">Privacy Policy</Link>
            <span aria-hidden="true">•</span>
            <span>v1 • Fast &amp; Private</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
