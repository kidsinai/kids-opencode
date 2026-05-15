# Kids OpenCode

> Agentic AI coding tool for kids 12+. Airbotix Kids in AI's V0 flagship product.

**Status**: 🟡 Phase 0 done (fork + plan). Phase 1 (code archaeology) starting.

## What this is

The kid-facing product layer:

- **Kid Web UI** — three-pane React app (project tree + Monaco editor + agent dialog), built from scratch (not forking opencode's adult-facing UI)
- **Virtual filesystem sandbox** — server-side per-`(family_id, project_id)` namespace; no real OS filesystem touched by kid code
- **Course-pack runner** — mission-based learning packs with custom system prompts per pack
- **Parent audit log** — every agent tool call is observable in Parent Dashboard
- **DeepRouter integration** — all LLM traffic routed through DeepRouter `/v1` (no direct vendor API calls)
- **Workshop Mode** — credit pool switch + class context injection when launched from a Class URL

## What this is NOT

Not a fork of the opencode codebase. We depend on opencode purely via npm:

- `@opencode-ai/sdk` — client for opencode server (agent loop, tool registry, plan/approve)
- `@opencode-ai/plugin` — plugin / hook registration for kid-safe constraints

The opencode upstream kernel is mirrored at [`kidsinai/opencode-kernel`](https://github.com/kidsinai/opencode-kernel) — a pure tracking fork, kept clean for rebase. **Product code never imports from that repo.**

## Two-repo split (decided 2026-05-14)

| Repo | Role | License | Visibility |
|---|---|---|---|
| `kidsinai/kids-opencode` (this) | Product code: UI, plugin, vfs, course-packs | MIT | Private |
| `kidsinai/opencode-kernel` | Upstream tracking fork of anomalyco/opencode | MIT (inherited) | Public |
| `anomalyco/opencode` (upstream) | Open-source agent runtime | MIT | Public |

Rationale and full PRD: see `KIDSINAI.md` and `PLAN.md` in this repo, plus the spec at `airbotix/docs/product/prd/kids-opencode-spec.md` (sibling repo).

## Package layout

```
packages/
├── kids-web/      # React + Vite + Tailwind + Monaco — the kid-facing web app
├── kids-plugin/   # @opencode-ai/plugin registration: tool whitelist, system prompt, audit hooks
└── kids-vfs/      # Server-side virtual filesystem (path guard + namespace per project)
```

## Cross-repo dependencies

- **DeepRouter** (`~/Documents/sites/deeprouter-ai/deeprouter/`) — LLM gateway, V0 critical-path. See its `PLAN.md`.
- **platform-backend** (`Airbotix-AI/platform-backend`) — Family Account / Stars wallet / Course Pack API / parent dashboard. Tech stack per Airbotix CLAUDE.md (NestJS + Prisma + Neon Postgres + AWS S3 + Airwallex, hosted on AWS EC2 Sydney).
- **opencode-kernel** (`kidsinai/opencode-kernel`) — upstream tracking fork.

## Development

⏳ Local dev quickstart pending Phase 1 (W1-2). See [`PLAN.md`](./PLAN.md) for the phase-by-phase plan.

## License

MIT — same as upstream opencode. Private repo today; may open-source post-V0 launch.
