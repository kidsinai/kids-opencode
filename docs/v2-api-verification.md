# v2 API verification — Q1, Q2, Q3

> Investigation into the upstream `opencode-kernel` source at `~/Documents/sites/kidsinai/opencode-kernel/` (tracking `anomalyco/opencode`) to answer the verification questions raised in `~/Documents/sites/airbotix/docs/product/prd/kids-opencode-client-prd.md` §10 before committing to the Sprint 2 / Phase 2.5 migration plan.
>
> **Snapshot**: kernel commit `c91f5cefd` (tracking upstream as of 2026-05-14). Re-verify on every upstream sync.
> **Author**: kids-opencode session, 2026-05-16
> **Status**: 🟢 Q1 + Q2 resolved · 🟡 Q3 not yet (requires running serve + SDK client end-to-end with a real key)

---

## Q1 — v2 plugin API hook compatibility

### Question (from client-PRD §10)

> Does v2 plugin API still expose `experimental.chat.system.transform`, `tool.execute.before`, `tool.execute.after`? Estimate v1→v2 plugin migration cost.

### Finding

**There is no v1/v2 split for `@opencode-ai/plugin`.** The package is single-versioned (currently `1.14.x`) and exposes one `Hooks` interface at `packages/plugin/src/index.ts`. The "v2" terminology in the PRD conflates plugin-API versioning with SDK-API versioning — only the **SDK** has a v1 / v2 split:

| Package | Version split? | Where |
|---|---|---|
| `@opencode-ai/plugin` | ❌ no — single `Hooks` interface | `packages/plugin/src/index.ts` line 222 |
| `@opencode-ai/sdk` | ✅ yes — v1 and v2 exported separately | `packages/sdk/js/src/index.ts` (v1) + `packages/sdk/js/src/v2/index.ts` (v2) |

The plugin source itself imports types **from both SDK paths**:

```ts
// packages/plugin/src/index.ts (lines 1–14)
import type { … } from "@opencode-ai/sdk"                  // v1 types
import type { Provider as ProviderV2, Model as ModelV2 } from "@opencode-ai/sdk/v2"  // v2 types
```

So the upstream plugin already coexists with both SDK versions internally.

### Hook-by-hook check (line numbers in `packages/plugin/src/index.ts`)

| Hook we use | Still present? | Line | Signature changed? |
|---|---|---|---|
| `experimental.chat.system.transform` | ✅ yes | 290 | identical to what our plugin uses |
| `tool.execute.before` | ✅ yes | 265 | identical |
| `tool.execute.after` | ✅ yes | 273 | identical |

Adjacent hooks we don't use but might in V0b client work:

| Hook | Line | Notes |
|---|---|---|
| `chat.message` | 233 | new message arrival event |
| `chat.params` | 246 | mutate LLM call params |
| `permission.ask` | 260 | intercept the per-tool permission prompt |
| `experimental.chat.messages.transform` | 281 | mutate full message history |
| `experimental.session.compacting` | line elsewhere | customise compaction prompt |
| `experimental.compaction.autocontinue` | line elsewhere | gate the post-compaction auto-resume |

### Migration cost for our plugin

🟢 **Zero cost.** `@kidsinai/kids-opencode-plugin` continues to work against current upstream without source changes. We do not need to "migrate" the plugin to v2 because there is no v2 plugin variant.

What we **may** need later:

- If we add `permission.ask` for our own Stars-budget gate or audit-on-deny path, we need to add a v2 SDK type import (the `Permission` type itself sits in `@opencode-ai/sdk/v2` going forward — verify on first use).
- If we add hooks newly introduced in upstream after our last sync, we need to bump the plugin's `peerDependencies` floor for `@opencode-ai/plugin`.

### What the PRD-D-CL3 decision should land on

D-CL3 in the PRD says "🟡 plugin / SDK / serve 一次到位走 v2 — 待 Q1 验证". Per this verification, the correct framing is:

- **Plugin**: stay on the unified `Hooks` interface (no v1/v2 fork to choose between)
- **SDK**: when (and only when) we build the V0b own-client, prefer `@opencode-ai/sdk/v2` because it has the richer resource set (worktree, experimental, sync, part, question, permission) that the kids client UI will benefit from
- **Serve**: serve is a single endpoint that both SDK versions talk to — no decision needed at the serve layer

Action: **update D-CL3 status from 🟡 to ✅ with this finding.**

### Evidence

