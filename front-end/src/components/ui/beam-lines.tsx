import { useId, type ReactNode } from "react";
import { motion } from "motion/react";
import { Upload, ScanFace, Sparkles, Smartphone } from "lucide-react";
import { cn } from "../../lib/utils";

export interface BeamSource {
  icon: ReactNode;
  boxClass: string;
  title: string;
  sub: string;
}

export interface BeamHub {
  icon: ReactNode;
  title: string;
  sub: string;
  pill: string;
}

interface BeamLinesProps {
  className?: string;
  showLabels?: boolean;
  sources?: [BeamSource, BeamSource, BeamSource];
  hub?: BeamHub;
}

const DEFAULT_SOURCES: [BeamSource, BeamSource, BeamSource] = [
  {
    icon: <Upload className="size-5" />,
    boxClass: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
    title: "1. Photographer Upload",
    sub: "Uploads all event photos in 1 click",
  },
  {
    icon: <ScanFace className="size-5" />,
    boxClass: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    title: "2. Guest Takes a Selfie",
    sub: "Scans table QR & snaps in browser",
  },
  {
    icon: <Sparkles className="size-5" />,
    boxClass: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
    title: "3. Instant Personal Album",
    sub: "Only their photos appear in seconds",
  },
];

const DEFAULT_HUB: BeamHub = {
  icon: <Smartphone className="size-4" />,
  title: "Direct to Phone",
  sub: "Instant Delivery",
  pill: "100% Private · Zero App Needed",
};
export function BeamLines({ className, showLabels = true, sources = DEFAULT_SOURCES, hub = DEFAULT_HUB }: BeamLinesProps) {
  const id = useId().replace(/:/g, "-");
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-950/50 p-6 md:p-8 backdrop-blur-sm",
        className
      )}
    >
      {/* Background ambient light */}
      <div className="absolute inset-0 bg-dot-grid opacity-60 pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
        {/* Left Source Nodes — User Experience Journey */}
        <div className="flex flex-col gap-4 w-full md:w-72 z-20">
          {sources.map((s, i) => (
            <div
              key={i}
            >
              <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", s.boxClass)}>
                {s.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {s.title}
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {s.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Center Connecting SVG Multi-Step Beams (Desktop view) */}
        <div className="hidden md:block flex-1 h-56 relative">
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 300 200"
            fill="none"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Step 1 Gradient (Upload -> Hub: 0s to 2.2s, 6s loop) */}
              <motion.linearGradient
                id={`beam-gradient-upload-${id}`}
                gradientUnits="userSpaceOnUse"
                initial={{ x1: "0%", x2: "25%", y1: "0%", y2: "0%" }}
                animate={{
                  x1: ["0%", "100%"],
                  x2: ["25%", "125%"],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  repeatDelay: 3.8,
                  ease: "easeInOut",
                  delay: 0,
                }}
              >
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </motion.linearGradient>

              {/* Step 2 Gradient (Selfie -> Hub: 1.8s to 4.0s, 6s loop) */}
              <motion.linearGradient
                id={`beam-gradient-selfie-${id}`}
                gradientUnits="userSpaceOnUse"
                initial={{ x1: "0%", x2: "25%", y1: "0%", y2: "0%" }}
                animate={{
                  x1: ["0%", "100%"],
                  x2: ["25%", "125%"],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  repeatDelay: 3.8,
                  ease: "easeInOut",
                  delay: 1.8,
                }}
              >
                <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </motion.linearGradient>

              {/* Step 3 Gradient (Hub -> Album: 3.6s to 5.8s, 6s loop) */}
              <motion.linearGradient
                id={`beam-gradient-album-${id}`}
                gradientUnits="userSpaceOnUse"
                initial={{ x1: "100%", x2: "75%", y1: "0%", y2: "0%" }}
                animate={{
                  x1: ["100%", "0%"],
                  x2: ["75%", "-25%"],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  repeatDelay: 3.8,
                  ease: "easeInOut",
                  delay: 3.6,
                }}
              >
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </motion.linearGradient>
            </defs>

            {/* Base guide paths */}
            <path
              d="M 10 35 C 120 35, 180 100, 290 100"
              className="stroke-neutral-200 dark:stroke-neutral-800"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <path
              d="M 10 100 L 290 100"
              className="stroke-neutral-200 dark:stroke-neutral-800"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <path
              d="M 10 165 C 120 165, 180 100, 290 100"
              className="stroke-neutral-200 dark:stroke-neutral-800"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Animated multi-step beam paths */}
            <path
              d="M 10 35 C 120 35, 180 100, 290 100"
              stroke={`url(#beam-gradient-upload-${id})`}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M 10 100 L 290 100"
              stroke={`url(#beam-gradient-selfie-${id})`}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M 10 165 C 120 165, 180 100, 290 100"
              stroke={`url(#beam-gradient-album-${id})`}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Right Destination / Magic Match Hub */}
        <div className="relative flex flex-col items-center justify-center z-20 w-full md:w-56 shrink-0">
          <div className="relative size-32 md:size-36 flex items-center justify-center">
            {/* Spinning Conic Gradient Ring */}
            <div className="absolute inset-0 rounded-full [background-image:conic-gradient(at_center,transparent,rgba(16,185,129,0.8)_30%,rgba(59,130,246,0.8)_60%,transparent_85%)] animate-[spin_5s_linear_infinite]" />

            {/* Glowing Center Hub */}
            <div className="absolute inset-1.5 rounded-full bg-white dark:bg-neutral-950 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 shadow-xl flex flex-col items-center justify-center p-3 text-center">
              <div className="size-9 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-1 animate-pulse">
                {hub.icon}
              </div>
              <div className="text-xs font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                {hub.title}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                {hub.sub}
              </div>
            </div>
          </div>
          {showLabels && (
            <div className="mt-3 text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 text-neutral-700 dark:text-neutral-300">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                {hub.pill}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default BeamLines;
