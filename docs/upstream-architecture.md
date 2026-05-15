# Upstream Architecture — opencode (anomalyco/opencode @ v1.14.51)

> Phase 1 deliverable per `PLAN.md`. One-page tour of the upstream `opencode` codebase, anchored to the files we'll touch (via plugin) or depend on (via SDK) — never fork. Snapshot date: 2026-05-14.

## TL;DR — the 8 files that matter

| Role | File (in `kidsinai/opencode-kernel`) | Why it matters for Kids OpenCode |
|---|---|---|
| 1. CLI entry | `packages/opencode/src/index.ts` | yargs router; lists every subcommand. `opencode serve` is what we'll spawn. |
| 2. Headless server | `packages/opencode/src/cli/cmd/serve.ts` + `packages/opencode/src/server/server.ts` | HTTP API exposing session/prompt/tool endpoints — exactly what `@opencode-ai/sdk` talks to. |
| 3. Agent loop | `packages/opencode/src/session/run-state.ts` | Run-state scheduler; the loop that plans → invokes tools → observes → iterates. We do not touch; we observe via SDK events. |
| 4. **Model adapter** | `packages/opencode/src/session/llm.ts` | Where LLM calls happen (uses `ai` SDK + `streamText`). **DeepRouter integration point** — configured via provider config, not by source edits. |
| 5. Provider registry | `packages/opencode/src/provider/provider.ts` + `provider/transform.ts` | Provider definition + request/response transforms. DeepRouter is just another OpenAI-compatible provider entry. |
| 6. **Tool registry** | `packages/opencode/src/tool/registry.ts` | Imports each Tool class. The **bash/shell tool** (`tool/shell.ts`) is the one we remove for V0. Tool whitelisting belongs in our plugin. |
| 7. Plugin loader | `packages/opencode/src/plugin/loader.ts` | Loads npm packages declared in config; this is the seam our `@kidsinai/kids-plugin` plugs into. |
| 8. **SDK client (our consumer)** | `packages/sdk/js/src/gen/sdk.gen.ts` (`OpencodeClient` class) | Generated from OpenAPI. Exposes `session.create / prompt / messages / abort / shell / revert`. This is what `kids-web` imports via `@opencode-ai/sdk`. |

## Concept map (~30 sec read)

```
            ┌───────────────────────────────────────────────────────────────┐
            │  packages/opencode (CLI + server + agent core)                │
            │                                                                │
            │   serve.ts ──► server.ts ──► HTTP routes                       │
            │                      │                                         │
            │                      ▼                                         │
            │   session/run-state.ts  (agent loop)                           │
            │       │            │                                           │
            │       │            ▼                                           │
            │       │       session/llm.ts ──► provider/provider.ts          │
            │       │                              │                         │
            │       ▼                              ▼                         │
            │   tool/registry.ts ◄── plugin/loader.ts ◄── @opencode-ai/plugin│
            │       │                                                        │
            │       └── read.ts / write.ts / edit.ts / glob.ts / grep.ts /   │
            │           webfetch.ts / shell.ts / plan.ts / question.ts ...   │
            └─────────────────────────▲─────────────────────────────────────┘
                                      │  HTTP
                  ┌───────────────────┴───────────────────┐
                  │  @opencode-ai/sdk  (OpencodeClient)   │  ◄── kids-opencode imports this
                  └───────────────────────────────────────┘
```

## Tool surface (V0 relevant)

`packages/opencode/src/tool/` (each is its own `<name>.ts` + `<name>.txt` prompt):

| Tool | V0 status | Notes |
|---|---|---|
| `read`, `write`, `edit` | ✅ keep (wrap via vfs) | Our plugin routes paths through `@kidsinai/kids-vfs` path-guard. |
| `glob`, `grep`, `codesearch` | ✅ keep | Read-only over vfs. |
| `webfetch`, `websearch` | ⚠️ keep, whitelist | `webfetch.ts` will be wrapped to enforce the V0 host whitelist (mdn / w3c / airbotix docs). |
| **`shell`** | ❌ **disable for V0** | This is the "Bash" equivalent. Plugin removes it from the registry. |
| `plan`, `question`, `todo` | ✅ keep | Drives the plan→approve UX we make prominent in Kid UI. |
| `apply_patch` | ✅ keep | Behind approve. |
| `task` (sub-agent) | ⚠️ defer | V0 single-agent; D-KO-multi-agent in V1. |
| `lsp`, `skill`, `mcp-websearch` | ❌ defer | Not in V0 scope; remove or hide. |
| `repo_clone`, `repo_overview` | ❌ defer | Networked git; no real OS git in V0. |

## Plugin contract (the seam we build against)

From `@opencode-ai/plugin/dist/index.d.ts` and `tool.d.ts`:

