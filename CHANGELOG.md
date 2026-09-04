# Changelog

All notable changes to **Kids OpenCode** are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file covers the user-facing CLI (`kids-opencode`), the plugin (`@kidsinai/kids-opencode-plugin`), and the installer (`install.sh`). They are released in lock-step under a single semver number.

---

## [Unreleased]

### Changed
- Kept technical failure detail out of the child-facing terminal error screen and simplified setup
  and recovery copy.

### Added
- **`scripts/redteam-run.mjs`** — automated red-team runner. Drives all 55 prompts in
  `docs/red-team.md` non-interactively through the kid-safety layer
  (`opencode run --format json`), captures a transcript per prompt, and writes a
  `redteam-results-<tag>.csv` (every row `needs-review` — no fragile auto-grading).
  `--dry-run` verified (parses 55/55, classes A–G); a full graded run is pending a
  provider key + sign-off (Phase 4). Manual procedure retained as fallback.
- **`prompt-v1.0` git tag** — baseline of the 10-rule kid-safe system prompt
  (`config/system-prompt.md`), per the version-registry convention in the umbrella
  `docs/product/compliance/system-prompt-versioning.md`.

## [0.0.24] — 2026-06-02

### Changed
- **Lock-step version re-alignment.** All four packages are back on a single version. 0.0.23 had
  bumped CLI / client / tui-plugin but left `@kidsinai/kids-opencode-plugin` at 0.0.22 (it had no
  changes); this release brings the plugin onto the shared number and points every internal
  `@kidsinai/*` dependency at `^0.0.24`. No functional changes since 0.0.23.

## [0.0.23] — 2026-06-02

### Fixed
- Chat / `/model` picker / boot reliability against `opencode serve` 1.15.x: working `/model`
  picker (uses `config.providers()`), auth-aware error screens + a Settings entry, SDK v2 session
  call-shape matches, a bounded readiness probe so a stuck serve can't freeze boot, and a top
  padding row so screens aren't glued to the terminal edge.

## [0.0.22] — 2026-06-01

### Added (UX parity, phase B)
- **Richer chat rendering** for the AI's replies — fenced ```code``` blocks render in a bordered,
  colored box (with a language label); headings, bullet lists, inline **bold** and `code` are
  formatted. No heavy dependency — a small built-in renderer (`MessageBody`). Kid/system messages
  stay plain. Handles an unterminated code fence mid-stream.

### Notes
- Phase C of the gap-closing plan: **scrollback already works** via the terminal's own scroll
  (finished messages are printed through Ink `<Static>`, i.e. into the terminal scrollback —
  mouse-wheel / Shift-PgUp). **Multi-line input is deferred** on purpose: `ink-text-input` is
  single-line and a custom multi-line input is high-risk against the tuned key handling
  (voice / ↑-history / @ / Esc / `/`) for little kid-facing benefit.

## [0.0.21] — 2026-06-01

### Added (UX parity, phase A)
- **Input history** — `↑` in the mission input recalls earlier prompts (`↓` walks forward),
  gated to an empty box so it never fights typing. History persists across the session.
- **`@file` mentions** — typing `@` autocompletes project files (`find.files`) above the input;
  the kid names a file and the AI reads it via the existing `read` tool (no new capability, kid-safe).
  New `core/files.ts` + `FileSuggestions` component.
- **`/sessions` now rehydrates the transcript** — opening a past chat loads its messages
  (`session.messages`, mapped user→kid / assistant-text→agent) instead of starting blank.
- **`/compact`** — shrink a long chat server-side (`session.compact`) to save space.

(Phase B — richer code/markdown rendering — and phase C — scrollback / multi-line — to follow.)

## [0.0.20] — 2026-06-01

