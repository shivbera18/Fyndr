import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import StudioAnalytics from "./StudioAnalytics";
import { PageShell, PageHero, StatusBadge } from "../../components/ui/page-kit";

type StoredUser = {
  _id: string;
  name?: string;
  email?: string;
};

export default function AnalyticsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (!userString) {
      navigate("/login");
      return;
    }
    try {
      setUser(JSON.parse(userString));
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <PageShell header={<Header />} footer={<Footer />} maxWidth="max-w-6xl">
      <div className="space-y-8">
        <PageHero
          align="left"
          kicker={
            <StatusBadge status="ok">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
              Live — tracking every guest scan
            </StatusBadge>
          }
          title="Studio Analytics"
          lead="Guest scans, selfie-search engagement, and client leads across every event — one ledger for the whole studio."
        />

        {user?._id && <StudioAnalytics userId={user._id} />}
      </div>
    </PageShell>
  );
}
