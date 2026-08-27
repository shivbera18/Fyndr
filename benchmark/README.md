# Fyndr LFW Benchmark

This folder contains LFW download and benchmarking scripts to compare Fyndr's current pipeline (`buffalo_s` SCRFD-320 + ArcFace R50, mock fallback) against SOTA face detection/recognition.

- `data/` — LFW images + `pairs.txt` (gitignored)
- `run_lfw.py` — verification on 6000 LFW pairs
- `download_lfw.py` — downloader

See `../BENCHMARK.md` for final report.
