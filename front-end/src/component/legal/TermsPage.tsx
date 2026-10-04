import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { FileText, Image, Ban, Scale } from "lucide-react";

const sections = [
  {
    icon: Image,
    title: "Your content",
    body: "You keep full ownership of every photo you upload. By uploading you grant Fyndr only the license needed to store, thumbnail, face-index, and serve those photos to your guests. We claim no ownership and never use event photos for advertising or model training.",
  },
  {
    icon: Ban,
    title: "Acceptable use",
    body: "Upload only photos you have the right to share. No unlawful, infringing, or non-consensual imagery. Face search is provided so guests find their own photos — scraping embeddings or other guests' galleries is prohibited and may lead to suspension.",
  },
  {
    icon: FileText,
    title: "Storage & availability",
    body: "Originals live in the Google Drive you link (drive.file scope — only files Fyndr creates). If you disconnect Drive or revoke access, uploads, downloads, and matching degrade until you reconnect. We aim for best effort availability on free infrastructure; keep your own backups of irreplaceable shoots.",
  },
  {
    icon: Scale,
    title: "Liability & termination",
    body: "Fyndr is provided as-is without warranties. Either side may terminate anytime: delete your events or your account and associated photos, tokens, and thumbnails are removed. Questions: shiv@fyndr.in.",
  },
];

export default function TermsPage(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 container mx-auto max-w-4xl px-4 sm:px-6 py-12 space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="brand">Terms of Service</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple, fair terms</h1>
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
          <Button onClick={() => navigate("/privacy")} variant="outline" className="min-h-[44px]">
            ← Read the Privacy Policy
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
