import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Camera, ArrowDownToLine, ScanFace, Images, Zap, Check } from "lucide-react";
import { cn } from "../../lib/utils";

/* ------------------------------------------------------------------ */
/* Camera-to-Cloud live flow: 3 shooters merge into FTP ingest, then   */
/* a single trunk runs AI pipeline -> live gallery. A stepper tracks   */
/* each stage, packets travel the real path, and the test-shot button  */
/* flies one photo end to end on a timed drive.                        */
/* ------------------------------------------------------------------ */

const CAMS = [
  { brand: "Canon", login: "evt_a3f9…_b", tint: "blue" },
  { brand: "Nikon", login: "evt_a3f9…_c", tint: "emerald" },
  { brand: "Sony", login: "evt_a3f9…_d", tint: "amber" },
] as const;

const STEPS = ["Shoot", "Transfer", "Pipeline", "Gallery"] as const;

const TINTS: Record<string, { box: string; dot: string; text: string }> = {
  blue: { box: "bg-blue-500/10 text-blue-500", dot: "#3b82f6", text: "text-blue-500" },
  emerald: { box: "bg-emerald-500/10 text-emerald-500", dot: "#10b981", text: "text-emerald-500" },
  amber: { box: "bg-amber-500/10 text-amber-500", dot: "#f59e0b", text: "text-amber-500" },
};

const IN_EDGE = [40, 120, 200];
const TRUNK = "M 0 120 L 64 120";
const inPath = (y: number) => `M 0 ${y} C 32 ${y}, 32 120, 64 120`;
// ponytail: vendored demo shots — picsum.photos added external blocking
// fetches to first paint. Cycle the 4 local /demo images instead.
const GALLERY = [0, 1, 2, 3].map((i) => `/demo/${["wedding-sunset", "wedding-dance", "wedding-couple-1", "wedding-couple-2"][i]}.jpg`);
const photo = (h: number) => GALLERY[h % GALLERY.length];

const DETAILS: Record<string, { title: string; body: string }> = {
  overview: {
    title: "Three cameras, one gallery",
    body: "Pick a camera or a stage to inspect it — or fire a test shot and watch one photo fly the whole path.",
  },
  cam: {
    title: "Per-shooter FTP login",
    body: "Own chrooted login, Encryption OFF + PASV on port 21, JPEG-only auto-transfer over a phone hotspot.",
  },
  ingest: {
    title: "FTP ingest",
    body: "vsftpd acknowledges every file with 226 Transfer complete, straight into the event vault.",
  },
  pipe: {
    title: "AI pipeline",
    body: "RAW skipped, JPEGs hash-deduped and face-indexed — ready for guest selfies in seconds.",
  },
  gallery: {
    title: "Live gallery",
    body: "New shots appear in ~10s. Guests scan the table QR, snap a selfie, keep their photos.",
  },
};

type Sel = { level: number; cam?: number } | null;

function Packet({
  path,
  color,
  dur,
  begin = "0s",
  r = 3.5,
}: {
  path: string;
  color: string;
  dur: string;
  begin?: string;
  r?: number;
}) {
  return (
    <circle r={r} fill={color} opacity="0.95">
      <animateMotion dur={dur} begin={begin} repeatCount="indefinite" path={path} />
    </circle>
  );
}

