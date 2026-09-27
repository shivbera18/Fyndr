import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4";

const FADE_MS = 500;
const RESTART_PAUSE_MS = 100;

const NAV_ITEMS = [
  { name: "Home", href: "/", active: true },
  { name: "How it works", href: "/#how-it-works", active: false },
  { name: "Features", href: "/#features", active: false },
  { name: "Pricing", href: "/#pricing", active: false },
  { name: "Reach Us", href: "/#faq", active: false },
] as const;

// Cinematic landing hero: fullscreen looping video with manual fade
// transitions, Fyndr copy (QR + selfie photo delivery). Keeps the global
// Header/site chrome untouched — this replaces only the hero section.
export default function CinematicHero(): React.JSX.Element {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let raf = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const { currentTime, duration } = video;
      if (Number.isFinite(duration) && duration > 0) {
        if (currentTime < FADE_MS / 1000) {
          video.style.opacity = String(Math.min(1, currentTime / (FADE_MS / 1000)));
        } else if (duration - currentTime < FADE_MS / 1000) {
          video.style.opacity = String(Math.max(0, (duration - currentTime) / (FADE_MS / 1000)));
        } else {
          video.style.opacity = "1";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onEnded = () => {
      video.style.opacity = "0";
      window.setTimeout(() => {
        if (cancelled) return;
        try {
          video.currentTime = 0;
        } catch {
          /* seek may throw before metadata — next tick recovers */
        }
        void video.play().catch(() => undefined);
      }, RESTART_PAUSE_MS);
    };
    video.addEventListener("ended", onEnded);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <div className="font-cinematic-body relative min-h-screen w-full overflow-hidden bg-white">
      {/* Background video layer */}
      <video
        ref={videoRef}
        className="absolute inset-x-0 bottom-0 top-[300px] z-0 h-auto w-full object-cover opacity-0"
        src={VIDEO_URL}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        data-testid="cinematic-hero-video"
      />
      {/* Gradient overlays */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-white via-transparent to-white" />

      {/* Navigation bar */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        <a href="/" aria-label="Fyndr home" className="font-cinematic-display text-3xl tracking-tight text-black">
          Fyndr<sup className="text-sm">®</sup>
        </a>
        <div className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`text-sm transition-colors ${item.active ? "text-black" : "text-[#6F6F6F] hover:text-black"}`}
            >
              {item.name}
            </a>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="rounded-full bg-black px-6 py-2.5 text-sm text-white transition-transform hover:scale-[1.03]"
        >
          Begin Journey
        </button>
      </nav>

      {/* Hero section */}
      <section
        className="relative z-10 flex flex-col items-center justify-center px-6 pb-40 text-center"
        style={{ paddingTop: "calc(8rem - 75px)" }}
      >
        <h1
          className="font-cinematic-display animate-cinematic-rise max-w-7xl text-5xl font-normal text-black sm:text-7xl md:text-8xl"
          style={{ lineHeight: 0.95, letterSpacing: "-2.46px" }}
        >
          Beyond the albums, <em className="text-[#6F6F6F]">find yourself</em> in{" "}
          <em className="text-[#6F6F6F]">every celebration.</em>
        </h1>
        <p className="animate-cinematic-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-[#6F6F6F] sm:text-lg">
          Photographers upload once — guests scan a QR, take a selfie, and get their photos in seconds.
          No app, no scrolling through 5,000 photos.
        </p>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="animate-cinematic-rise-delay-2 mt-12 rounded-full bg-black px-14 py-5 text-base text-white transition-transform hover:scale-[1.03]"
        >
          Begin Journey
        </button>
      </section>
    </div>
  );
}
