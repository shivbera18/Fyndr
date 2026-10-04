import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MobileNavToggle } from "../../components/ui/resizable-navbar";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4";

const FADE_MS = 500;

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
// ponytail: reduced-motion users get a static poster (no forced fullscreen
// motion); film also pauses offscreen/hidden so it never burns CPU all page.
const POSTER_URL = "/images/wedding.jpg";

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export default function CinematicHero(): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reduced] = useState<boolean>(() => prefersReducedMotion());

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduced) return;
    let raf = 0;
    let cancelled = false;
    let visible = !document.hidden;

    const tick = () => {
      if (cancelled) return;
      if (visible) {
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
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // ponytail: film stays fixed behind the whole page; scrolling fades it
    // toward a whisper so body copy stays readable over motion.
    const onScroll = () => {
      const y = window.scrollY;
      const dim = Math.max(0.28, 1 - y / 900);
      video.parentElement?.style.setProperty("--film-dim", String(dim));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // ponytail: IntersectionObserver pause — same pattern as the Home demo
    // carousel; rAF opacity only matters while the film is on screen.
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              visible = entries[0]?.isIntersecting !== false && !document.hidden;
              if (visible) void video.play().catch(() => undefined);
              else video.pause();
            },
            { threshold: 0 }
          )
        : null;
    if (io && video.parentElement) io.observe(video.parentElement);
    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) void video.play().catch(() => undefined);
      else video.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
    };
  }, [reduced]);

  if (reduced) {
    return (
      <div
        className="font-cinematic-body pointer-events-none fixed inset-0 z-0 overflow-hidden bg-white text-black"
        aria-hidden="true"
        data-testid="cinematic-film"
      >
        <img
          src={POSTER_URL}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          data-testid="cinematic-hero-poster"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-white" />
      </div>
    );
  }

  return (
    <div
      className="font-cinematic-body pointer-events-none fixed inset-0 z-0 overflow-hidden bg-white text-black"
      style={{ opacity: "var(--film-dim, 1)" }}
      aria-hidden="true"
      data-testid="cinematic-film"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover opacity-0"
        src={VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={POSTER_URL}
        aria-hidden="true"
        tabIndex={-1}
        data-testid="cinematic-hero-video"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white/55 to-transparent" />
      {/* Bottom melt into the white page below */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-white" />
    </div>
  );
}

// Foreground landing chrome: nav + headline over the fixed film.
export function CinematicHeroForeground(): React.JSX.Element {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const authed = (() => {
    try {
      return Boolean(localStorage.getItem("user"));
    } catch {
      return false;
    }
  })();
  return (
    <div className="font-cinematic-body relative z-10 bg-transparent text-black">
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
          {authed ? (
            <a href="/dashboard" className="text-sm text-[#6F6F6F] transition-colors hover:text-black">
              Dashboard
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="hidden min-h-[44px] rounded-full bg-black px-6 py-2.5 text-sm text-white transition-transform hover:scale-[1.03] md:block"
          >
            Begin Journey
          </button>
          <span className="md:hidden">
            <MobileNavToggle isOpen={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
          </span>
        </div>
      </nav>
      {menuOpen ? (
        <div className="relative z-10 mx-4 rounded-2xl border border-border/60 bg-white/95 p-2 shadow-lg md:hidden">
          {[...NAV_ITEMS, ...(authed ? [{ name: "Dashboard", href: "/dashboard", active: false }] : [])].map((item) => (
            <a
              key={item.name}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="flex min-h-[44px] items-center rounded-xl px-4 text-sm text-neutral-900 hover:bg-muted"
            >
              {item.name}
            </a>
          ))}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-1 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-black text-sm text-white"
          >
            Begin Journey
          </button>
        </div>
      ) : null}

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
