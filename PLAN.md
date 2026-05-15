# Kids OpenCode — Development Plan (V0 → Workshop dogfood)

> **Status**: v0.2 living plan · CLI-first pivot · Updated 2026-05-15
> **Owner**: Joe (CTO) + 1 TS engineer (TBH)
> **Goal**: A kid-safe `kids-opencode` CLI installable via `curl ... | sh`, that lets a kid 12+ build a real HTML/CSS/JS project in a guided way, with all LLM traffic routed through DeepRouter and all tool use audited.
> **Cross-doc links**:
> - Product notes: [`KIDSINAI.md`](./KIDSINAI.md)
> - Upstream architecture audit: [`docs/upstream-architecture.md`](./docs/upstream-architecture.md)
> - AU compliance audit: [`docs/compliance/au.md`](./docs/compliance/au.md)
> - DeepRouter (sibling): `~/Documents/sites/deeprouter-ai/deeprouter/PLAN.md`
> - Master cross-product plan: `~/Documents/sites/Airbotix-AI/planning/PROJECT.md`
> - Pre-pivot tech spec (now stale): `~/Documents/sites/airbotix/docs/product/prd/kids-opencode-spec.md`

---

## v0.2 pivot summary (2026-05-15)

V0 is **a CLI, not a hosted web app**. Original phases 3 (Kid Web UI), 4 (Virtual FS / iframe sandbox), and big chunks of 5 (server-side workshop mode) are deferred to V1+ or moved to `Airbotix-AI/airbotix-app` (the managed-mode parent portal, a separate Airbotix-AI cloud product).

What stays in this repo's V0 scope: the install one-liner, the wrapper, the plugin, the config, the bundled course pack, and per-jurisdiction compliance.

---

## How to read this plan

Each phase has Goal / Tasks / Acceptance / Risks. Weekly the engineer ticks boxes; Friday sync reviews progress.

---

## Phase 0 — Foundation ✅ DONE (2026-05-14)

**Goal**: Repo set up, two-repo split decided, kernel tracking fork in place.

- [x] Fork `anomalyco/opencode` → `kidsinai/opencode-kernel` (public, MIT, tracking-only)
- [x] Add upstream remote
- [x] Two-repo split: this product repo separate from kernel
- [x] Kernel cleaned to a pure tracking fork (commit `c91f5cefd` in kernel)
- [x] Local clones at `~/Documents/sites/kidsinai/{kids-opencode,opencode-kernel}/`

---

## Phase 1 — Code archaeology ✅ DONE (2026-05-14)

**Goal**: Confirm fork strategy. Audit upstream. Decide what we keep and what we replace.

- [x] Read upstream architecture; output `docs/upstream-architecture.md` (8 key files mapped)
- [x] **OC-1** Confirm `anomalyco/opencode` is canonical, MIT
- [x] **OC-2** Confirm model adapter protocol — Vercel `ai` SDK underneath; providers are config-driven; **no source patch needed**
- [x] **D-KO3** Fork strategy — **plugin/middleware via `@opencode-ai/plugin`** (not source fork)
- [x] `bun install` upstream kernel; verify `bun run dev --help` and `bun run dev serve --help` load

**Key insight (changes everything after Phase 1)**: Upstream already exposes a headless HTTP server (`opencode serve`) and ships `@opencode-ai/sdk` + `@opencode-ai/plugin` as public npm packages. There is no TUI replacement work needed because we're shipping a CLI. The plugin is the entire customisation surface.

---

## Phase 2 — Plugin + wrapper + installer 🟢 ENGINEERING DONE (W3-4)

**Goal**: One-line install works end-to-end on a clean macOS / Linux machine. Plugin enforces the kid-safety constraints.

### Tasks
- [x] `packages/kids-plugin/` — implement plugin entry (`server` export) with:
  - [x] `experimental.chat.system.transform` — prepend kid-safe system prompt
  - [x] `tool.execute.before` — whitelist enforcement + webfetch host allowlist + audit emit
  - [x] `tool.execute.after` — audit emit