### Fixed
- **"Your AI teacher is thinking…" never cleared.** Real root cause: SDK 1.14.51's
  `session.prompt` / `session.abort` take a single parameters object
  (`{ sessionID, prompt: { text } }`), not the legacy `(sessionID, { parts })` positional shape —
  the wrong shape made opencode silently drop the message. Calls now use the correct shape and pass
  `throwOnError` so 4xx/5xx surface instead of hanging. (Landed across `ddc63fc`/`e29404c`/`f0007b5`.)
- **`/model` selection was being ignored.** The prompt-shape fix above had dropped the model
  passthrough; re-wired it — the picked `providerID/modelID` is now split and sent in the SDK's
  `model: { providerID, modelID }` field on every turn.

## [0.0.19] — 2026-06-01

### Added
- **Slash commands + `/` palette in the mission screen.** kids-client is a custom kid-safe TUI (not
  opencode's native one), so it grows its own command set. Type `/` and a live, filtered suggestion
  list appears above the input; finish the command and press Enter. Commands: `/help`, `/model`,
  `/sessions` (a.k.a. `/history`), `/new`, `/check` (+`/done`), `/clear`, `/menu` (`/home`), `/quit`.
  New `core/commands.ts` registry (pure + unit-tested) and an inline `CommandSuggestions` component.
- **`/model` picker (server-backed).** Lists the server's available models (`provider.list()`,
  flattened kid-friendly via `core/models.ts`) in a full-width picker; the choice is remembered and
  passed through `session.prompt({ model })` on every following turn. New `ModelChoice` state +
  `PickList` component.
- **`/sessions` history (server-backed).** Lists past sessions (`session.list()`); picking one
  continues it server-side (`session.switchTo`). Transcript rehydration of older messages is a
  later enhancement — for now the local view starts clean with a "switched" toast.

### Changed
- **Input box is now full-width** (`width: 100%`) so it matches the header instead of taking half
  the row.

### Notes
- Deliberately **excluded for kid-safety**: `/share` (public links), `/editor` / drop-to-shell,
  external `@`-mentions, arbitrary `config` edits. The server-side tool whitelist already blocks the
  dangerous primitives; these affordances are simply not surfaced.

## [0.0.18] — 2026-05-31

### Added
- **Voice input — "press Space to talk" in the mission screen.** Space (when idle and not mid-typing) starts recording, Enter/Space stops, Esc cancels. Built on a pure `core/voice/` engine (VoiceController state machine + Recorder + STT adapter + VAD) bridged to Ink via `useVoiceInput`. Degrades-don't-crash: demo mode when `sox`/`ffmpeg` is absent, MockStt when DeepRouter STT creds are missing, so a missing key never crashes. (WIP: the meter is a "recording" pulse, not true mic energy; real-energy VAD auto-stop is still to come.)

### Fixed
- **Layout cascade** — the App root Box is pinned to the terminal width × height so nested borders stop cascading/overflowing on resize.

### Changed
- `MissionScreen` Esc is unified across voice + navigation: while recording it cancels voice; otherwise it interrupts a thinking AI, clears a half-typed draft, or (idle + empty) returns to the startup menu.

## [0.0.17] — 2026-05-31

Dogfood-driven bugfix release. 0.0.16 was unusable — the AI engine never started — plus several
TUI usability problems. All four packages bumped in lock-step to 0.0.17.

### Fixed
- **AI engine never started (`event stream failed … undefined is not a function (near '…raw of stream…')`)** — `EventSubscriber.consume()` iterated `client.global.event()` directly, but the `@opencode-ai/sdk` (≥1.14.x, against opencode 1.15.1) returns `Promise<ServerSentEventsResult<…>>` (`{ data, stream }`), not a bare async-iterable. `for await … of` on a Promise threw, the subscriber retried 11× then surfaced "AI teacher didn't start". Now awaits the call and extracts the async-iterable via a `pickAsyncIterable()` helper that tolerates all three SDK shapes (`events.ts`).
- **Misleading "AI teacher didn't start" on a *dropped* stream** — the post-connection `onDisconnected` path reused the `serve_unreachable` error but with a detail that implied a failed startup. Detail now reads "lost connection to the AI engine after it started — …" so a mid-session drop isn't mistaken for a boot failure (`index.tsx`).
- **Cascading border render bug** in `Header` + `CoursePackPicker` that garbled the layout.
- **Ink output corruption** — the TUI now renders into the terminal's alt-screen buffer so stray stdout from the engine no longer bleeds into the UI.
- **OAuth provider sign-in** — auto-open the OAuth URL with a copy-paste fallback when the browser can't be launched (`bin/kids-opencode`).

