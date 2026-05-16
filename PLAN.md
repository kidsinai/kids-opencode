# Kids OpenCode — Development Plan (V0 → Workshop dogfood)

> **Status**: v0.4 living plan · CLI-first + client-architecture-aware · Updated 2026-05-16 (post Q1/Q2 verification + airbotix-session PRD intake)
>
> Companion docs:
> - `docs/client-architecture-handoff.md` — cross-session handoff brief
> - `docs/v2-api-verification.md` — Q1/Q2 verification report (Q3 deferred to Phase 2.5)
> - `~/Documents/sites/airbotix/docs/product/prd/kids-opencode-client-prd.md` — canonical client/architecture PRD (D-CL1..D-CL11)
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
- [x] **Security baseline** (2026-05-16, airbotix session): `install.sh` auto-installs `bun` if missing; generates random `OPENCODE_SERVER_PASSWORD` (chmod 600) at `~/.config/kids-opencode/server-password`; sets `chmod 700` on config dir; `bin/kids-opencode` reads + exports the password before exec'ing opencode. Closes the unauthenticated 127.0.0.1:4096 attack surface.
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

## Phase 3 — Course Pack runner (W5-6) 🟢 ENGINEERING DONE

**Goal**: First Course Pack ("Personal Portfolio Website") runs end-to-end. Kid finishes Mission 1 in <20 minutes.

### Tasks
- [x] Course Pack format defined: `course-packs/<pack-id>/{pack.yml, mission-N/{brief.md, acceptance.yml}}`
- [x] First pack content drafted: `packages/kids-plugin/course-packs/portfolio-site/` — 3 missions (setup+HTML, CSS, JS button), ~40⭐ budget. **Workshop-test pending.**
- [x] Plugin reads `KIDS_COURSE_PACK` + `KIDS_MISSION` + `KIDS_OBJECTIVES` + `KIDS_AGE_BAND` env vars and threads them into the system prompt template
- [x] Plugin loads bundled `course-packs/<pack-id>/pack.yml` and prepends `system_prompt_overlay` to the kid-safe prompt (commit `67f29ca`, G3)
- [x] `kids-opencode --course portfolio-site --mission mission-1` flag handling in wrapper translates to env vars before exec'ing opencode (G4)
- [x] Acceptance check runner: `kids-opencode check <mission>` walks `acceptance.yml` against the kid's project folder, exits 0/1/2 with friendly report (G6)
- [x] Stars accounting: per-tool cost emitted as `stars_estimated` on every `tool.execute.before` audit line; `estimateStarsCost()` exported (G12). Platform-backend wallet integration is Phase 5.

### Acceptance
- [ ] Lightman (or a willing test kid) completes the first mission with no engineer intervention
- [ ] Acceptance rules correctly identify completion (no false negatives that frustrate the kid)
- [ ] Plugin's system prompt correctly references the active Mission

### Risks
- **Course Pack content quality** — engineering can't ship this alone. Curriculum partner / Joe / Lightman owns the writing.

---

## Phase 2.4 — TUI plugin skin (A route, before Workshop #1) — W7

> Inserted v0.4. Source: client-PRD §9.2 + D-CL2 + D-CL11. Unblocked by `docs/v2-api-verification.md` Q1 finding (no v1→v2 plugin migration required; we just add a new sibling package using `@opencode-ai/plugin/tui`).
>
> **Status**: 🟢 Phase 2.4a engineering done (2026-05-16). Slot UI (logo, prompt placeholder, sidebar widget) deferred to Phase 2.4b/2.5 because it requires the Solid runtime.

**Goal**: kid sees an Airbotix Kids OpenCode experience — kid-warm theme, branded logo, mission progress in the sidebar, kid-friendly placeholders + status text, simplified keymap — instead of the raw upstream developer TUI. Ships in time for Workshop #1 so the first kid cohort doesn't see "another senior-dev terminal."

