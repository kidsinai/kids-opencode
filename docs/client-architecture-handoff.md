# Client Architecture Handoff — from airbotix repo session

> **Status**: incoming handoff · 2026-05-15
> **Source**: `~/Documents/sites/airbotix/docs/product/prd/kids-opencode-client-prd.md` **v0.3**
> **Action owner**: this repo (kids-opencode AI session + Lightman)

## What this is

The airbotix repo session investigated the V0.3 codebase + the upstream `opencode-kernel` source and concluded that the **CLI-first pivot in PLAN.md v0.2 left a gap**: server-side kid-safety is real (plugin + 36 tests), but the kid actually sees the upstream opencode TUI verbatim — no theme, no logo, no mission progress, no kid-friendly placeholders, no rebranding. After the AI-disclosure banner scrolls off, the experience is a senior-developer terminal.

The PRD now (v0.3) commits to a **phased delivery**:

- **V0a / Phase 2.4 (A route)** — TUI plugin package customising theme, logo, slot content, sound pack, keymap layer, placeholder text. 5-7 days. Ships in time for Workshop #1 dogfood.
- **V0b / Phase 2.5 (C route)** — own client via `@opencode-ai/sdk` v2 + `opencode serve` as kernel. 10-14 days. Ships in time for Workshop #2.
- **V1 / Phase 7** — Tauri GUI desktop app reusing client core from Phase 2.5.

A is **not throwaway** — its theme, sound pack, mission overlay, system prompt and audit pipeline are reused by C. The phased approach exists because (1) it doesn't delay the first workshop, (2) real-kid feedback from Workshop #1 reshapes C's UX design, (3) if A scores well enough on real kids, C scope can be reduced.

The canonical document lives in the airbotix repo (path above). This file is just a pointer + tasks-for-this-session.

## What to read

```
~/Documents/sites/airbotix/docs/product/prd/kids-opencode-client-prd.md
```

It contains the full background, the 3-options analysis, the V0/V1 client UX spec, the v2 migration plan, the upstream sync policy (built on the observed 21-releases-per-day pace of `@opencode-ai/sdk`), and a 5-item "to-verify-before-starting" list (Q1–Q5).

Cross-doc:
- Implementation context: `./PLAN.md` (this repo, v0.3, needs updating to v0.4)
- Upstream architecture: `./docs/upstream-architecture.md`
- Predecessor (stale on client/architecture, alive on compliance/economics): `~/Documents/sites/airbotix/docs/product/prd/kids-opencode-spec.md`

## What this session needs to do

In rough order:

### Sprint 1 (this week) — V0.3.x onboarding fixes + Q1 verification

These ship value immediately and unblock Phase 2.4. None depend on Q4 (TUI framework spike) or Q6 (register callback).

1. **Verify Q1** from PRD §10: v2 plugin API hook names — does `experimental.chat.system.transform` still exist in v2? Are `tool.execute.before` / `tool.execute.after` renamed? This is the hard prerequisite for Phase 2.4 (the new TUI plugin must use v2 SDK, which forces server plugin to migrate too).
2. **Verify Q2**: `opencode serve` readiness signal — how does a wrapper know serve is accepting connections (vs polling `/app`)?
3. **V0.3.x onboarding fixes** — PRD §7 installer responsibility checklist. Status as of 2026-05-16:
   - ✅ **DONE (2026-05-16, airbotix session)** — `install.sh` auto-installs `bun` if missing (`install.sh` §1, lines 86-101 of current file). Verified via `sh -n` + 36-test plugin suite passes.
   - ✅ **DONE (2026-05-16, airbotix session)** — `install.sh` generates random `OPENCODE_SERVER_PASSWORD` via `openssl rand -base64 32` (with `/dev/urandom` fallback) to `~/.config/kids-opencode/server-password` with `chmod 600`. Idempotent. Verified.
   - ✅ **DONE (2026-05-16, airbotix session)** — `install.sh` sets `chmod 700` on `~/.config/kids-opencode/` (config dir, holds password + future API key). Verified.
   - ✅ **DONE (2026-05-16, airbotix session)** — `bin/kids-opencode` wrapper reads `server-password` and exports `OPENCODE_SERVER_PASSWORD` before `exec opencode`. opencode TUI's internal HTTP server picks up the env var and uses Basic Auth. **Note**: the "auto-spawn `opencode serve` + readiness poll" piece in PRD §7.5 is actually Phase 2.5 scope (separate client architecture); for V0.3.x with monolithic opencode TUI, just exporting the env var is sufficient because opencode manages its own serve in-process.

