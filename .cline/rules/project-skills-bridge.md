# Project Bridge: pic-share

This project folder (`C:\Users\Shiv\Desktop\pic-share`) has agents/skills in
non-Cline folders. Bridged into `.cline/` so Cline discovers them when opened here.

## Bridged agents in `<project>/.cline/agents/` (4)

- From `.omp/agents/` (copies): `researcher.md`, `orchestrator.md`,
  `scout-ask.md`, `interactive-worker.md`
- NOTE: these use pi/omp tool names (`read`, `grep`, `glob`, `bash`, `task`,
  `hub`, `ask`). To emulate in Cline, read the `.md` and embed its role into a
  `use_subagents` prompt using Cline tools
  (`read_file`, `search_files`, `list_files`, `execute_command`, `use_skill`).

## Not bridged - read directly when needed

- `.claude/CLAUDE.md` + root `AGENTS.md` - Cline already auto-detects these.
- `.pi/side-agents/runtime/*/` - pi side-agent runtime logs, not skills.
- No project `.codex/`, `.claude/skills/`, `.omp/skills/` found.

## Rules for Cline in this project

- For research/recon tasks, read the matching file in
  `.cline/agents/` (or source `.omp/agents/`) and use it as the subagent prompt.
- No project skills to trigger via `use_skill` here; global skills still apply.
