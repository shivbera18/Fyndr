import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import "./fy-top-nav.css";

const DARK_TILE = `${process.env.PUBLIC_URL}/logo-mark-dark.svg`;

const LINKS = [
  { name: "Features", to: "/#capabilities" },
  { name: "How it works", to: "/#how-it-works" },
  { name: "Demo", to: "/#gallery-demo" },
  { name: "FAQ", to: "/#faq" },
];

export default function LandingNav(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [navTone, setNavTone] = useState<"dark" | "light">("dark");

  useEffect(() => {
    let ticking = false;
    const readSurfaceTone = () => {
      const sampleY = Math.min(54, window.innerHeight - 1);
      const themedSurface = document
        .elementsFromPoint(window.innerWidth / 2, sampleY)
        .filter((element) => !element.closest(".fy-top-nav"))
        .map((element) => element.closest?.("[data-nav-theme]"))
        .find(Boolean);
      setNavTone(themedSurface?.getAttribute("data-nav-theme") === "dark" ? "dark" : "light");
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          setIsScrolled((prev) => {
            const next = currentY > 12;
            return prev === next ? prev : next;
          });
          readSurfaceTone();
          ticking = false;
        });
        ticking = true;
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const go = (to: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!to.includes("#")) return;
    const hash = to.split("#")[1];
    if (document.getElementById(hash)) {
      event.preventDefault();
      navigate(to);
    }
  };

  return (
    <header className={`fy-top-nav ${isScrolled ? "scrolled" : ""} ${mobileOpen ? "mobile-open" : ""} ${navTone === "dark" ? "nav-on-dark" : ""}`}>
      <div className="fy-top-nav-track">
        <div className="fy-top-nav-shell">
          <div className="fy-top-nav-inner">
            <Link to="/" className="fy-brand">
              <span className="fy-brand-mark">
                <img src={DARK_TILE} alt="" aria-hidden="true" />
              </span>
              <span>FYNDR</span>
            </Link>
            <nav className="fy-top-links" aria-label="Primary navigation">
              {LINKS.map((item) => (
                <Link key={item.name} to={item.to} className="fy-top-link" onClick={go(item.to)}>
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="fy-top-actions">
              <Link to="/login" className="fy-btn fy-btn-secondary">Sign in</Link>
              <Link to="/login" className="fy-btn fy-btn-primary">Get started</Link>
              <button
                className="fy-mobile-btn"
                type="button"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((prev) => !prev)}
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
          {mobileOpen && (
            <nav className="fy-mobile-menu" aria-label="Mobile navigation">
              <div className="fy-mobile-links">
                {LINKS.map((item) => (
                  <Link key={item.name} to={item.to} className="fy-mobile-link" onClick={(event) => { go(item.to)(event); setMobileOpen(false); }}>
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className="fy-mobile-actions">
                <Link to="/login" className="fy-btn fy-btn-secondary" onClick={() => setMobileOpen(false)}>Sign in</Link>
                <Link to="/login" className="fy-btn fy-btn-primary" onClick={() => setMobileOpen(false)}>Get started</Link>
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
