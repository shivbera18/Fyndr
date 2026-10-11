import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import PhotographerDetail from "./Photographer_detail";
import AccountDetailsCard from "./AccountDetailsCard";
import DriveStorageCard from "./DriveStorageCard";
import { PageShell, PageHero } from "../../components/ui/page-kit";
import { Sliders, User, HardDrive, ArrowRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { cn } from "../../lib/utils";

const SETTINGS_TABS = [
  { id: "studio", label: "Studio & Branding", icon: Sliders },
  { id: "account", label: "Account Details", icon: User },
  { id: "storage", label: "Storage", icon: HardDrive },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

export default function SettingsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: SettingsTab =
    tabParam === "account" ? "account" : tabParam === "storage" ? "storage" : "studio";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (!userString) {
      navigate("/login");
    }
  }, [navigate]);

  const handleTabChange = (val: string) => {
    const next: SettingsTab = val === "account" || val === "storage" ? val : "studio";
    setActiveTab(next);
    setSearchParams({ tab: next });
  };

  return (
    <PageShell header={<Header />} footer={<Footer />} maxWidth="max-w-4xl">
      <div className="space-y-8">
        <PageHero
          align="left"
          kicker="Studio configuration"
          title="Settings & Branding"
          lead="How guests see your studio — the name on the gallery, the WhatsApp number for booking leads, and where originals live."
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
          <div className="flex justify-center">
            <TabsList
              role="tablist"
              aria-label="Settings sections"
              className="grid grid-cols-3 w-full max-w-lg h-11 p-1 bg-muted/60 rounded-full"
            >
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 rounded-full text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground shadow-xs min-h-[36px]"
                  >
                    <Icon className="size-3.5" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="studio" className="focus-visible:outline-none">
            <PhotographerDetail />
          </TabsContent>

          <TabsContent value="account" className="focus-visible:outline-none">
            <div className="space-y-4">
              <AccountDetailsCard />
              <p className="text-center text-xs text-muted-foreground">
                Need the full account view — sessions, danger zone, app install?{" "}
                <Link
                  to="/account"
                  className={cn("font-semibold text-primary hover:underline")}
                >
                  Open the deep account page
                  <ArrowRight className="ml-1 inline size-3" />
                </Link>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="storage" className="focus-visible:outline-none">
            <DriveStorageCard />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