- [x] `config/opencode.json.template` — DeepRouter provider, kid-safe model, ask-per-tool permission, `agent.tools` whitelist
- [x] `config/system-prompt.md` — canonical kid-safe prompt
- [x] `bin/kids-opencode` — shell wrapper exec'ing `opencode --config $HOME/.config/kids-opencode/opencode.json`
- [x] `install.sh` — installs opencode upstream if missing → `opencode plugin install @kidsinai/kids-opencode-plugin` → drops config → installs wrapper
- [x] Smoke-test: `sh -n install.sh` ✅, `sh -n bin/kids-opencode` ✅, plugin typecheck ✅, plugin module loads ✅
- [ ] Publish `@kidsinai/kids-opencode-plugin@0.0.1` to npm registry under the `@kidsinai` scope — **blocked on npm scope auth (Lightman)**
- [ ] Stand up `airbotix.ai/install/kids` to serve `install.sh` — **`Airbotix-AI/airbotix` repo's job (other AI session)**
- [ ] End-to-end live run: a fresh macOS shell user runs the curl command and `kids-opencode` boots and completes one round-trip — **blocked on provider key handover (Lightman)**
- [ ] DeepRouter local connect: configure provider to point at `http://localhost:3000/v1` with `airbotix-kids` tenant key; verify request log shows the call — **blocked on platform-backend tenant-key issuance pipeline**

### Acceptance
- [ ] `curl ... | sh` exits 0 on a clean macOS box, leaves a working `kids-opencode` on PATH
- [ ] Plugin smoke-tests pass: tool whitelist refuses `shell`, webfetch refuses `https://example.com`, system prompt visible in stderr trace
- [ ] One real prompt drives one tool call end-to-end through DeepRouter
- [ ] Audit lines visible on stderr

### Risks
- **`opencode plugin install` API stability** — upstream changes mid-week could break the installer. Pin opencode version in install.sh.
- **DeepRouter tenant key handover not yet operational** — platform-backend hasn't issued the first tenant key yet. Use a direct Anthropic key with `KIDS_LLM_BYPASS_GATEWAY=1` style env override for unblock.
- **Provider config schema drift** between opencode upstream versions — keep `config/opencode.json.template` in lock-step with opencode version in `install.sh`.

---

## Phase 3 — Course Pack runner (W5-6)

**Goal**: First Course Pack ("Personal Portfolio Website") runs end-to-end. Kid finishes Mission 1 in <20 minutes.

### Tasks
- [x] Course Pack format defined: `course-packs/<pack-id>/{pack.yml, mission-N/{brief.md, acceptance.yml}}`
- [x] First pack content drafted: `course-packs/portfolio-site/` — 3 missions (setup+HTML, CSS, JS button), ~40⭐ budget. **Workshop-test pending.**
- [x] Plugin reads `KIDS_COURSE_PACK` + `KIDS_MISSION` + `KIDS_OBJECTIVES` + `KIDS_AGE_BAND` env vars and threads them into the system prompt template (see `packages/kids-plugin/src/index.ts` `readContextFromEnv()`)
- [ ] `kids-opencode --course portfolio-site --mission mission-1` flag forwarding in the wrapper — TODO (wrapper currently passes args through to opencode)
- [ ] Acceptance check runner: post-session, walk `acceptance.yml` rules against the project folder
- [ ] Stars accounting: emit the per-round-trip Stars cost in stderr; later phases connect this to platform-backend wallet

### Acceptance
- [ ] Lightman (or a willing test kid) completes the first mission with no engineer intervention
- [ ] Acceptance rules correctly identify completion (no false negatives that frustrate the kid)
- [ ] Plugin's system prompt correctly references the active Mission

### Risks
- **Course Pack content quality** — engineering can't ship this alone. Curriculum partner / Joe / Lightman owns the writing.

---

## Phase 4 — Red team + first lawyer review (W7-8)

**Goal**: 50-prompt red-team set passes ≥48/50. AU lawyer sees `docs/compliance/au.md` and signs off the eight `AU-*` open items (or returns notes).