### Sprint 2 (week after) — Phase 2.4 (A route) for Workshop #1

4. **Migrate server plugin (`@kidsinai/kids-opencode-plugin`) from v1 to v2 SDK** — required because Phase 2.4 introduces a sibling TUI plugin that's v2-only, and mixing v1/v2 plugins in one opencode process is not supported (assume so until proven otherwise).
5. **Build `@kidsinai/kids-opencode-tui-plugin`** (new package, per PRD §9.2):
   - Register kids-warm theme via `api.theme.install()` + `api.theme.set()`
   - Replace `home_logo` slot with Airbotix Kids OpenCode wordmark
   - Replace `home_prompt` placeholder with Chinese-friendly invitation text
   - Register sidebar slot showing Mission progress (when `KIDS_COURSE_PACK` env var present)
   - Register kids sound pack via `api.attention.soundboard.registerPack`
   - Register simplified keymap layer (only show 6-8 core bindings in `?` help)
   - Replace "Thinking…" with Chinese-friendly status
   - Modal overlay on dangerous-topic trigger
6. **Run Workshop #1 dogfood** with Phase 2.4 stack. Observe what works visually. Record kid feedback verbatim — this is gold for Phase 2.5 UX.

### Sprint 3+ — Phase 2.5 (C route) and beyond

7. **Decide Q4 (after Workshop #1)**: TUI framework — Bubble Tea (Go) vs Ink (Node+React). 1-day spike each, judged on dev velocity + V1 Tauri reusability of core logic + how easy it is to reuse Phase 2.4's theme/sound assets.
8. **Verify Q3**: v2 SDK SSE event schema — can client subscribe to plugin-emitted audit events?
9. **Build Phase 2.5 client** (per PRD §9.3): full chat rendering, mission progress, permission dialog, audit pipeline, friendly error screens.
10. **Run Workshop #2** with Phase 2.5 stack.

### Throughout — PLAN.md v0.4 update

11. **Update PLAN.md to v0.4**:
    - Phase 2 unchanged but note v2 plugin migration + `OPENCODE_SERVER_PASSWORD` are now Sprint 1
    - Insert **Phase 2.4** (A route, 5-7 days, before workshop dogfood)
    - Insert **Phase 2.5** (C route, 10-14 days, after Workshop #1)
    - Rewrite Phase 5 per PRD §9.5 (workshop = per-kid local stack + audit aggregation, NOT central serve)
    - Add Phase 7 for V1 Tauri GUI
    - Add an "Upstream sync policy" section per PRD §8 (pinning, gauntlet, cadence)

### Out of scope for V0.4 (V0.4+ work)

12. `kids-opencode register` subcommand (PRD §7.3) and `--update` (PRD §7.4) — depend on Q6 + airbotix-app callback support, which is in `Airbotix-AI/airbotix-app` repo's queue.

## What is NOT this session's job

- Standing up `airbotix.ai/install/kids` static endpoint → `Airbotix-AI/airbotix` repo session
- Issuing DeepRouter tenant keys → platform-backend Phase 5 + Lightman
- npm `@kidsinai` scope auth → Lightman
- DeepRouter `/audit` ingest endpoint → `deeprouter-ai/deeprouter` repo session

## Boundary note

The airbotix session is forbidden by its CLAUDE.md from making architectural decisions for this repo. The PRD it wrote is a **proposal + supporting evidence**, not an order. This session should treat it as a senior peer's review, push back where the analysis is wrong, and produce the binding PLAN.md v0.4 here.

If you accept the PRD as-is, commit a one-line note to the PRD in airbotix indicating acceptance, and proceed with the tasks above. If you disagree on any decision (D-CL1 through D-CL11), open the conversation back with Lightman before diverging.
