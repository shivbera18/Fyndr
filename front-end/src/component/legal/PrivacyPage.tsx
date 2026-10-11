import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Button } from "../../components/ui/button";
import { PageHero, PageShell } from "../../components/ui/page-kit";
import "../../components/ui/editorial.css";
import { ShieldCheck, Camera, HardDrive, Trash2 } from "lucide-react";

const sections = [
  {
    icon: Camera,
    title: "Photos you upload",
    body: "Event photos you upload are stored so guests can find themselves: originals in your linked Google Drive (a “Fyndr Storage” folder created on connect) plus 640px thumbnails on our servers for fast galleries. Face embeddings power matching. Delete an event and its photos, thumbnails, and vectors are removed.",
  },
  {
    icon: HardDrive,
    title: "Google Drive access",
    body: "We request the narrow drive.file scope only — Fyndr can access solely the files and folders it creates, never your whole Drive. Your refresh token is stored encrypted and used only to upload, serve, and delete your event photos. Disconnect anytime from Settings → Storage; this revokes the token at Google and deletes it from our database.",
  },
  {
    icon: ShieldCheck,
    title: "Guest selfies",
    body: "Guest selfies are processed in real time to find matching photos and are immediately discarded. We never sell, store, or train on guest face data. Matched-photo lists live only in the guest's own browser session.",
  },
  {
    icon: Trash2,
    title: "Your rights",
    body: "Request export or deletion of your data anytime at shiv@fyndr.in. Account deletion removes your studio profile, events, photos, Drive tokens, and thumbnails.",
  },
];

export default function PrivacyPage(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <PageShell header={<Header />} footer={<Footer />}>
      <div className="rk-doc">
        <PageHero
          align="left"
          kicker={<span className="rk-kicker">Privacy Policy</span>}
          title="Your photos stay yours"
          lead={`Effective ${new Date().getFullYear()} · Contact: shiv@fyndr.in`}
        />
        <ol className="rk-clauses mt-8">
          {sections.map((s) => (
            <li key={s.title}>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <s.icon className="h-4 w-4 text-primary" aria-hidden />
                {s.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="rk-contact-card mt-8 space-y-3">
          <p className="text-sm font-semibold">Questions about your data?</p>
          <p className="text-sm text-muted-foreground">
            Request export or deletion anytime at shiv@fyndr.in.
          </p>
          <Button onClick={() => navigate("/terms")} variant="outline" className="min-h-[44px]">
            Read the Terms of Service →
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
