import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../navbar/Header";
import Footer from "../Footer";
import { Button } from "../../components/ui/button";
import { PageHero, PageShell } from "../../components/ui/page-kit";
import "../../components/ui/editorial.css";
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
    <PageShell header={<Header />} footer={<Footer />}>
      <div className="rk-doc">
        <PageHero
          align="left"
          kicker={<span className="rk-kicker">Terms of Service</span>}
          title="Simple, fair terms"
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
          <p className="text-sm font-semibold">Questions about these terms?</p>
          <p className="text-sm text-muted-foreground">Reach us anytime at shiv@fyndr.in.</p>
          <Button onClick={() => navigate("/privacy")} variant="outline" className="min-h-[44px]">
            ← Read the Privacy Policy
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
