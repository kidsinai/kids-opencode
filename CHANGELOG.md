# Changelog

All notable changes to **Kids OpenCode** are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file covers the user-facing CLI (`kids-opencode`), the plugin (`@kidsinai/kids-opencode-plugin`), and the installer (`install.sh`). They are released in lock-step under a single semver number.

---

## [Unreleased]

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
