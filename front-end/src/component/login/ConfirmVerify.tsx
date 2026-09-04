import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../landing.css";
import { Button, Reveal } from "../landing/primitives";

const ConfirmVerify = (): React.JSX.Element => {
  const loc = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking");
  useEffect(() => {
    const s = new URLSearchParams(loc.search).get("status");
    setStatus(s === "success" ? "success" : "error");
  }, [loc]);
  const ok = status === "success";
  return (
    <div className="fy-page fy-container">
      <div className="fy-auth-wrap">
        <Reveal className="fy-auth-card">
          <div className="fy-card" style={{ textAlign: "center" }}>
            <div className="fy-icon" aria-hidden="true">{ok ? "✓" : "!"}</div>
            <h1>{ok ? "Email verified" : "Link expired"}</h1>
            <p className="fy-lede">{ok ? "Your account is active. Create events and share photos." : "This link is invalid or expired. Request a new one or sign in."}</p>
            <Button onClick={() => navigate("/login")}>Go to sign in →</Button>
          </div>
        </Reveal>
      </div>
    </div>
  );
};
export default ConfirmVerify;