### Tasks
- [x] Create `packages/kids-tui-plugin/` — sibling npm package `@kidsinai/kids-opencode-tui-plugin` (mutually-exclusive with the server-side `PluginModule` per upstream type)
- [x] Import the TUI plugin API from `@opencode-ai/plugin/tui` (subpath verified)
- [x] Register kids-warm theme via `api.theme.install()` + default `api.theme.set("kids-warm")` (bundled `themes/kids-warm.json`, 49 tokens with light + dark variants, all referencing palette defs, WCAG-AA tested per the bundled test suite)
- [ ] Replace `home_logo` slot with the Airbotix Kids OpenCode wordmark (deferred 2.4b — requires Solid runtime)
- [ ] Replace `home_prompt` placeholder with kid-friendly invitation text (deferred 2.4b — same reason)
- [ ] Register a sidebar slot showing Mission progress (deferred 2.4b — same reason). **Sidebar string builder + audit emission ship now** in `mission-sidebar.ts` so the host can pick it up the moment slot wiring lands.
- [ ] Register an encourage/notify/error sound pack via `api.attention.soundboard.registerPack` (deferred V0b — needs bundled audio assets)
- [x] Register a simplified keymap layer — `keymap.ts` exports 8 bindings (submit / approve / deny / cancel / scroll up / scroll down / help / quit) at priority 100 to mask the upstream noisy listing
- [x] Replace upstream "Thinking…" via `statusText("thinking", locale)` — locale-aware, English + zh-Hans built in; surfaced via toast on `session.idle` event (deeper integration when chat pane is owned in Phase 2.5)
- [x] Dangerous-topic overlay: listens for the exact Kids Helpline phrase the server-side system prompt emits AND for a narrow self-harm hint list; pushes `api.ui.dialog` modal (toast fallback) with overlay copy. Locale-aware (en + zh-Hans).

### Acceptance
- [x] Plugin module structure correct: `TuiPluginModule` with `tui` set and `server` undefined (test enforced)
- [x] Bundled theme JSON has all 49 required tokens with both light + dark variants AND each value resolves to a `defs` entry or literal hex (test enforced — catches both missing tokens and broken refs)
- [x] 44 unit tests passing (theme structure, audit format, mission sidebar string builder, status text en/zh-Hans coverage, dangerous topic detector, keymap layer + help text)
- [ ] **Real-host smoke**: load both `@kidsinai/kids-opencode-plugin` and `@kidsinai/kids-opencode-tui-plugin` in the same opencode process; observe both `[kids-audit]` (server) AND `[kids-tui-audit]` (TUI) `plugin.loaded` lines — pending live provider key

### Risks
- Upstream marks several TUI plugin APIs `experimental` or `@deprecated` (`api.slots.register` in particular). The work we did avoids slot registration entirely — theme + keymap + event subscriptions + dialog stack are the stable subset. When we add slot-based widgets in Phase 2.4b, audit coverage of upstream API drift goes via the upstream-sync gauntlet (see PLAN §"Upstream sync policy").
- `api.keymap.registerLayer` shape may diverge between upstream versions — the plugin wraps the call in a runtime-typeof check and audits a "layer_skipped" line if the host doesn't expose it. Worst case: kid sees the upstream `?` help instead of ours; product still works.

