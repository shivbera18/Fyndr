# G6 plan — seed CC0/CC-BY catalog

The manifest ships empty (`{"tracks":[]}`) so the picker is upload-only.
FreePD (the plan's CC0 source) is shut down; this seeds from Wikimedia
Commons instead — official Kevin MacLeod ISRC uploads (CC BY 3.0) plus one
CC0 Chopin performance, all verified via the Commons API on 2026-09-09.
Credit UI + CC-BY end-card already shipped, so CC-BY is fully supported.

## Shortlist (7 preview cuts, 30s each)

| # | id | Title / artist | Mood | License | Commons source |
|---|---|---|---|---|---|
| 1 | `prelude-c` | Prelude in C (BWV 846) / Kevin MacLeod | romantic, wedding | CC-BY | `File:Prelude in C (BWV 846) (ISRC USUAN1100689).mp3` |
| 2 | `nocturne-37` | Nocturne Op. 37 No. 1 / Chopin (PD perf.) | romantic | CC0 | `File:Chopin- Nocturne op. 37 no. 1.ogg` |
| 3 | `life-of-riley` | Life of Riley / Kevin MacLeod | upbeat | CC-BY | `File:Life of Riley (ISRC USUAN1400054).mp3` |
| 4 | `carefree` | Carefree / Kevin MacLeod | upbeat, party | CC-BY | `File:Carefree (ISRC USUAN1400037).mp3` |
| 5 | `firebrand` | Firebrand / Kevin MacLeod | party | CC-BY | `File:Firebrand (ISRC USUAN1100830).mp3` |
| 6 | `meditation-1` | Meditation Impromptu 01 / Kevin MacLeod | calm, lofi | CC-BY | `File:Kevin MacLeod - 01 - Meditation Impromptu 01.ogg` |
| 7 | `constancy-1` | Constancy Part One / Kevin MacLeod | cinematic | CC-BY | `File:Constancy Part One (ISRC USUAN1100775).mp3` |

CC-BY credit string for all KM tracks: `Kevin MacLeod (incompetech.com)`.

## Build (local ffmpeg, committed outputs only)

- Download originals to a temp dir (never committed), cut the most
  representative 30s window (`-ss`/`-t`, chosen by ear per track, start times
  recorded in the code-PR body), encode `-codec:a libmp3lame -b:a 128k` to
  `front-end/public/reel-music/<id>.mp3` (~0.48MB each, ~3.4MB total —
  slightly over the plan's ~2MB sketch; size is disclosed here for approval).
- `duration` = measured cut length (ffprobe, ~30.0); `peaks` = 120-bar
  downsample from `ffmpeg -f f32le` PCM dump (script at code time, outputs
  pasted into the manifest — no new repo tooling).
- `manifest.json`: `{version: 1, tracks: [...]}` with `license`, `credit`
  (CC-BY only), `artist`, `mood`, `duration`, `bpm` omitted (unknown —
  plan's BPM-tap stays P3-dropped; field simply absent).
- No loader/picker/modal changes (G1 search/chips and attribution UI consume
  the new entries unmodified). G5 SW route caches them on first play.

## Tests

- Existing `tracks.test.ts` reads the checked-in manifest off disk: add
  assertions — 7 entries, every `src` file exists under `public/reel-music/`,
  total mp3 bytes ≤ 4MB, every CC-BY entry has non-empty `credit`, peaks
  arrays all-finite with length ≤ 200.
- `musicPicker.test.tsx` fixture untouched (unit scope); catalog-driven UI
  already covered.

## Non-goals

Full-length tracks in git (cuts only; full streams stay a future R2 item),
BPM tagging, more moods/tracks (follow-up seed PRs), re-encoding the
uploader path, license legal advice (maintainer confirms the 7 licenses).
