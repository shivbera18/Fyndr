import { Router, Request, Response } from "express";
import { execFile, spawn, type ChildProcess } from "child_process";
import logger from "../utils/logger";

const router = Router();

// System binary, not a bundled dep: install with `pip install yt-dlp`
// (VPS: same). All endpoints 503 with a clear message when it is missing.
// Read lazily so tests can point it at a stub binary via env.
function ytDlpBin(): string {
  return process.env.YT_DLP_BIN || "yt-dlp";
}
const VIDEO_ID_RE = /^[\w-]{11}$/;
const MAX_QUERY = 80;
const SEARCH_COUNT = 12;
const SEARCH_TIMEOUT_MS = 30000;
const AUDIO_TIMEOUT_MS = 90000;
// Shorts run <= 60s; 75s keeps near-misses while dropping long-form filler.
const MAX_SHORT_SECS = 75;
const MAX_RESULTS = 6;
// Unauthenticated endpoints spawn yt-dlp: cap concurrent jobs, 429 past it.
// (No per-IP rate limit — fine for a personal-use server, revisit if abused.)
const MAX_SEARCH_JOBS = 4;
const MAX_AUDIO_JOBS = 3;
let searchJobs = 0;
let audioJobs = 0;

export interface ShortTrack {
  id: string;
  title: string;
  channel: string;
  duration: number;
  audioUrl: string;
}

export function audioUrlFor(id: string): string {
  return `/api/music/audio?v=${id}`;
}

export function isVideoId(v: unknown): v is string {
  return typeof v === "string" && VIDEO_ID_RE.test(v);
}

// Parses yt-dlp tab-delimited `--print` lines (tabs: titles may contain "|").
// Drops malformed rows and long-form filler, caps at MAX_RESULTS.
export function parseShortsLines(out: string): Array<Omit<ShortTrack, "audioUrl">> {
  const tracks: Array<Omit<ShortTrack, "audioUrl">> = [];
  for (const line of out.split("\n")) {
    const parts = line.split("\t");
    if (parts.length < 4) continue;
    const [rawId, rawTitle, rawChannel, rawDur] = parts.map((s) => s.trim());
    if (!rawId || !VIDEO_ID_RE.test(rawId)) continue;
    if (!rawTitle) continue;
    const duration = Number(rawDur);
    if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_SHORT_SECS) continue;
    tracks.push({ id: rawId, title: rawTitle, channel: rawChannel || "YouTube", duration });
    if (tracks.length >= MAX_RESULTS) break;
  }
  return tracks;
}

// es2020 lib target: Promise.withResolvers is unavailable, executor form it is.
function runYtDlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(ytDlpBin(), args, { timeout: SEARCH_TIMEOUT_MS, maxBuffer: 1024 * 1024 }, (err, stdout) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stdout);
    });
  });
}

function missingBinary(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && e.code === "ENOENT";
}

// Viral audio for reels: searches YouTube Shorts and returns audio-only
// same-origin URLs the reel exporter can mux without CORS issues.
router.get("/api/music/shorts-search", async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) return res.status(400).send({ error: "q (min 2 chars) required" });
  if (q.length > MAX_QUERY) return res.status(400).send({ error: "q too long" });
  if (searchJobs >= MAX_SEARCH_JOBS) return res.status(429).send({ error: "busy, try again" });
  searchJobs += 1;
  try {
    const out = await runYtDlp([
      "--flat-playlist",
      "--no-playlist",
      "--print",
      "%(id)s\t%(title)s\t%(uploader)s\t%(duration)s",
      `ytsearch${SEARCH_COUNT}:${q} shorts`,
    ]);
    const tracks: ShortTrack[] = parseShortsLines(out).map((t) => ({
      ...t,
      audioUrl: audioUrlFor(t.id),
    }));
    res.send({ tracks });
  } catch (e: unknown) {
    if (missingBinary(e)) {
      res.status(503).send({ error: "audio engine unavailable (install yt-dlp)" });
      return;
    }
    const msg = e instanceof Error ? e.message : "search failed";
    logger.error("Shorts search failed", { error: msg, q });
    res.status(502).send({ error: "shorts search failed, try again" });
  } finally {
    searchJobs = Math.max(0, searchJobs - 1);
  }
});

// Pipes best-audio m4a for a Shorts video id. Same-origin pipe (never a
// redirect): the browser + exporter read it without CORS, and the id
// allowlist plus execFile (no shell) keeps this from becoming a proxy.
router.get("/api/music/audio", (req: Request, res: Response) => {
  const v = req.query.v;
  if (!isVideoId(v)) return res.status(400).send({ error: "valid v (11-char video id) required" });
  if (audioJobs >= MAX_AUDIO_JOBS) return res.status(429).send({ error: "busy, try again" });
  audioJobs += 1;
  let child: ChildProcess;
  try {
    child = spawn(ytDlpBin(), [
      "-f",
      "bestaudio[ext=m4a]/bestaudio",
      "--no-playlist",
      "-o",
      "-",
      `https://www.youtube.com/watch?v=${v}`,
    ]);
  } catch {
    audioJobs = Math.max(0, audioJobs - 1);
    res.status(503).send({ error: "audio engine unavailable (install yt-dlp)" });
    return;
  }
  let sent = false;
  let stderr = "";
  const timer = setTimeout(() => {
    if (child.exitCode === null) child.kill("SIGKILL");
  }, AUDIO_TIMEOUT_MS);
  let finished = false;
  const release = (): void => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    audioJobs = Math.max(0, audioJobs - 1);
  };
  child.on("error", () => {
    release();
    if (!sent) {
      sent = true;
      res.status(503).send({ error: "audio engine unavailable (install yt-dlp)" });
    }
  });
  child.stderr?.on("data", (d: Buffer) => {
    if (stderr.length < 2048) stderr += d.toString();
  });
  child.stdout?.on("data", (chunk: Buffer) => {
    if (res.destroyed || res.writableEnded) return;
    if (!sent) {
      sent = true;
      res.setHeader("Content-Type", "audio/mp4");
      res.setHeader("Cache-Control", "public, max-age=21600");
      res.status(200);
    }
    try {
      if (!res.write(chunk) && child.stdout) {
        child.stdout.pause();
        res.once("drain", () => child.stdout?.resume());
      }
    } catch {
      // Client went away mid-stream — close handler finishes the job.
    }
  });
  child.on("close", (code) => {
    release();
    if (!sent) {
      logger.warn("Shorts audio unavailable", { v, code, stderr: stderr.slice(-300) });
      res.status(502).send({ error: "audio unavailable for this video" });
    } else if (!res.writableEnded) {
      res.end();
    }
  });
  req.on("close", () => {
    release();
    if (child.exitCode === null) child.kill("SIGKILL");
  });
});
export default router;
