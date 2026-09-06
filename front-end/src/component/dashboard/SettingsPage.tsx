import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import PhotographerDetail from "./Photographer_detail";
import AccountDetailsCard from "./AccountDetailsCard";
import { Sliders, User } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
export default function SettingsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "account" ? "account" : "studio";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (!userString) {
      navigate("/login");
    }
  }, [navigate]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams({ tab: val });
  };

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

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
          <div className="flex justify-center sm:justify-start">
            <TabsList className="grid grid-cols-2 w-full max-w-md h-11 p-1 bg-muted/60 rounded-xl">
              <TabsTrigger
                value="studio"
                className="flex items-center gap-2 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground shadow-xs"
              >
                <Sliders className="size-3.5" />
                Studio &amp; Branding
              </TabsTrigger>
              <TabsTrigger
                value="account"
                className="flex items-center gap-2 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground shadow-xs"
              >
                <User className="size-3.5" />
                Account Details
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="studio" className="focus-visible:outline-none">
            <PhotographerDetail />
          </TabsContent>

          <TabsContent value="account" className="focus-visible:outline-none">
            <AccountDetailsCard />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