export function CameraCloudFlow() {
  const reduce = useReducedMotion();
  const [sel, setSel] = useState<Sel>(null);
  const [leg, setLeg] = useState(-1); // -1 idle, 0..2 packet leg, 3 delivered
  const [shots, setShots] = useState(1248);
  const [tiles, setTiles] = useState([0, 1, 2, 3]);
  const [status, setStatus] = useState("Idle — pipeline warm, waiting for the next shutter.");
  const [shotCam, setShotCam] = useState(1);
  const timers = useRef<number[]>([]);

  useEffect(() => () => {
    timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  const selCam = sel?.cam;
  // The stepper mirrors inspection when idle and the packet while flying.
  const activeStep = leg === -1 ? (sel?.level ?? -1) : leg;
  const detailKey =
    sel === null ? "overview" : sel.level === 0 ? "cam" : sel.level === 1 ? "ingest" : sel.level === 2 ? "pipe" : "gallery";
  const detail = DETAILS[detailKey];

  const fire = () => {
    if (leg !== -1) return;
    if (reduce) {
      setShots((n) => n + 1);
      setTiles((t) => [(t[0] + 4) % 12, ...t].slice(0, 4));
      setStatus("Shot delivered · 226 Transfer complete · live in the gallery.");
      return;
    }
    setLeg(0);
    setShotCam(selCam ?? 1);
    setStatus("Shutter — photo leaves the camera…");
    timers.current.push(
      window.setTimeout(() => {
        setLeg(1);
        setStatus("226 Transfer complete — ingest has the file…");
      }, 550)
    );
    timers.current.push(
      window.setTimeout(() => {
        setLeg(2);
        setStatus("Pipeline indexing faces…");
      }, 1100)
    );
    timers.current.push(
      window.setTimeout(() => {
        setShots((n) => n + 1);
        setTiles((t) => [(t[0] + 4) % 12, ...t].slice(0, 4));
        setStatus("Shot delivered · 226 Transfer complete · live in the gallery.");
        setLeg(3);
      }, 1650)
    );
    timers.current.push(window.setTimeout(() => setLeg(-1), 3250));
  };

  const stageRing = (level: number, cam?: number) =>
    cn(
      "transition-all",
      leg === level
        ? "border-emerald-500/70 shadow-[0_0_24px_-6px_rgba(16,185,129,0.6)]"
        : sel !== null &&
            (sel.level !== level || (cam !== undefined && selCam !== undefined && selCam !== cam))
          ? "opacity-45"
          : "opacity-100"
    );

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-950/50 p-6 md:p-8 backdrop-blur-sm"
    >
      <div className="absolute inset-0 bg-dot-grid opacity-60 pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Stepper */}
        <ol className="flex items-center gap-1 sm:gap-2 mb-6" aria-label="Pipeline stages">
          {STEPS.map((label, i) => {
            const done = leg === 3 || (leg !== -1 && leg > i);
            const active = activeStep === i;
            return (
              <li key={label} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  aria-label={`Step ${i + 1}: ${label}`}
                  aria-current={active ? "step" : undefined}
                  onClick={() => setSel({ level: i })}
                  className="flex items-center gap-2 min-h-[44px] group"
                >
                  <motion.span
                    animate={active && !reduce ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                    transition={{ duration: 0.45 }}
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-colors",
                      done
                        ? "bg-emerald-500 border-emerald-500 text-neutral-950"
                        : active
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-500"
                          : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : i + 1}
                  </motion.span>
                  <span
                    className={cn(
                      "text-xs font-semibold hidden sm:inline",
                      active || done ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className="flex-1 h-px mx-1 sm:mx-2 bg-neutral-200 dark:bg-neutral-800 overflow-hidden rounded-full">
                    <motion.span
                      className="block h-full w-full bg-emerald-500 origin-left"
                      initial={false}
                      animate={{ scaleX: done || (leg !== -1 && leg > i) ? 1 : 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {/* Levels */}
        <div className="flex flex-col md:flex-row items-stretch gap-3 md:gap-0">
          {/* L1 cameras */}
          <motion.div
            initial={reduce ? false : { opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="flex md:flex-col gap-3 flex-1 justify-center"
          >
            {CAMS.map((c, i) => (
              <button
                key={c.login}
                type="button"
                aria-pressed={selCam === i}
                onClick={() => setSel({ level: 0, cam: i })}
                className={cn(
                  "group flex flex-1 md:flex-none items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 text-left min-h-[44px]",
                  stageRing(0, i)
                )}
              >
                <span className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", TINTS[c.tint].box)}>
                  <Camera className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold truncate">
                    Shooter {String.fromCharCode(65 + i)} · {c.brand}
                  </span>
                  <span className="block text-[11px] font-mono text-muted-foreground truncate">{c.login}</span>
                </span>
              </button>
            ))}
          </motion.div>

          {/* Link: 3 merge into 1 */}
          <svg
            className="hidden md:block w-16 self-stretch"
            viewBox="0 0 64 240"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <motion.g
              initial={reduce ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {IN_EDGE.map((y) => (
                <path
                  key={`base-${y}`}
                  d={inPath(y)}
                  className="stroke-neutral-200 dark:stroke-neutral-800"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              ))}
            </motion.g>
            {!reduce &&
              IN_EDGE.map((y, i) =>
                selCam === undefined || selCam === i ? (
                  <Packet
                    key={`pkt-${y}`}
                    path={inPath(y)}
                    color={TINTS[CAMS[i].tint].dot}
                    dur={`${2 + i * 0.5}s`}
                    begin={`${i * 0.7}s`}
                  />
                ) : null
              )}
            {leg === 0 && <Packet path={inPath(IN_EDGE[shotCam])} color="#10b981" r={5} dur="0.55s" />}
          </svg>

          {/* L2 ingest */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex-1 flex flex-col justify-center"
          >
            <button
              type="button"
              aria-pressed={sel?.level === 1}
              onClick={() => setSel({ level: 1 })}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 text-left min-h-[44px]",
                stageRing(1)
              )}
            >
              <span className="size-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <ArrowDownToLine className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold">FTP ingest</span>
                <span className="block text-[11px] font-mono text-muted-foreground">port 21 · PASV</span>
              </span>
            </button>
          </motion.div>

          {/* Link: trunk */}
          <svg
            className="hidden md:block w-16 self-stretch"
            viewBox="0 0 64 240"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d={TRUNK} className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="2" strokeDasharray="4 4" />
            {!reduce && (
              <>
                <Packet path={TRUNK} color="#10b981" dur="1.6s" />
                <Packet path={TRUNK} color="#10b981" dur="1.6s" begin="0.8s" />
              </>
            )}
            {leg === 1 && <Packet path={TRUNK} color="#10b981" r={5} dur="0.55s" />}
          </svg>

          {/* L3 pipeline */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex-1 flex flex-col justify-center"
          >
            <button
              type="button"
              aria-pressed={sel?.level === 2}
              onClick={() => setSel({ level: 2 })}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 text-left min-h-[44px]",
                stageRing(2)
              )}
            >
              <span className="size-9 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                <ScanFace className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold">AI pipeline</span>
                <span className="block text-[11px] font-mono text-muted-foreground">dedupe · index</span>
              </span>
            </button>
          </motion.div>

          {/* Link: trunk */}
          <svg
            className="hidden md:block w-16 self-stretch"
            viewBox="0 0 64 240"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d={TRUNK} className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="2" strokeDasharray="4 4" />
            {!reduce && <Packet path={TRUNK} color="#10b981" dur="2.2s" begin="0.4s" />}
            {leg === 2 && <Packet path={TRUNK} color="#10b981" r={5} dur="0.55s" />}
          </svg>

          {/* L4 gallery */}
          <motion.div
            initial={reduce ? false : { opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="flex-1 flex flex-col justify-center"
          >
            <button
              type="button"
              aria-pressed={sel?.level === 3}
              onClick={() => setSel({ level: 3 })}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 text-left min-h-[44px]",
                stageRing(3)
              )}
            >
              <motion.span
                animate={leg === 3 && !reduce ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{ duration: 0.5 }}
                className="size-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0"
              >
                <Images className="size-4" />
              </motion.span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold">Live gallery</span>
                <span className="block text-[11px] font-mono text-muted-foreground">
                  <span data-testid="gallery-count">{shots.toLocaleString()}</span> photos
                </span>
              </span>
            </button>
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {tiles.map((h, i) => (
                <motion.img
                  key={`${h}-${i}`}
                  src={photo(h)}
                  alt={`Guest gallery photo ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  width={160}
                  initial={false}
                  animate={{ scale: leg === 3 && i === 0 ? [1, 1.12, 1] : 1 }}
                  className="aspect-square w-full rounded-md border border-neutral-200 dark:border-neutral-800 object-cover bg-neutral-100 dark:bg-neutral-800"
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Console */}
        <div className="mt-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-950 text-neutral-100 p-4 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={fire}
              disabled={leg !== -1}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 font-semibold text-neutral-950 text-xs min-h-[44px] disabled:opacity-40 transition-all active:scale-95"
            >
              <Zap className="size-3.5" />
              {leg === -1 ? "Fire a test shot" : "Shot in flight…"}
            </button>
            <span aria-live="polite" data-testid="flow-status" className="text-neutral-300">
              {status}
            </span>
          </div>
          <div className="mt-3 border-t border-neutral-800 pt-3">
            <span className="text-emerald-400 font-semibold">{detail.title} — </span>
            <span className="text-neutral-300" data-testid="flow-detail">
              {detail.body}{" "}
              {sel?.level === 0 && selCam !== undefined && (
                <>
                  Showing <span className={TINTS[CAMS[selCam].tint].text}>{CAMS[selCam].login}</span>.
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
export default CameraCloudFlow;