### Changed
- **Higher-contrast default theme (D)** — dark-terminal secondary text was `gray`/`blackBright`, near-invisible on many themes. `DARK` now uses `whiteBright` primary + `white` secondary so body copy actually reads. `COLORFGBG` auto-detect and the `KIDS_THEME=hc|dark|light` override are unchanged.
- **Back / quit navigation (C)** — kids were trapped after picking a project. `MissionScreen` now leaves to the startup menu on `Esc` when idle (still interrupts the AI while thinking, still clears a half-typed draft first). `StartupScreen` gains a `[q]` quit. Mirrors the existing `Esc`-to-back pattern in `CoursePackPicker` / `HelpScreen`.
- **OpenAI provider label (B)** — dropped the stray Chinese from the otherwise-English label; now reads "OpenAI GPT (sign in with ChatGPT Plus/Pro)".

## [0.0.16] — 2026-05-31

First lock-step release of all four packages under a single version: the CLI (`@kidsinai/kids-opencode`), client (`@kidsinai/kids-client`), plugin (`@kidsinai/kids-opencode-plugin`), and TUI plugin (`@kidsinai/kids-opencode-tui-plugin`). Headline feature is the project-type picker + guided flow.

### Added
- **Project-type picker + per-type guided flow (V0a)** — a kid running `kids-opencode` with no flags now lands on a kid-friendly project-type picker ("What do you want to make today?") instead of free-play. Each pack declares `type_category` / `icon` / `picker_label` / `picker_order` + a `guided_flow` block (a one-sentence idea prompt + a set of named *vibes* — palette+font bundles the kid picks by one word). Skill scaffolders (`scaffold-canvas-game`, `scaffold-portfolio-page`) are file templates the plugin pre-renders and embeds in the system prompt so the kid sees something on screen within ~5 minutes; this is deliberately **template-based with no new tool** — the `read/write/edit/glob/grep/webfetch` whitelist is unchanged. New **Game** pack ("A game you can play" — 3 missions, HTML5 canvas) and the **portfolio-site pack renamed to `website`** ("A website about you", legacy id aliased). Curriculum content moved to the private `kidsinai/kids-flows` submodule at `packages/kids-plugin/course-packs/private/`; the public repo keeps the mechanism + a `_stub` CI fixture. New `KIDS_VIBE_ID` / `KIDS_PROJECT_NAME` env vars feed the scaffold templates. Free-play remains available via `[f]` on the startup screen.
- **`[w] Wallet / Top-up` shortcut in the TUI** — the StartupScreen now always renders a `[w]` hint, and the `stars_exhausted` ErrorScreen surfaces it as a first-class action (next to `[Enter] Retry`). Pressing it opens the parent's default browser to `https://app.airbotix.ai/portal/wallet?from=cli&device=<uuid>&lang=<locale>` (configurable via `AIRBOTIX_PORTAL_URL` for staging). The portal handles login + Airwallex card entry; the TUI never touches card data so PCI scope stays in the browser. A stable per-install device-id is persisted at `~/.config/kids-opencode/device-id` (chmod 600) so future device-link / wallet-event correlation has a key. A success toast confirms the open (`✓ Opened in your browser: <url>`), and on platforms where `open` / `xdg-open` is missing the toast falls back to a warn message printing the full URL for manual copy. Released as `@kidsinai/kids-client@0.0.12` + `@kidsinai/kids-opencode@0.0.15`.

