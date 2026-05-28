# Changelog

All notable changes to **Kids OpenCode** are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file covers the user-facing CLI (`kids-opencode`), the plugin (`@kidsinai/kids-opencode-plugin`), and the installer (`install.sh`). They are released in lock-step under a single semver number.

---

## [Unreleased]

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
