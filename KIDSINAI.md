# Kids in AI — Kids OpenCode Product Notes

> Product intent for **Kids OpenCode** — Airbotix Kids in AI's V0 flagship coding mentor. **V0 is a CLI** (`kids-opencode`), installed via `curl ... | sh`, running in the user's terminal. Not a hosted web app, not a desktop GUI. The web portal (parent dashboard, kids-Learn SPA) is a separate Airbotix product (`Airbotix-AI/airbotix-app`).

## What this repo is

A thin, kid-safe layer on top of `opencode`:

- A **plugin** (`@kidsinai/kids-opencode-plugin`) that adds tool-whitelist enforcement, the kid-safe system prompt, webfetch host-whitelisting, and an audit-event emitter.
- A **config preset** (`config/opencode.json.template`) that pre-wires DeepRouter as the model provider and asks for permission on every tool use.
- A **wrapper script** (`bin/kids-opencode`) so the kid types one command and gets the kid-safe experience without remembering flags.
- A **curl installer** (`install.sh`) that orchestrates the three above into one paste-able command.
- Bundled **course packs** (`course-packs/`) — first one is the personal portfolio mission, more later.

Why this design beats forking opencode directly:
- We don't carry an upstream-rebase burden. `opencode-kernel` tracks upstream; this repo only consumes via npm.
- Same `opencode` your CTO uses, with kid-safe defaults swapped in. Easy to audit, easy to teach.
- Saves 6–12 months of agent-runtime engineering.

## Two-repo architecture (decided 2026-05-14)

| Repo | Role | Visibility |
|---|---|---|
| `kidsinai/kids-opencode` (this) | Product code (plugin + config + wrapper + installer + course packs) | Private, MIT |
| `kidsinai/opencode-kernel` | Pure upstream tracking fork of `anomalyco/opencode` | Public, MIT |

Product code consumes opencode purely via:

- **`@opencode-ai/sdk`** (npm) — programmatic types and the SDK client (used by tests and future tooling; the kid CLI itself shells out to `opencode`)
- **`@opencode-ai/plugin`** (npm) — hook / plugin registration

No source imports from `opencode-kernel`.

## V0 product shape (revised 2026-05-15 — CLI-first)

| Layer | What we ship | Where |
|---|---|---|
| **Install** | `curl https://airbotix.ai/install/kids \| sh` | `install.sh` in this repo, served via the airbotix marketing site |
| **Binary** | `kids-opencode` shell wrapper on PATH | `bin/kids-opencode` |
| **Plugin** | `@kidsinai/kids-opencode-plugin` (npm published) | `packages/kids-plugin/` |
| **Config preset** | `~/.config/kids-opencode/opencode.json` | derived from `config/opencode.json.template` |
| **System prompt** | Bundled in the plugin (canonical source: `config/system-prompt.md`) | `packages/kids-plugin/src/system-prompt.ts` |
| **Course packs** | First mission ("Personal Portfolio Website") | `course-packs/portfolio-site/` (TBD) |

What we **do not** ship in V0:
- ❌ Web SPA (deferred to `Airbotix-AI/airbotix-app` if/when needed; not this repo's concern)
- ❌ Desktop GUI (Tauri/Electron) — deferred V1+
- ❌ Virtual filesystem layer (kids' code lives on their own machine; no S3, no Supabase Storage in the kid path)
- ❌ Browser iframe preview (kids open `index.html` in their own browser)
- ❌ Server-side agent runtime / per-session container

## V0 scope (NARROW)

- **Languages**: HTML / CSS / JavaScript **only**. Bash and arbitrary command execution are explicitly removed from the agent tool list.
- **Age**: kids 12+.
- **Run target**: macOS + Linux. Windows installer is V1.
- **Provider routing**: DeepRouter by default (managed mode). Bring-your-own-key supported but discouraged for families with kids under 16.
- **First Course Pack**: "Personal Portfolio Website" (3 missions, ~30-50 Stars budget per family).

## V1+ expansion (post-PMF)

- Pyodide (Python in a sandbox the agent can drive) for kids who outgrow HTML/CSS/JS
- Windows installer
- Course Pack authoring tool for teachers
- Robotics Bridge: agent writes `arduino` / `mBot` programs and flashes them over WebUSB (when paired with `Airbotix-AI/airbotix-app`)
- An optional web wrapper served by `Airbotix-AI/airbotix-app` for families who can't install on their device

## Backend stack used by the managed mode (`Airbotix-AI`)

When a family uses DeepRouter-managed mode, the supporting backend is:

- Backend API: NestJS + Prisma + Neon Postgres (`Airbotix-AI/platform-backend`)
- Host: AWS EC2 t3.small Sydney (`ap-southeast-2`) + Docker Compose + nginx
- Object storage: AWS S3 Sydney (audit log archives, NOT kid code)
- Realtime: WebSocket (NestJS Gateway)
- Auth: JWT + Refresh + OTP (SendGrid)
- Payments: Airwallex
- LLM: DeepRouter `/v1`

Hard rules: **no Supabase, no Stripe, no Fly.io**. AU user data stays in `ap-southeast-2`.

For the **CLI itself**, no Airbotix infrastructure is on the data path — kid code lives in the kid's own folder, the only outbound calls are to DeepRouter (or directly to a provider in BYOK mode).

## Spec source

| Doc | Location |
|---|---|
| Master cross-product plan | `~/Documents/sites/Airbotix-AI/planning/PROJECT.md` |
| Full technical spec (v0.2; **pre-CLI-pivot, stale**) | `~/Documents/sites/airbotix/docs/product/prd/kids-opencode-spec.md` — needs revision |
| Parent platform PRD | `~/Documents/sites/airbotix/docs/product/prd/kids-ai-platform-prd.md` |
| Compliance master | `~/Documents/sites/airbotix/docs/product/compliance/minors-compliance.md` |
| Compliance per-jurisdiction (this repo) | `./docs/compliance/au.md` |
| DeepRouter (sibling) | `~/Documents/sites/deeprouter-ai/deeprouter/` |
| Kernel fork (sibling) | `~/Documents/sites/kidsinai/opencode-kernel/` |

## Sibling repos

- `Airbotix-AI/airbotix` — marketing site, `airbotix.ai/install/kids` lives here
- `Airbotix-AI/airbotix-app` — Parent Portal + Kids Learn SPA (managed-mode parent UX)
- `Airbotix-AI/platform-backend` — shared NestJS backend (Family / Wallet / Audit / Tenant key issuance)
- `kidsinai/opencode-kernel` — upstream tracking fork
- `deeprouter-ai/deeprouter` — LLM gateway

## Revision history

| Version | Date | Note |
|---|---|---|
| 0.2 | 2026-05-15 | CLI-first V0 pivot. Dropped kids-web + kids-vfs packages. Wrapper + plugin + installer are the deliverable. |
| 0.1 | 2026-05-14 | Two-repo split; original hosted-web V0 plan. |
