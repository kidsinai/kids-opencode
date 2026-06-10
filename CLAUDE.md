# CLAUDE.md — kidsinai/kids-opencode

> Project context for AI coding tools. This repo lives in the **`kidsinai` org** (community /
> open-distribution brand), mounted as a submodule of the `airbotix-ai` umbrella at
> `~/Documents/sites/airbotix-ai/kids-opencode/`.
>
> ⚠️ **Org boundary (non-negotiable).** Changes to `kidsinai/*` repos require **explicit, per-task user
> consent**. Without it: discuss, don't commit. Read the umbrella-root `CLAUDE.md` for platform rules, but
> note this repo is MIT/open and intentionally decoupled from the cloud products.

## What this repo is

**Kids OpenCode** — a kid-safe **command-line** AI coding mentor for kids 12+, built as a thin layer on top
of [`opencode`](https://github.com/anomalyco/opencode) (MIT). V0 is a CLI (`kids-opencode`) installed via
`curl … | sh` and run in the user's terminal — **not** a hosted web app or GUI. The cloud web portal
(parent dashboard + kids Learn SPA) is a separate product (`airbotix-app`), not this repo.

**Read first:**
- `KIDSINAI.md` — product intent, two-repo architecture, V0 product shape (source of truth for "why").
- `PLAN.md` — phased plan + what's left before it's safe for real kids.
- `README.md` — user-facing overview. `CHANGELOG.md` — what shipped.

## Architecture

A thin, kid-safe layer that consumes `opencode` **only via npm** (`@opencode-ai/sdk`,
`@opencode-ai/plugin`) — **no source imports** from `opencode-kernel` (the separate upstream-tracking fork).
This avoids carrying an upstream-rebase burden.

| Piece | Where |
|---|---|
| Plugin (`@kidsinai/kids-opencode-plugin`) — tool whitelist, kid-safe system prompt, webfetch host allowlist, audit emitter | `packages/kids-plugin/` |
| Config preset (DeepRouter model provider, permission-on-every-tool) | `config/opencode.json.template` |
| Wrapper binary (`kids-opencode` on PATH) | `bin/kids-opencode` |
| curl installer | `install.sh` |
| Course packs (bundled missions) | `packages/kids-plugin/course-packs/` |
| Other workspaces | `packages/{kids-opencode,kids-client,kids-tui-plugin}/` |

**Course-pack content** (`pack.yml`, mission briefs, scaffolds, vibe palettes) is IP-sensitive and lives in
the **`kids-flows`** private repo, mounted here as a git submodule at
`packages/kids-plugin/course-packs/private/`. Open-source clones see that dir empty and fall back to the
public `course-packs/_stub/` fixture.

## Stack & commands

**Bun** workspaces (`bun >= 1.1.0`, `workspaces: ["packages/*"]`). POSIX-sh installer + wrapper.

```bash
bun install
bun run typecheck     # bun --filter '*' typecheck
bun run test          # bun --filter '*' test
bun run smoke         # sh -n install.sh + sh -n bin/kids-opencode + typecheck
```

## Hard rules specific to this repo

- **Kid safety first** — the tool whitelist (`read/write/edit/glob/grep/webfetch`), webfetch host allowlist,
  and kid-safe system prompt are the product's whole point. Never widen them without explicit sign-off.
- **All LLM traffic routes through DeepRouter** `/v1` (OpenAI-compatible) — the monetization moat lives in
  DeepRouter, not in code access. No direct Anthropic/OpenAI calls.
- **Consume opencode via npm only** — never add a source dependency on `opencode-kernel`.
- Don't hand-edit the submodule content under `course-packs/private/` from this repo; edit it in `kids-flows`.

## Related repos

```
~/Documents/sites/airbotix-ai/kids-opencode/    THIS REPO (kidsinai, MIT)
~/Documents/sites/airbotix-ai/opencode-kernel/  upstream-tracking fork of opencode (kidsinai, dev branch)
~/Documents/sites/airbotix-ai/kids-flows/        private course-pack content (submodule of this repo)
~/Documents/sites/airbotix-ai/airbotix/          marketing site — serves the installer at airbotix.ai/install/kids
~/Documents/sites/airbotix-ai/                    umbrella hub (Airbotix-AI cloud products + shared rules)
```
