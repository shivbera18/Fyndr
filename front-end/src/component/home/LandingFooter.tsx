import { Link } from "react-router-dom";
import { LogoMark } from "../brand/LogoMark";

export default function LandingFooter(): React.JSX.Element {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo-link">
            <LogoMark className="footer-logo-img" />
            <span>FYNDR</span>
          </Link>
          <p className="footer-copyright">© Fyndr {currentYear}. All rights reserved.</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4>Product</h4>
            <Link to="/#capabilities">Features</Link>
            <Link to="/#gallery-demo">Live demo</Link>
            <Link to="/login">Get started</Link>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <Link to="/about">How it works</Link>
            <Link to="/#how-it-works">Guest flow</Link>
            <Link to="/#faq">FAQ</Link>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            <Link to="/login">Create account</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/dashboard">Dashboard</Link>
          </div>
        </div>
      </div>
      <div className="footer-watermark" aria-hidden="true">Fyndr</div>
    </footer>
  );
}