### Tasks
- [x] Build `docs/red-team.md` with 50 prompts across 6 classes (prompt injection, jailbreak-via-roleplay, content, tool exfiltration, identity leakage, multi-turn manipulation). **Run not yet performed.**
- [ ] Run the set against `kids-opencode` in BYOK mode (real LLM) — blocked on provider key
- [ ] For each fail, fix in plugin or system prompt and re-run
- [x] Engineering-side draft answers for all 8 `AU-*` items in [`docs/compliance/au-lawyer-pass.md`](./docs/compliance/au-lawyer-pass.md) — reduces lawyer time from ~40-60h to ~11-16h
- [x] Sole-or-Primary-Purpose Statement drafted ([`docs/compliance/au-sole-or-primary-purpose-statement.md`](./docs/compliance/au-sole-or-primary-purpose-statement.md)) — AU-1 evidence
- [x] AI Safety Assessment v0.1 ([`docs/safety-assessment.md`](./docs/safety-assessment.md)) — AU-7 instantiated against Voluntary AI Safety Standard + eSafety SbD
- [x] NDB incident runbook ([`docs/runbook/ndb-incident.md`](./docs/runbook/ndb-incident.md)) — AU-5 operational
- [x] OAIC COPC consultation submission drafted ([`docs/compliance/au-oaic-copc-submission-draft.md`](./docs/compliance/au-oaic-copc-submission-draft.md))
- [ ] Lightman polishes + emails OAIC submission to `copc@oaic.gov.au` — **deadline 2026-06-05 COB**
- [ ] Schedule AU lawyer review session (estimated 11-16h, see au-lawyer-pass.md)
- [ ] Lightman / Lightman+lawyer email Anthropic, OpenAI, Doubao compliance teams (AU-8)

### Acceptance
- [ ] ≥48/50 red-team prompts safely refused or redirected
- [ ] All 8 AU-* open items closed or have a documented path forward
- [ ] OAIC consultation submission filed

### Risks
- **Lawyer availability** — book early.
- **OAIC consultation deadline is hard** — slipping this misses the window to influence the final Code.

---

## Phase 5 — Workshop / Class integration (W9-10)

**Goal**: A workshop teacher can hand kids a class code; the kid CLI authenticates against `Airbotix-AI/platform-backend`, scoped to the workshop credit pool, with the teacher seeing per-kid progress.

### Tasks
- [ ] `kids-opencode --workshop <class-code>` flag
- [ ] Workshop mode in the plugin: detect env var, switch DeepRouter tenant to the workshop pool, emit `workshop-mode` audit events
- [ ] Teacher console (in `Airbotix-AI/airbotix-app` or `Airbotix-AI/teacher-console`) shows per-kid progress in near-real-time from audit events
- [ ] Pre-warm: ensure DeepRouter handles 20 concurrent kid sessions in the same workshop without 429s

### Acceptance
- [ ] Dry-run with 20 simulated workshop sessions: all complete Mission 1 with no plugin / DeepRouter errors
- [ ] Teacher console shows live progress

### Risks
- **Coordination across three repos** — this is the first phase that crosses kids-opencode + platform-backend + airbotix-app. Aligning APIs early is critical.

---

## Phase 6 — Workshop dogfood (W11-12)

**Goal**: A real Airbotix workshop runs with ~20 kids (12+) using `kids-opencode` on their own laptops (or shared school laptops); iterate on UX based on what breaks.

### Tasks
- [ ] Pre-flight: deploy install.sh to airbotix.ai, npm publish plugin, verify clean install on lab Mac + Linux
- [ ] Workshop #1: 20 kids, 2-hour session, "Personal Portfolio" Course Pack
- [ ] Live observation by engineer; no intervention unless safety
- [ ] Top-3 friction fixes
- [ ] Workshop #2: validate fixes hold; different cohort

### Acceptance
- [ ] Workshop #1: ≥18/20 kids finish Mission 1 in 90 min
- [ ] Workshop #2: ≥18/20 finish all 3 missions in 2h
- [ ] Zero safety incidents
- [ ] Parent NPS ≥ 50

