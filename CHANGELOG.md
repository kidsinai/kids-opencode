# Changelog

All notable changes to **Kids OpenCode** are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file covers the user-facing CLI (`kids-opencode`), the plugin (`@kidsinai/kids-opencode-plugin`), and the installer (`install.sh`). They are released in lock-step under a single semver number.

---

## [Unreleased]

### Added
- CI workflow at `.github/workflows/ci.yml` (typecheck + plugin tests + shell lint on every PR + push)
- Plugin unit tests at `packages/kids-plugin/test/`
- Acceptance check runner: `kids-opencode check <mission>` walks `acceptance.yml` against the kid's project folder and reports pass/fail per check
- AI-disclosure banner printed by `kids-opencode` on first run per session (compliance artefact)
- `kids-opencode --course <pack> --mission <id>` flags translated into env vars (`KIDS_COURSE_PACK`, `KIDS_MISSION`, `KIDS_OBJECTIVES`, `KIDS_AGE_BAND`) before exec'ing opencode
- Plugin loads bundled `course-packs/<pack>/pack.yml` and prepends `system_prompt_overlay` to the kid-safe system prompt
- Per-tool Stars cost estimation in plugin audit emit (`stars.estimated` audit line)
- `install.sh`: SHA-256 verification of the `kids-opencode` wrapper before install
- Governance: `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md`

### Changed
- Removed stale `dev` script in root `package.json` (pointed at deleted `packages/kids-web`)

### Fixed
- (none yet)

### Removed
- (none yet)

### Security
- `install.sh` now verifies the wrapper's SHA-256 before placing it on PATH

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
