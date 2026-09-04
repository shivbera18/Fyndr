import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "./navbar/Header";
import Footer from "./Footer";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { CheckCircle2, ShieldCheck } from "lucide-react";

const pillars = [
  { title: "Lightning fast", desc: "Photos matched in under 2 seconds." },
  { title: "Zero app install", desc: "Runs directly in mobile browsers." },
  { title: "Studio branded", desc: "Grow your photography business." },
  { title: "Full resolution", desc: "Original DSLR quality downloads." },
];

const About = (): React.JSX.Element => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 container mx-auto max-w-4xl px-4 sm:px-6 py-12 space-y-12">
        {/* Section Head */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="brand">About Fyndr</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Event photo sharing without the friction
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            We're on a mission to eliminate the friction of event photo sharing. Fyndr connects event guests to their memories using fast, privacy-first facial recognition.
          </p>
        </div>

        {/* Problem vs Solution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardContent className="p-6 sm:p-8 space-y-3">
              <Badge variant="outline">The problem</Badge>
              <h3 className="text-xl font-bold text-foreground">The 5,000 Photo Dilemma</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Event photographers take thousands of stunning photos, but delivering them is
                painful. Shared cloud links overwhelm guests, forcing them to hunt through
                hundreds of strangers&apos; pictures. Most guests never see their best moments.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-zinc-900 text-white">
            <CardContent className="p-6 sm:p-8 space-y-3">
              <Badge variant="brand">The solution</Badge>
              <h3 className="text-xl font-bold text-white">Scan QR → Instant Personal Gallery</h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Guests scan a QR code at the table, take a quick selfie, and get every photo
                they appear in within two seconds. High-resolution downloads, complete privacy,
                zero apps.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Privacy Promise */}
        <Card className="border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-base">Our Strict Privacy Promise</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Guest selfies are processed strictly in real-time to find photos and are
                immediately discarded. We never sell, store, or train on guest face data.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4 Core Pillars */}
        <div className="space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block text-center">
            Built on four core pillars
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((item) => (
              <Card key={item.title} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-sm text-foreground">{item.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center py-6">
          <Button size="lg" onClick={() => navigate("/login")} className="min-h-[48px] px-8 text-base">
            Start Creating Events Free →
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
