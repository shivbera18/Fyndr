import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 container mx-auto max-w-4xl px-4 sm:px-6 py-12 space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="brand">Privacy Policy</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Your photos stay yours</h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Effective {new Date().getFullYear()} · Contact: shiv@fyndr.in
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((s) => (
            <Card key={s.title} className="border-border">
              <CardContent className="p-6 space-y-2">
                <div className="flex items-center gap-2">
                  <s.icon className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{s.title}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center">
          <Button onClick={() => navigate("/terms")} variant="outline" className="min-h-[44px]">
            Read the Terms of Service →
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