```ts
// What a plugin exports (kids-plugin will export this shape)
export type Plugin = (input: PluginInput) => Promise<PluginHooks> | PluginHooks
export type PluginHooks = {
  tool?: { execute?: { before?: Hook; after?: Hook } }
  permission?: { ask?: Hook }
  event?: Hook
  /* …more — see @opencode-ai/plugin source */
}
```

The plugin loader reads from `~/.config/opencode/opencode.json` (or per-project `opencode.json`) — declarations look like:

```json
{ "plugin": ["@kidsinai/kids-opencode-plugin"] }
```

The loader auto-installs the npm package if not present, then dynamically imports it. **This means we do not patch upstream tool files** — we register `before` hooks that mutate args (e.g., add vfs prefix to file paths) or refuse execution (e.g., shell tool).

## How kids-opencode actually consumes opencode (revised 2026-05-15)

**V0 is a CLI.** The kid runs `kids-opencode` in their terminal; that's a thin shell wrapper that exec's `opencode --config <ours> ...`. So our consumption pattern is **process composition**, not the SDK.

The SDK is still relevant for:
- TypeScript type definitions in `@kidsinai/kids-opencode-plugin`
- Future programmatic tests
- Future tooling (e.g., automated red-team runners)

Example SDK use (test / tooling only — NOT the kid's path):

```ts
import { createOpencode, createOpencodeClient, OpencodeClient } from "@opencode-ai/sdk"

// Option A — SDK spawns its own opencode subprocess (dev convenience):
const { client, server } = await createOpencode({ config: { /* DeepRouter base URL etc. */ } })

// Option B — connect to an already-running kernel server (prod):
const client = createOpencodeClient({ baseUrl: "http://localhost:4096" })

// Run an agent step
const session = await client.session.create()
const result = await client.session.prompt({ path: { id: session.data!.id }, body: { prompt: "make a hello.html" } })
```

Public surface (top-level resources on `OpencodeClient`): `session`, `tool`, `provider`, `file`, `path`, `find`, `command`, `mcp`, `lsp`, `formatter`, `config`, `instance`, `event`, `auth`, `oauth`, `app`, `project`, `pty`, `tui`, `vcs`, `control`, `global`.

The two we'll use most in V0:
- **`session`** — `create / prompt / messages / abort / status / fork / shell / revert / share / diff / summarize`
- **`event`** — server-sent events stream (planned tool calls, results) for the agent dialog UI

## What we deliberately do NOT depend on

| Upstream | Why we don't import | What we do instead |
|---|---|---|
| `@opencode-ai/core` (`private: true`) | Internal API, not semver-stable | Treat as opaque; only reach in through SDK |
| `@opencode-ai/llm` (`private: true`) | Internal | Provider config via SDK / config file |
| `@opencode-ai/app` (not published) | Adult-facing UI; wrong audience | Build our own kid UI in `packages/kids-web` |
| `packages/desktop` | adult desktop | V1 desktop will be Tauri, separate |
| `packages/console` | SST / cloud-admin UI | Out of scope |

## Open questions / risks surfaced by the audit

1. **Effect-based codebase** — upstream is heavily on `effect`/`Layer`/`Context`. Plugins must speak this idiom or use the plugin shim. Check `@opencode-ai/plugin` returns a plain JS surface (yes — confirmed in `packages/plugin/src/index.ts`). 
2. **`session.prompt` is the unit of agent invocation** — but tool-call streaming happens via the `event` resource. Phase 3 (Kid Web UI) must subscribe to it.
3. ~~**`@opencode-ai/sdk@^1.14` spawn path** assumes `opencode` CLI on `PATH`.~~ **Resolved (2026-05-15)**: V0 is a CLI, so `opencode` on PATH is exactly what we want — the user's `install.sh` installs the upstream binary as the first step. No deployment headache, no hosted server, no Fly.io/EC2 question for the V0 kid path.
4. **Permission engine** (`packages/opencode/src/permission/`) is real — we may want to bind it to the kid UI "同意 / 修改 / 取消" buttons rather than handling approval purely in our plugin.

## Phase 1 acceptance items addressed

- [x] **OC-1**: `anomalyco/opencode` confirmed as canonical (`sst/opencode` is the old name; current is `anomalyco`; MIT licensed; v1.14.51 is the latest published SDK as of 2026-05-14).
- [x] **OC-2**: model adapter protocol — `session/llm.ts` uses the Vercel `ai` SDK underneath; providers are pluggable via `provider/provider.ts`. DeepRouter slots in as an OpenAI-compatible provider configured at runtime; no source patch needed.
- [x] **D-KO3** fork strategy — confirmed plugin/middleware path is viable. Tool whitelisting, path-guarding (vfs), webfetch host-whitelisting, system-prompt augmentation, audit hooks — all expressible via `@opencode-ai/plugin` `before/after` hooks. No core fork needed.

Remaining Phase 1 work for the engineer: actually wire a tenant API key, run `bun run dev serve`, and demo a 5-step agent loop through the SDK (see `examples/hello-world-agent.ts`).