### Fixed
- **wrapper `KIDS_OPENCODE_VERSION` was hardcoded** — every release had to bump both `package.json` and `bin/kids-opencode` line 23 by hand; missed bumps made `kids-opencode --version` lie (and the auto-update check repeatedly nag "new version available"). Wrapper now derives the version from the sibling `package.json` via portable `sed`, so a single `package.json` bump is enough. Released as `@kidsinai/kids-opencode@0.0.14`.
- **kids-client auth header (root cause of "AI teacher didn't start / auth mismatch on /app")** — the readiness probe + SDK client were sending `Basic :<password>` (empty username); opencode ≥1.x `authorized()` requires `credentials.username === config.username` (default `"opencode"`), so every request 401'd even with the correct password. Now sends `Basic opencode:<password>` and exposes a new `OPENCODE_SERVER_USERNAME` env override for parity with upstream. Verified against `opencode@1.15.1`: old header → 401, new header → 200. Released as `@kidsinai/kids-client@0.0.11` + `@kidsinai/kids-opencode@0.0.13`.
- **kids-client `ErrorScreen`** — when the AI engine fails with a config-related variant (`serve_unreachable` / `port_taken` / `auth_failed` / `config_missing`), the screen now offers `[c] Change settings` alongside `[Enter] Retry`. Jumps into the existing SetupScreen wizard so a parent can switch provider or paste a fresh API key without re-running the wrapper; after save, env is reloaded and serve readiness is re-probed inline.
- **kids-client `ServeManager`** — fix kid-visible "still booting" hang when a stale `opencode serve` from an earlier session is still bound to `127.0.0.1:4096` with a different `OPENCODE_SERVER_PASSWORD`. `probe()` now classifies the response tri-state (`ok` / `auth_mismatch` / `offline`) and `ensureReady()` short-circuits to a new readiness kind `port_taken_auth_mismatch` instead of trying to spawn into an already-bound port and timing out after 10s. Added a matching `port_taken` ErrorScreen variant in both locales pointing the parent at `kids-opencode --shutdown`. Spawn races the readiness poll against `proc.exited` so EADDRINUSE / config failures surface in <1s with the stderr tail, not after the full timeout.

### Added
- **`@kidsinai/kids-opencode-tui-plugin`** — new sibling npm package at `packages/kids-tui-plugin/`. Phase 2.4a TUI plugin: bundled `kids-warm` theme (49 tokens, light + dark variants, all referencing a shared palette defs object); simplified 8-binding keymap layer that masks the upstream `?` help; locale-aware kid-friendly status text (English + zh-Hans); dangerous-topic detector that pops a Kids Helpline overlay when the server-side system prompt's exact helpline phrase appears in chat output (or when a narrow self-harm hint matches); mission-progress sidebar string builder. 44 unit tests cover theme structure + audit format + every helper module. Slot-rendering work (logo / prompt / sidebar widget) deferred to Phase 2.4b — requires Solid runtime.
- CI workflow at `.github/workflows/ci.yml` (typecheck + plugin tests + shell lint on every PR + push)
- Release pipelines: `.github/workflows/publish-plugin.yml` (npm) and `.github/workflows/publish-installer.yml` (S3 + CloudFront + SBOM)
- Plugin unit tests at `packages/kids-plugin/test/` (36 tests across 4 files)
- Acceptance check runner: `kids-opencode check <mission>` walks `acceptance.yml` against the kid's project folder and reports pass/fail per check
- AI-disclosure banner printed by `kids-opencode` on first run per session (compliance artefact)
- `kids-opencode --course <pack> --mission <id>` flags translated into env vars (`KIDS_COURSE_PACK`, `KIDS_MISSION`, `KIDS_OBJECTIVES`, `KIDS_AGE_BAND`) before exec'ing opencode
- `kids-opencode --version`, `--kids-help` subcommands
- Plugin loads bundled `course-packs/<pack>/pack.yml` and prepends `system_prompt_overlay` to the kid-safe system prompt
- Per-tool Stars cost estimation in plugin audit emit (`stars_estimated` field on `tool.execute.before`)
- `install.sh`: SHA-256 verification of the `kids-opencode` wrapper before install
- `install.sh`: auto-install `bun` runtime if missing (required by `kids-opencode check`)
- `docs/v2-api-verification.md` — Q1 + Q2 findings against opencode-kernel; concludes our plugin needs no v1→v2 migration and documents the `opencode serve` stdout readiness signal
- `docs/client-architecture-handoff.md` — cross-session handoff brief from the airbotix-session client/architecture PRD
- Governance: `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md`, `.github/pull_request_template.md`