| Claim | File:line |
|---|---|
| Single Hooks interface | `packages/plugin/src/index.ts:222` |
| Plugin imports both SDK paths | `packages/plugin/src/index.ts:1-14` |
| `experimental.chat.system.transform` exists in current source | `packages/plugin/src/index.ts:290` |
| `tool.execute.before` exists | `packages/plugin/src/index.ts:265` |
| `tool.execute.after` exists | `packages/plugin/src/index.ts:273` |
| Plugin package metadata (single version, no v2 subpath export) | `packages/plugin/package.json:11-17` |
| `@opencode-ai/sdk/v2` shipped in npm artefact (proves v2 path is published) | `node_modules/.bun/@opencode-ai+sdk@1.14.51/.../dist/v2/index.d.ts` |

---

## Q2 — `opencode serve` readiness signal

### Question (from client-PRD §10)

> How does a wrapper know `opencode serve` is accepting connections? Stdout line? Signal? Readiness endpoint?

### Finding

**Single canonical stdout line** printed by the `serve` command immediately after the underlying HTTP server starts listening. The wrapper does not need to poll any endpoint — it can simply read the subprocess stdout until the line appears.

### Source

`packages/opencode/src/cli/cmd/serve.ts`:

```ts
export const ServeCommand = effectCmd({
  command: "serve",
  describe: "starts a headless opencode server",
  …
  handler: Effect.fn("Cli.serve")(function* (args) {
    if (!Flag.OPENCODE_SERVER_PASSWORD) {
      console.log("Warning: OPENCODE_SERVER_PASSWORD is not set; server is unsecured.")
    }
    const opts = yield* resolveNetworkOptions(args)
    const server = yield* Effect.promise(() => Server.listen(opts))
    console.log(`opencode server listening on http://${server.hostname}:${server.port}`)
    yield* Effect.never
  }),
})
```

After `Server.listen(opts)` resolves (the socket is bound and accepting), the readiness line `opencode server listening on http://HOSTNAME:PORT` is printed. After that the process runs forever (`Effect.never`) until killed.

### Confirmed by upstream SDK

`@opencode-ai/sdk` already implements this pattern in `createOpencodeServer()`:

```js
// node_modules/.bun/@opencode-ai+sdk@1.14.51/.../dist/server.js
proc.stdout?.on("data", (chunk) => {
  output += chunk.toString()
  const lines = output.split("\n")
  for (const line of lines) {
    if (line.startsWith("opencode server listening")) {
      const match = line.match(/on\s+(https?:\/\/[^\s]+)/)
      if (!match) reject(new Error(`Failed to parse server url from output: ${line}`))
      resolve(match[1])
      return
    }
  }
})
```

So the contract is **stable across both v1 and v2 SDK** (the regex is identical and lives in v1 server.js; v2/server.ts uses the same).

### Implication for wrapper auto-spawn design (PRD §7.5)

The wrapper's "auto-spawn serve" sequence becomes:

```sh
1. Check if a serve is already running at the configured port (e.g. `curl -fsS http://127.0.0.1:4096/app -o /dev/null && echo "already running"`)
   - if yes: re-use it (just connect)
   - if no: spawn
