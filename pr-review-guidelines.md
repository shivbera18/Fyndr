# Pull Request & Review Guidelines

This document outlines the mandatory, highly rigorous Pull Request (PR) and Review loop for all AI agents contributing to this repository. Quality and correctness are paramount; no code is merged without surviving an adversarial review process.

## 1. Granular Commits & PRs
- **Logical Units:** Work must be broken down into small, highly cohesive units. 
- **Immediate PRs:** Raise a PR immediately after fixing a specific bug or completing a specific feature slice. Do not batch unrelated changes into a massive PR.
- **Commit Standards:** Ensure commits are granular and follow conventional commit messages (e.g., `fix: ...`, `feat: ...`, `chore: ...`).

## 2. Independent Sub-Agent Code Review
- **No Self-Approvals:** Once a PR is open, the implementing agent CANNOT review its own code. You must delegate the code review to a completely independent, specialized reviewer sub-agent (e.g., the bundled `reviewer`, `security-reviewer`, or a custom `architect` agent).
- **Adversarial Mindset:** The reviewer sub-agent must be instructed to adopt a highly critical, adversarial mindset. It should act as a strict senior engineer actively hunting for flaws, not a supportive peer looking to rubber-stamp the work.
- **Fresh Context:** Launch the reviewer via `task` or `hub` with the exact PR diff. Do not feed it the implementation history, so it judges the code purely on its own merits.

## 3. Exhaustive Review Scope
The reviewing sub-agent MUST conduct an in-depth, line-by-line audit across multiple dimensions:
- **Security Vulnerabilities:** Injection risks, missing authentication/authorization checks, unprotected routes, hardcoded secrets, and insecure data handling.
- **Concurrency & State:** Race conditions, deadlocks, unhandled promise rejections, memory leaks, and improper state mutations (especially in React components and Python/FAISS threading).
- **Side Effects & Regressions:** Unintended breakage elsewhere in the codebase. The reviewer must check callsites, imports, and data contracts.
- **Edge Cases:** Null/undefined inputs, empty collections, malformed file uploads, zero-face images, threshold boundaries, and network timeouts.
- **Over-engineering & Code Smell:** Unnecessary abstractions, bloated dependencies, dead code, or reinvention of standard library functions (apply `ponytail` mode checks).
- **Architectural Adherence:** Conformance to `AGENTS.md`, `CLAUDE.md`, specific design tokens (e.g., Positivus UI rules), and project paradigms.

## 4. GH PR Comments
- Because AI agents cannot approve or request changes through the GitHub API's formal review state, the reviewer sub-agent MUST post its exhaustive findings as **GitHub PR Comments** using `gh pr comment <PR-NUMBER> --body "..."`.
- **Format Requirements:** The review comment must be detailed and structured. For every bug or flaw found, include:
  1. The exact file and line number.
  2. The severity of the issue (Critical, High, Medium, Low, Polish).
  3. A concrete explanation of *why* it fails or is suboptimal.
  4. The potential exploit or failure mode.

## 5. The Review & Fix Loop (Iterative Hardening)
This is a strict, continuous loop. Do not skip steps.
1. **Analyze:** The orchestrating agent reads the exhaustive feedback posted on the PR by the reviewer.
2. **Fix All Bugs:** The orchestrator or a worker agent addresses *every single finding* from the review. Do not ignore "minor" edge cases. Fixes must be made with **new granular commits** on the same branch.
3. **Re-Review:** Once fixes are pushed, **re-trigger** the reviewer sub-agent on the updated diff.
4. **Repeat:** If the reviewer finds *any* remaining issues, regressions caused by the fixes, or unaddressed edge cases, the loop repeats. 
5. **Zero-Defect Exit:** The loop only ends when the independent reviewer posts a final comment explicitly stating there are zero remaining concerns and the code is rock-solid.

## 6. Pre-Merge Verification & Merge
- Before merging, the implementer MUST verify that the entire build passes (`npm run build`, `python -m py_compile`, `node --check`) and that the full test suite is green (`npm test`, backend integration tests, etc.).
  - **Exception for Trivial/Obvious Changes:** For simple typo fixes, basic text/CSS changes, or obvious low-risk updates where it is clear nothing will break, full build and test suites MAY be skipped to keep development fast. However, any complex logic, state, or structural change MUST still run the full verification.
- Merge the PR **only** after the PR review loop has yielded a zero-defect approval and all required verifications pass.
- Use `gh pr merge <PR-NUMBER> --merge --delete-branch` to finalize the PR.