### Changed
- Removed stale `dev` script in root `package.json` (pointed at deleted `packages/kids-web`)
- Course Pack files moved into `packages/kids-plugin/course-packs/` so they ship with the npm package
- PLAN.md → v0.4 (adds Phase 2.4 TUI plugin skin, Phase 2.5 own-client TUI, Phase 7 V1 GUI; rewrites Phase 5 Workshop as 20 independent local stacks aggregated via audit ingest, not a central serve)

### Security
- **install.sh**: generates a random `OPENCODE_SERVER_PASSWORD` via `openssl rand -base64 32` (with `/dev/urandom` fallback) to `~/.config/kids-opencode/server-password` (chmod 600), idempotent across reinstalls
- **install.sh**: sets `chmod 700` on `~/.config/kids-opencode/` (config dir, holds password today and the encrypted DeepRouter API key once `kids-opencode register` lands)
- **bin/kids-opencode**: reads the server-password file and exports `OPENCODE_SERVER_PASSWORD` before exec'ing opencode. Without this, opencode's internal HTTP server binds `127.0.0.1:4096` with **no authentication** — any local process can drive the agent, read kid project files, and bill LLM calls against the family wallet. Fails loudly with reinstall instructions if the password file is missing.
- **install.sh**: SHA-256 verification of the `kids-opencode` wrapper before placing it on PATH

---

## [0.0.1] — TBD

First tagged release. Captures the engineering work done in Phases 0-4 of [`PLAN.md`](./PLAN.md).

### Added (initial)
- `bin/kids-opencode` wrapper around upstream `opencode`
- `install.sh` one-line installer
- `@kidsinai/kids-opencode-plugin` (kid-safe system prompt + tool whitelist + audit emit)
- `config/opencode.json.template` (DeepRouter provider + ask-per-tool permission)
- `config/system-prompt.md` (canonical kid-safe prompt)
- Bundled Course Pack: "Personal Portfolio Website" (3 missions, ~40⭐)
- AU compliance audit at `docs/compliance/au.md` + per-item answers at `docs/compliance/au-lawyer-pass.md`
- AI Safety Assessment v0.1 at `docs/safety-assessment.md`
- 50-prompt red-team set at `docs/red-team.md`
- NDB incident runbook at `docs/runbook/ndb-incident.md`
- OAIC consultation submission draft at `docs/compliance/au-oaic-copc-submission-draft.md`

### Known issues / pending external dependencies
- Plugin not yet published to npm (`@kidsinai` scope auth pending Lightman)
- `airbotix.ai/install/kids` endpoint not yet deployed (separate Airbotix-AI/airbotix repo work)
- Real workshop dogfood not yet run (Phase 6 of PLAN.md)
- 8 AU-* items pending qualified-AU-lawyer review (see `docs/compliance/au-lawyer-pass.md`)

---

## How to read this file

- `[Unreleased]` accumulates changes between tagged releases. Move sections under a new version heading when tagging.
- Each release line links the GitHub tag and the date.
- Categories: Added / Changed / Deprecated / Removed / Fixed / Security.
- Be specific about what end-users will notice. "Plugin refactor" is too vague; "Plugin now refuses webfetch to non-whitelisted hosts" is right.