2. Spawn `opencode serve --port=$PORT --hostname=127.0.0.1` as a child process with stdout captured
3. Read child stdout line-by-line; on a line starting with "opencode server listening on ", extract the URL
4. Set OPENCODE_BASE_URL=<url> in the env for the rest of the wrapper / client
5. On parent exit (`trap EXIT`), kill the child with SIGTERM (graceful)
```

For V0.4 we don't auto-spawn serve from `bin/kids-opencode` because the current monolithic `opencode` TUI manages its own in-process server. Auto-spawn becomes load-bearing only when we build the Phase 2.5 client. The mechanism documented here is what that client will use.

### Defaults to know

| Setting | Default | Source |
|---|---|---|
| Port | 4096 (when `--port=0` or unset) | `packages/opencode/src/cli/network.ts` |
| Hostname | `127.0.0.1` | `packages/opencode/src/cli/network.ts` |
| Password env var | `OPENCODE_SERVER_PASSWORD` (warns to stdout if unset) | `packages/opencode/src/cli/cmd/serve.ts:14` |
| Multi-project | per-request `x-opencode-directory` header | comment in `packages/opencode/src/cli/cmd/serve.ts:11-12` |
| Graceful shutdown | SIGTERM | `Effect.never` keeps process alive otherwise |

### Action

- **D-CL10** (wrapper auto-manages `opencode serve` subprocess) is implementable. Confirmed.
- **PRD §7.5** wrapper startup sequence: defer concrete implementation to Phase 2.5 client (when the wrapper actually needs to talk to a separate serve subprocess via SDK); for V0.3.x and Phase 2.4, the in-process serve of monolithic `opencode` is sufficient.

---

## Q3 — v2 SDK SSE event schema vs v1 (plugin-emitted audit events visible to v2 client?)

### Status

🟡 **Not verified yet.** Requires running a serve + connecting a v2 client + emitting a plugin event end-to-end. Blocked on:

1. A real LLM provider key (so serve has something to actually do)
2. The Phase 2.5 client work starting (we'd build the test harness as part of it)

### Plan

Park until Phase 2.5 kicks off. Verify Q3 on Day 1 of Phase 2.5 as a 1-hour spike before committing to the audit-pipeline design (PRD §5.4).

If Q3 fails (v2 client cannot subscribe to plugin audit events), the fallback is:

- Plugin keeps writing audit lines to stderr
- A separate sidecar process (or the wrapper itself) tails stderr and forwards to platform-backend `/api/audit`
- This is uglier but works and was the implicit V0 design before we hoped to use the SSE channel directly

So Q3 has a known fallback — it doesn't block the overall plan.

---

## Summary of D-CL\* status updates

| Decision | PRD status (2026-05-15) | Verified status (2026-05-16) |
|---|---|---|
| D-CL3 plugin / SDK / serve 一次到位走 v2 | 🟡 待 Q1 验证 | ✅ **resolved**: plugin stays on unified `Hooks`; SDK uses `/v2` subpath when building own-client; serve unaffected |
| D-CL10 wrapper auto-manages `opencode serve` | ✅ locked | ✅ confirmed: stdout readiness signal works; pattern proven by upstream SDK's own implementation |

D-CL4 (`OPENCODE_SERVER_PASSWORD` required) is also confirmed by the source — when missing, serve prints "Warning: ... unsecured" to stdout and continues to bind without auth, which is exactly the threat the wrapper's password-file mechanism closes.

---

## What this unblocks

| Sprint | Status before verification | After |
|---|---|---|
| Sprint 1 (security baseline) | ✅ done | ✅ done |
| Sprint 2 (v1→v2 plugin migration + TUI plugin for Workshop #1) | 🔴 blocked on Q1 | 🟢 **unblocked** — no migration needed; can go straight to TUI plugin |
| Sprint 2 (TUI plugin via `@opencode-ai/plugin/tui` subpath) | 🟡 contract unverified | 🟢 same Hooks contract; plus `@opencode-ai/plugin/tui` exports OpenTUI primitives (`packages/plugin/src/tui.ts`) — see follow-up read |
| Sprint 3+ (Phase 2.5 own-client) | 🔴 blocked on Q1, Q2 | 🟢 **unblocked** — SDK v2 client API ready; serve readiness mechanism documented |
| Sprint 3+ (audit pipeline via SSE) | 🟡 blocked on Q3 | 🟡 still blocked but with documented fallback (stderr-tail sidecar) |

---

## What to write into PLAN.md v0.4

Suggested changes informed by this verification:

1. **Sprint 2 scope tightens**: drop the "migrate plugin v1→v2" task; replace with "verify plugin keeps loading after each upstream bump". Saves ~2 days of unnecessary refactor work.
2. **TUI plugin (Phase 2.4)**: import from `@opencode-ai/plugin/tui` (a confirmed real export — see `packages/plugin/package.json` exports map line 13). The OpenTUI types (`CliRenderer`, `KeyEvent`, `Renderable`, `SlotMode`) are re-exported, so we don't pull `@opentui/core` as a separate dep.
3. **Phase 2.5 own-client**: design around the documented stdout-readiness pattern + SDK v2 client API. Day 1 includes the Q3 spike.
4. **Upstream sync policy (PRD §8)**: add a CI step that re-runs our 36 plugin tests against the latest `@opencode-ai/plugin` + `@opencode-ai/sdk` published versions and fails the PR if hook signatures drift. This is the smallest-possible early-warning system against the plugin-API-stability assumption above.

---

## References

- Canonical PRD: `~/Documents/sites/airbotix/docs/product/prd/kids-opencode-client-prd.md`
- Kernel source: `~/Documents/sites/kidsinai/opencode-kernel/packages/plugin/src/index.ts`, `packages/opencode/src/cli/cmd/serve.ts`, `packages/opencode/src/server/server.ts`
- Existing plugin under verification: `packages/kids-plugin/src/index.ts` (uses 3 of the hooks confirmed above)
- Handoff doc: `docs/client-architecture-handoff.md`

---

## Revision history

| Version | Date | Author | Note |
|---|---|---|---|
| 0.1 | 2026-05-16 | kids-opencode session | Q1 + Q2 resolved against opencode-kernel snapshot. Q3 deferred to Phase 2.5 Day 1. |