### Phase 2.4 NOT-doing (deferred to 2.4b or 2.5)
- Solid-runtime slot replacements (logo / prompt / sidebar widget)
- Sound pack (needs audio assets)
- Full chat-pane rewrite (Phase 2.5 own-client)
- Process-model changes (wrapper still exec's monolithic `opencode`; no separate `opencode serve` child until Phase 2.5)
- In-browser preview pane (Phase 7 V1 GUI)

---

## Phase 2.5 — Own-client TUI (C route, after Workshop #1) — W9-11 🟢 MVP scaffolded 2026-05-16

> Inserted v0.4. MVP landed 2026-05-16 (airbotix session, plan `~/.claude/plans/resilient-sleeping-pancake.md`). Q3 resolved during day-0 spike (see docs/v2-api-verification.md v0.2). D-CL7 locked: **Ink (Node + React)**. Source: client-PRD §9.3 + D-CL1 + D-CL10 + D-CL11.

**Goal**: own TUI client that talks to `opencode serve` over SDK v2 — full chat rendering, mission UI, permission dialog, audit pipeline, friendly error screens. Reuses Phase 2.4 theme + sound + placeholders + system-prompt overlay; reuses Q1/Q2 verification work.

### Day-1 prerequisites
- [x] **Q4 — TUI framework selected: Ink (Node + React)** — picked for V1 Tauri code reuse, mainstream ecosystem, no new runtime dep beyond the bun installer already drops. Bubble Tea / OpenTUI considered and rejected (see plan `~/.claude/plans/resilient-sleeping-pancake.md` §"Decision" + AskUserQuestion record)
- [x] **Q3 spike** — plugin cannot publish custom events through public API. Path B (client tails serve stderr) chosen. Client owns `opencode serve` as a child; PRD §5.3 session-resume deferred from V0 MVP. Recorded in `docs/v2-api-verification.md` Q3
- [x] D-CL7 (TUI framework) locked

### Tasks
- [x] Pick TUI framework (D-CL7) and bootstrap `packages/kids-client/` — package.json, tsconfig, bin/, src/, test/ scaffolding landed
- [x] Client-core / render-layer split — `src/core/*` is pure TS (no Ink imports); `src/render/ink/*` is the Ink-bound render adapter. V1 Tauri replaces only `render/`
- [x] Wrapper auto-spawns `opencode serve` (lifecycle now owned by `kids-client` via `core/serve-manager.ts`, not the wrapper — cleaner because the client also needs stderr for the audit pipeline)
- [x] Wrapper detection: client probes `127.0.0.1:4096/app` first; if reachable, attaches without spawning duplicate
- [x] Startup screen (PRD §3.1) — welcome card + 4 key options (Enter/c/r/h); zh-Hans + en strings; Kids Helpline 1800 55 1800 always visible
- [x] Mission-in-progress screen (PRD §3.2) — Header (mission + Stars budget/balance) + ChatStream (👦/🤖/⚙️ actor badges + Static history + live stream split) + Input + Thinking spinner
- [x] Permission confirmation modal (PRD §3.4) — y/n/e wired through `client.permission.reply(requestID, { reply })`
- [x] SSE event subscription with 5s reconnect / 10 retries before surfacing `serve_unreachable` error
- [x] Client-side audit pipeline — `core/audit-pipeline.ts` writes jsonl to `~/.config/kids-opencode/audit-buffer.jsonl`; remote POST plumbed (`@airbotix/audit-schema` consumer) but disabled until platform-backend endpoint ships
- [x] Friendly error screens — single component with 6 variants: serve_unreachable / network_down / stars_exhausted / auth_failed / config_missing / ai_hung
- [x] Locale: `KIDS_LOCALE` env then `$LANG` decides zh-Hans vs en. Runtime switching deferred to V1 (PRD §3.5 explicit scope cut)
- [x] DangerousTopicModal — patterns mirrored from `kids-tui-plugin/src/dangerous-topic.ts`; intercepts both kid input and AI emit; Kids Helpline overlay always wins screen priority
- [x] `kids-opencode --shutdown` subcommand — `lsof -ti tcp:4096 | xargs kill` safety hatch
- [x] CI step — `bun test` in `packages/kids-client/` wired into `.github/workflows/ci.yml`

### Acceptance
- [ ] In a clean macOS shell, a single `kids-opencode` invocation runs Phase 2.5 client + serve subprocess; first paint < 3s — **needs dogfood run on a clean box (open)**
- [ ] Workshop #2 (W13-14) uses Phase 2.5 client end-to-end; ≥18/20 kids finish portfolio Course Pack — **W13-14 cohort recruitment open**
- [ ] Audit pipeline observed delivering events to a mock platform-backend at ≥99% success — **awaits platform-backend `/api/audit` endpoint**
- [x] No upstream opencode TUI code visible in any kid-facing flow — wrapper now exec's `kids-client`, not `opencode`; serve runs headless

### MVP scope cuts (deliberate, recorded for V1)
- Session resume across client crash (PRD §5.3) — client kills serve on exit. Re-enable in V1 by redirecting serve stderr to a logfile at spawn + tailing from offset on reconnect.
- Sound pack — V1 Tauri (no audio in TUI).
- Embedded browser preview — V1 Tauri (kid switches to a real browser tab for preview in V0 MVP).
- Runtime locale switching — V0 reads `$LANG` once.
- Multi-mission parallel sessions — single active session only.

### Risks
- Phase 2.5 work crosses Workshop #1 → #2 transition; if Workshop #1 reveals fundamental UX issues, Phase 2.5 design absorbs them, lengthening the cycle. Mitigation: minimal-viable client for Workshop #2 covers only the 3 critical screens (start / mission / permission); polish lands after.
- Client bug could let a tool execute the plugin would have blocked. Mitigation: plugin remains the server-side hard gate; client bugs cannot bypass plugin. Add own e2e safety tests on the client too.

---

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

> Rewritten v0.4 per client-PRD §9.5 + D-CL5: Workshop is **not** a central serve serving 20 clients; it is 20 independent local stacks aggregated via audit ingest on the platform-backend side. The pre-warm and concurrency targets shift accordingly.

**Goal**: 20 kids each run their own local `kids-opencode` stack (serve + plugin + client) on their own laptops; the teacher console sees per-kid progress by subscribing to a unified audit event stream on `Airbotix-AI/platform-backend`. The teacher is the audience for the aggregation; nothing on the kids' machines coordinates with anything on other kids' machines.

### Tasks
- [ ] `kids-opencode --workshop <class-code>` flag → wrapper translates to env vars consumed by the plugin (tenant id, credit pool id) and the client (teacher console base URL for live update channel)
- [ ] Workshop mode in the plugin: detect env, switch DeepRouter tenant key to the workshop pool credentials, tag every audit line with `workshop_class_id` + `kid_id`
- [ ] Teacher console (`Airbotix-AI/teacher-console`) subscribes to platform-backend `/api/audit/stream?class=<id>` and renders per-kid progress in near-real-time
- [ ] Concurrency target shifts: **platform-backend audit ingest endpoint** must absorb ~200 events / sec (20 kids × ~10 tool calls/min × peak burst factor), and **DeepRouter** must handle 20 concurrent kid sessions on a workshop-pool tenant without 429s. There is no central serve — local stacks scale independently.
- [ ] Acceptance test: spin up 20 simulated kid stacks against a local platform-backend + DeepRouter staging; verify teacher console shows all 20 progressing without backend errors

### Acceptance
- [ ] 20-stack simulated workshop completes Mission 1 with no platform-backend audit-ingest failures
- [ ] Teacher console shows live per-kid progress within 5s of each kid's actions
- [ ] No central-serve component exists in the production design (architectural confirmation)

### Risks
- **Cross-repo coordination** — kids-opencode + platform-backend + teacher-console must align on the audit event schema. Mitigation: schema published as a TypeScript types package consumed by all three.
- **Audit ingest as new failure mode** — if platform-backend goes down mid-workshop, kids' stacks keep working but teacher loses visibility. Audit pipeline includes local-disk buffer + retry (see Phase 2.5).

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

## Phase 7 — V1 GUI desktop app (Tauri) — not in V0 scope

> Inserted v0.4 as forward-anchor per client-PRD §9.6 + D-CL2. No work starts here until Phase 6 closes and we have parent feedback from Workshops #1 and #2.

**Goal**: a true GUI desktop app for families that prefer a window over a terminal. Reuses Phase 2.5 client-core verbatim; replaces the TUI render layer with Tauri-shell + web-view UI.

### Tasks (V1, not V0)
- [ ] Tauri shell project bootstrap
- [ ] Adapt Phase 2.5 client-core to the new render layer (the core/render split made in Phase 2.5 is what makes this possible)
- [ ] Embedded browser preview pane (impossible in TUI; first-class in Tauri)
- [ ] System-level notifications + tray icon
- [ ] In-app self-update with signature verification
- [ ] Signed distribution: macOS Notarisation + Windows EV cert (Q5 in client-PRD §10; ~$400/year ongoing)

### Pre-requisites before Phase 7 can start
- Phase 6 (real-workshop dogfood) closed with NPS ≥ 50
- Q4 + Q5 from client-PRD §10 fully resolved
- A V1 budget approved (codesigning is the gating cost item)

---

## Upstream sync policy (inserted v0.4)

> Source: client-PRD §8. Codifies our relationship with `anomalyco/opencode` upstream so that any upstream change touching `@opencode-ai/sdk`, `@opencode-ai/plugin`, or `opencode` binary goes through a deterministic gauntlet before reaching kids.

### Why this exists

Per `npm view @opencode-ai/sdk versions --json`: ~7,178 versions published in 11 months (~21/day). Most are `0.0.0-dev-*` rolling snapshots, but minor jumps (1.14.51 → 1.15.0 happened on 2026-05-15) are real. **Semver as labelled does not imply stability for our purposes**; we treat the upstream as a fast-moving dependency and apply our own gauntlet.

### Version pin rules

| Package | Rule | Why |
|---|---|---|
| `@opencode-ai/sdk` | Exact version (`"1.14.51"`, never `^1.14.0`) | SDK is the wire-contract for our client |
| `@opencode-ai/plugin` | Exact version | Hook signature must match serve version |
| `opencode` binary | Exact version (pinned in `install.sh`) | Serve runtime behaviour |

All three must move **as one set**. A release tag of `kids-opencode` corresponds to a known-good `(sdk, plugin, binary)` triple. Mixed versions are not supported.

### Upgrade gauntlet (10-15 checks before merging any upstream bump)

Run by `.github/workflows/upstream-bump-gauntlet.yml` on every dependabot-style upgrade PR:

1. `opencode serve` boots in < 3 seconds
2. `@kidsinai/kids-opencode-plugin` loads (`[kids-audit] plugin.loaded` observed)
3. `session.create` succeeds
4. `session.prompt` → streaming reply received
5. AI triggers `read` tool → permission prompt visible via SSE
6. User denies → tool does not execute
7. Plugin rejects `shell` tool (whitelist still effective)
8. Plugin rejects `webfetch` to `example.com` (host allowlist still effective)
9. Audit events include `stars_estimated` field
10. `kids-opencode check mission-1` returns exit 0 on a satisfying sample project
11. AI-disclosure banner prints on wrapper startup
12. SSE auto-reconnects within 5s of forced disconnect
13. `session.abort` halts LLM call (no kid billing for cancelled work)
14. Missing config file → friendly error from wrapper
15. All hook names used by `@kidsinai/kids-opencode-plugin` still resolve in upstream `@opencode-ai/plugin`

A PR that fails any check is not merged. The gauntlet itself is implemented as a Bun test suite under `packages/kids-plugin/test/gauntlet/` and run in CI via `bun test --filter=gauntlet`.

### Upgrade cadence

- **Routine evaluation**: every 2 weeks, decide whether to bump. Not every week — upstream noise/signal ratio is too high.
- **Hotfix**: only when upstream patches a kid-safety security issue.
- **Auto-merge**: never. Dependabot opens PRs; humans decide.
- **Rollback**: every released `install.sh` pins a complete triple; production rollback is a one-variable change in the next installer release.

### v1 → v2 SDK posture (informed by `docs/v2-api-verification.md`)

- V0.4 server-side plugin **stays** on the unified `@opencode-ai/plugin` `Hooks` interface (no migration required; there is no v1/v2 split for the plugin)
- V0.4 Phase 2.4 TUI plugin: import from `@opencode-ai/plugin/tui` (real subpath, confirmed)
- V0.4 Phase 2.5 own-client: build against `@opencode-ai/sdk/v2` (richer resource set: `worktree`, `experimental`, `permission`, `part`, `sync`, `question`)
- Server-side plugin code never imports `@opencode-ai/sdk` directly (only `@opencode-ai/plugin` types) — keeps our SDK upgrade decoupled from plugin upgrade

---

## Critical-path dependency

```
DeepRouter P2 endpoint ✅ shipped 2026-05-14
        │
        ▼
Phase 1  ✅ archaeology done
        │
        ▼
Phase 2  ✅ engineering done (G1-G12 fixes in commit 67f29ca, 2026-05-15)
            blocked on: npm scope auth, airbotix.ai install endpoint, provider key
        │
        ▼
Phase 3  ✅ engineering done (Course Pack runner + acceptance + Stars)
            blocked on: curriculum content review, workshop dogfood
        │
        ▼
Phase 4  🟡 engineering done; needs lawyer + red-team run
        │
        ▼
Phase 5  🔴 workshop mode — blocked on Airbotix-AI/platform-backend Phase 5 work
                                                │
                                                ▼
                                     parallel: Airbotix-AI/airbotix-app cloud side
        │
        ▼
Phase 6  🔴 workshop dogfood — needs Phase 5 + a real workshop cohort
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

Status as of 2026-05-15 (post G1-G12). 🟢 engineering-complete · 🟡 engineering-complete but external dep · 🔴 not yet.

| # | Item | Status | Blocked on |
|---|---|---|---|
| 1 | `curl -fsSL https://airbotix.ai/install/kids \| sh` works on clean macOS + Linux | 🟡 installer SHA-verified, syntax-checked, smoke-tested locally; pinned to provider config | airbotix.ai endpoint deployment (Airbotix-AI/airbotix repo); npm publish |
| 2 | `@kidsinai/kids-opencode-plugin` published to npm | 🔴 | npm `@kidsinai` scope auth (Lightman) |
| 3 | One real Airbotix workshop dogfooded with ≥18/20 kids completing the portfolio Course Pack | 🔴 | running a real workshop |
| 4 | `docs/compliance/au.md` lawyer-reviewed; all 8 AU-* open items closed | 🟡 substantive draft answers ready (`au-lawyer-pass.md`); 11-16h lawyer time | retainer signed |
| 5 | OAIC Children's Online Privacy Code consultation submission filed | 🟡 draft complete (`au-oaic-copc-submission-draft.md`) | Lightman polish + email by 2026-06-05 COB |
| 6 | Zero safety incidents in dogfood | 🔴 | dogfood happens first |
| 7 | Public privacy policy + ToS + parental consent forms live on airbotix.ai | 🟡 4 docs drafted in `Airbotix-AI/airbotix/docs/legal/` | marketing-site rendering + lawyer review |
| 8 | Red-team test set ≥48/50 pass rate | 🟡 50 prompts written (`docs/red-team.md`); not yet executed | provider key |
| 9 | Plugin emits audit lines that platform-backend can ingest | 🟡 plugin emits structured JSON to stderr; persistence pipeline pending | platform-backend Phase 5 work |

**Engineering net**: this side of the wall is done. Items 2-3, 5-9 all depend on actions outside this repo's scope.

---

## Revision history

| Version | Date | Note |
|---|---|---|
| 0.5 | 2026-05-16 | **Sprint 2 partial — Phase 2.4a engineering done.** New package `packages/kids-tui-plugin/` (`@kidsinai/kids-opencode-tui-plugin`): bundled `kids-warm` theme (49 tokens, light + dark, all referencing palette defs); simplified keymap layer (8 bindings, priority 100); locale-aware kid-friendly status text (en + zh-Hans); dangerous-topic detector + Kids Helpline overlay (en + zh-Hans); mission-sidebar string builder (audit emission now; slot UI deferred to 2.4b). 44 new tests added (theme schema + audit format + 4 module unit suites). Workspace-wide green: 80 tests / 0 fails / 2 packages typecheck clean. Slot-rendering work (logo / prompt / sidebar widget) deferred to 2.4b — needs Solid runtime that's heavier than V0a budget. |
| 0.4 | 2026-05-16 | **Client-architecture intake.** Absorbed `airbotix/docs/product/prd/kids-opencode-client-prd.md` v0.3 (the airbotix-session PRD). Q1+Q2 verified in `docs/v2-api-verification.md`. New: Phase 2.4 (TUI plugin skin / A route, before Workshop #1), Phase 2.5 (own-client TUI / C route, after Workshop #1), Phase 7 (V1 Tauri GUI, post-V0). Phase 5 Workshop rewritten as "20 independent local stacks aggregated via audit ingest" (no central serve). New "Upstream sync policy" section codifies the version-pin rules + 15-check upgrade gauntlet. Security baseline (chmod 700 config dir, random server-password, bun auto-install, wrapper exports `OPENCODE_SERVER_PASSWORD`) ticked under Phase 2. |
| 0.3 | 2026-05-15 | **G1-G12 closeout.** Phase 2 + Phase 3 marked engineering-done; Phase 4 mostly engineering-done. CI workflow, 36 plugin tests, acceptance runner, Stars cost estimation, install.sh SHA verification, AI-disclosure banner, --course/--mission flag translation, CHANGELOG/SECURITY/CONTRIBUTING/PR template all landed. Definition-of-V0-Done section rewritten as a 9-row status table. |
| 0.2 | 2026-05-15 | **CLI-first pivot.** Dropped Phase 3 (Kid Web UI), Phase 4 sandbox-hardening reframed for CLI (no virtual FS / iframe), workshop mode moved to airbotix-app integration. Plugin + wrapper + installer are the deliverable. |
| 0.1 | 2026-05-12 | Initial plan. Hosted-web V0 with three-column React UI + server virtual FS. |
