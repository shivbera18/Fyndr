# Pull Request & Review Guidelines

This document outlines the mandatory Pull Request (PR) and Review loop for all AI agents contributing to this repository.

## 1. Granular Commits & PRs
- Work must be broken down into small, logical units.
- Raise a PR immediately after fixing a specific bug or completing a specific feature.
- Ensure commits are granular and follow conventional commit messages (e.g., `fix: ...`, `feat: ...`, `chore: ...`).

## 2. Independent Sub-Agent Code Review
- **Do not self-approve.** Once a PR is open, delegate the code review to a completely independent, specialized reviewer sub-agent (e.g., the bundled `reviewer` or `security-reviewer` agent).
- Run the reviewer sub-agent via `task` or `hub` and point it to the PR diff or the changed files.

## 3. Review Scope
The reviewing sub-agent MUST rigorously check the PR for:
- **Security vulnerabilities:** (e.g., injection risks, unprotected routes, hardcoded secrets).
- **Side effects:** Unintended breakage elsewhere in the codebase (e.g., missed callsites).
- **Over-engineering:** Unnecessary abstractions or bloated dependencies (Ponytail mode checks).
- **Correctness & Edge Cases:** Unhandled nulls, race conditions, type safety, and error handling.
- **Architectural adherence:** Conformance to `AGENTS.md`, `CLAUDE.md`, and design tokens.

## 4. GH PR Comments
- Because AI agents cannot approve or request changes on their own PRs through the GitHub API's formal review state, the reviewer sub-agent MUST post its findings as **GitHub PR Comments**.
- Use the `gh pr comment <PR-NUMBER> --body "..."` command to deliver the review feedback.

## 5. Review & Fix Loop
- The orchestrating agent must read the feedback posted on the PR.
- Address all review comments with **new granular commits** on the same branch.
- Re-run the review sub-agent on the updated diff.
- Continue this iterative loop (Review → Comment → Fix → Push) until all issues are resolved and the reviewer agent explicitly states there are zero remaining concerns.
- **Goal:** Never merge buggy code or introduce regressions.

## 6. Merge
- Merge the PR **only** after completing the PR review loop successfully and verifying that the build and test suites pass.
- Use `gh pr merge <PR-NUMBER> --merge --delete-branch` to finalize the PR.
