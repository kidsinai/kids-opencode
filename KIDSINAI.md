# Kids in AI — Kids OpenCode Product Notes

> This file captures the product intent for **Kids OpenCode** — Airbotix Kids in AI's V0 flagship. The upstream `opencode` agent runtime (`anomalyco/opencode`, MIT) is tracked separately in [`kidsinai/opencode-kernel`](https://github.com/kidsinai/opencode-kernel); this repo is **not a fork** of it.

## What this repo is

The product layer on top of opencode:

- Kid-facing web UI (replaces opencode's adult TUI/IDE)
- Virtual filesystem with per-`(family_id, project_id)` namespace isolation
- Course-pack runner with kid-safe system prompts
- Parent audit log (every tool call observable)
- DeepRouter LLM integration (no direct vendor API calls)
- Workshop Mode (class context + credit pool)

Why this design beats forking opencode directly:
- Saves 6–12 months of agent-runtime engineering (we don't rebuild plan/approve, tool use, diff/apply)
- opencode is model-agnostic — DeepRouter slots in via env var
- We avoid carrying a heavy upstream rebase burden by depending via npm SDK + plugin instead of source

## Two-repo architecture (decided 2026-05-14)

| Repo | Role | Visibility |
|---|---|---|
| `kidsinai/kids-opencode` (this) | Product code | Private, MIT |
| `kidsinai/opencode-kernel` | Pure upstream tracking fork of `anomalyco/opencode` | Public, MIT |

Product code consumes opencode purely via:

- **`@opencode-ai/sdk`** (npm) — client for opencode server (agent loop, tool registry)
- **`@opencode-ai/plugin`** (npm) — hook/plugin registration

No source imports from `opencode-kernel`. Local dev: run `opencode-kernel` as a server alongside, point `OPENCODE_BASE_URL` at it.

## What we build here

| Where | What | Phase |
|---|---|---|
| `packages/kids-web/` | React + Vite + Tailwind + Monaco — 3-pane kid web UI | Phase 3 (W5-6) |
| `packages/kids-plugin/` | Tool whitelist (no Bash), kid-safe system prompt, audit hooks, Stars meter | Phase 4 (W7-8) |
| `packages/kids-vfs/` | Virtual FS: path guard + namespace isolation; AWS S3 (Sydney) + Neon Postgres | Phase 4 (W7-8) |
| iframe preview | `<iframe sandbox="allow-scripts">` for HTML/CSS/JS in kid browser | Phase 4 (W7-8) |
| DeepRouter adapter | Wire `@opencode-ai/sdk` model client to DeepRouter `/v1` | Phase 2 (W3-4) |

## V0 scope (NARROW)

- **Languages**: HTML / CSS / JS **only**. No Python, Node, Bash, or shell. No server-side kid-code execution.
- **Hosting**: Hosted only. V1+ adds Tauri desktop.
- **Audience**: Kids 12+ (flagship Airbotix narrative).
- **First Course Pack**: "我的第一个 AI 项目 — 个人作品集网站" (3 Missions, ~30-50 Stars budget).

## V1+ expansion (post-PMF)

- Pyodide (Python in browser) — natural first expansion before any server-side container
- Server-side sandbox (gVisor / Firecracker) — only when course packs really need it
- Local desktop mode (Tauri preferred over Electron)
- Robotics bridge (WebUSB → Airbotix mBots)

## Backend stack (per airbotix CLAUDE.md, locked 2026-05-14)

- Backend API: NestJS + Prisma + Neon Postgres
- Host: AWS EC2 t3.small Sydney (`ap-southeast-2`) + Docker Compose + nginx
- Object storage: AWS S3 Sydney (virtual FS blobs)
- Realtime: WebSocket (NestJS Gateway)
- Auth: JWT + refresh + OTP (SendGrid)
- Payments: Airwallex
- LLM: DeepRouter `/v1`

Hard rules: **no Supabase, no Stripe, no Fly.io**. AU user data must stay in `ap-southeast-2`.

## Spec source

| Doc | Location |
|---|---|
| Master cross-product plan | `~/Documents/sites/kidsinai/planning/PROJECT.md` |
| Full technical spec | `~/Documents/sites/airbotix/docs/product/prd/kids-opencode-spec.md` |
| Parent platform PRD | `~/Documents/sites/airbotix/docs/product/prd/kids-ai-platform-prd.md` |
| Compliance constraints | `~/Documents/sites/airbotix/docs/product/compliance/minors-compliance.md` |
| DeepRouter (sibling) | `~/Documents/sites/deeprouter-ai/deeprouter/` |
| Kernel fork (sibling) | `~/Documents/sites/kidsinai/opencode-kernel/` |

## Sibling repos

- `Airbotix-AI/creative-web` — Line A creative web (6-11)
- `Airbotix-AI/platform-backend` — shared NestJS backend (Family / Wallet / Course Pack / Audit)
- `kidsinai/opencode-kernel` — upstream tracking fork
- `deeprouter-ai/deeprouter` — LLM gateway
