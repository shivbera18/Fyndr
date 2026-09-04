import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../landing.css";
import { Button, Reveal } from "../landing/primitives";

const EmailVerify = (): React.JSX.Element => {
  const navigate = useNavigate();
  const loc = useLocation();
  const email = new URLSearchParams(loc.search).get("email") || "your email";
  return (
    <div className="fy-page fy-container">
      <div className="fy-auth-wrap">
        <Reveal className="fy-auth-card">
          <div className="fy-card" style={{ textAlign: "center" }}>
            <div className="fy-icon" aria-hidden="true">◆</div>
            <h1>Check your inbox</h1>
            <p className="fy-lede">We sent a verification link to <strong>{email}</strong>. Click it to activate your account.</p>
            <Button onClick={() => navigate("/login")}>Continue to sign in →</Button>
          </div>
        </Reveal>
      </div>
    </div>
  );
};
export default EmailVerify;
