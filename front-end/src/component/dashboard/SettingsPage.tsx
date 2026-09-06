import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import PhotographerDetail from "./Photographer_detail";
import { Sliders } from "lucide-react";

export default function SettingsPage(): React.JSX.Element {
  const navigate = useNavigate();

  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (!userString) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 container mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
        {/* Page Heading */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border bg-card">
            <Sliders className="size-3.5 text-emerald-500" />
            Studio Configuration
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Settings &amp; Branding
          </h1>
          <p className="text-sm text-muted-foreground">
            Customize your photography studio branding, WhatsApp lead contact, and client portal appearance.
          </p>
        </div>

        <PhotographerDetail />
      </main>

      <Footer />
    </div>
  );
}
