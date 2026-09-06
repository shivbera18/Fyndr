import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import StudioAnalytics from "./StudioAnalytics";
import { BarChart3 } from "lucide-react";

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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 container mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
        {/* Page Heading */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border bg-card">
            <BarChart3 className="size-3.5 text-emerald-500" />
            Performance &amp; Leads
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Studio Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Track live guest scans, attendee engagement, and client lead generation across all events.
          </p>
        </div>

        {user?._id && <StudioAnalytics userId={user._id} />}
      </main>

      <Footer />
    </div>
  );
}