### Risks
- **One kid finds an unforeseen bypass** — kill-switch ready, post-mortem within 24h.
- **Venue WiFi** — pre-test, backup hotspot.

---

## Critical-path dependency

```
DeepRouter PLAN P2 (W5-6 endpoint) ─┐
   (actually shipped early on 2026-05-14)
                                     ▼
            Phase 2 (W3-4, in progress)
                            │
                            ▼
                Phase 3 (W5-6 course pack)
                            │
                            ▼
                Phase 4 (W7-8 red team + lawyer)
                            │
                            ▼
       Phase 5 (W9-10 workshop mode) ── parallel: airbotix-app cloud side
                            │
                            ▼
                Phase 6 (W11-12 dogfood)
```

---

## Open decisions

- ~~**D-KO1** sandbox = ✅ resolved (CLI, no server-side container, kid code on kid's machine)~~
- ~~**D-KO2** desktop framework = ✅ moot for V0 (CLI; V1+ can revisit)~~
- ~~**D-KO3** fork strategy = ✅ resolved (plugin/middleware, no core fork)~~
- **D-KO4** project visibility — V0 doesn't have sharing; deferred to airbotix-app web side
- **D-KO5** automated mission-completion check vs teacher override — engineering proposes auto + override; await Joe's call
- **D-KO6** Course Pack versioning — semver per pack; kid locked at session start
- **D-KO7** Default model — DeepRouter routes to Claude 3.5 Sonnet by default; Haiku for cheap round-trips. Need DeepRouter policy.

---

## Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| **Lawyer hasn't reviewed compliance yet** | 🔴 极高 | Book early in Phase 4. No real-kid use until reviewed. |
| **OAIC COPC deadline 5 June 2026** | 🔴 high | Calendar-blocked; Lightman owns the submission with lawyer help. |
| **Upstream opencode breaking change mid-V0** | 🟡 medium | Pin version in install.sh + lockfile in repo. Cherry-pick fixes only. |
| **DeepRouter tenant key issuance not yet operational** | 🟡 medium | Phase 2 can run BYOK Anthropic key as fallback. |
| **One bad kid finds a jailbreak** | 🔴 high | Red-team Phase 4 + kill-switch + post-mortem workflow. |
| **Distribution: `curl ... | sh` is a tough sell for some parents** | 🟡 medium | Alternative `npm install -g @kidsinai/kids-opencode` flag in V0; properly signed installer in V1. |

---

## Weekly cadence

- **Mon**: engineer reads this PLAN.md, picks unchecked task
- **Fri 30 min**: Lightman + engineer sync on phase progress, blockers, risk register, upstream sync (rebase day for kernel)
- **End of phase**: tick acceptance boxes, write 1-paragraph retrospective at end of phase section

---

## Definition of "Kids OpenCode V0 Done"

All true at the same time:
1. ✅ `curl -fsSL https://airbotix.ai/install/kids | sh` works on a clean macOS + Linux machine
2. ✅ `@kidsinai/kids-opencode-plugin` published to npm
3. ✅ One real Airbotix workshop dogfooded with ≥18/20 kids completing the portfolio Course Pack
4. ✅ `docs/compliance/au.md` lawyer-reviewed; all 8 AU-* open items closed
5. ✅ OAIC Children's Online Privacy Code consultation submission filed (deadline 2026-06-05)
6. ✅ Zero safety incidents in dogfood
7. ✅ Public privacy policy + ToS + parental consent forms live on airbotix.ai
8. ✅ Red-team test set ≥48/50 pass rate
9. ✅ Plugin emits audit lines that platform-backend can ingest (Phase 5 integration)

When all 9 are green: V0 done.

---

## Revision history

| Version | Date | Note |
|---|---|---|
| 0.2 | 2026-05-15 | **CLI-first pivot.** Dropped Phase 3 (Kid Web UI), Phase 4 sandbox-hardening reframed for CLI (no virtual FS / iframe), workshop mode moved to airbotix-app integration. Plugin + wrapper + installer are the deliverable. |
| 0.1 | 2026-05-12 | Initial plan. Hosted-web V0 with three-column React UI + server virtual FS. |
