# @kidsinai/kids-client

> **Status:** Phase 2.5 MVP scaffold (2026-05-16). Not yet npm-published; consumed via workspace + `bun link` for dogfood.

The own-client TUI for Kids OpenCode. Talks to a local `opencode serve` process over `@opencode-ai/sdk/v2`. Replaces the upstream Solid.js TUI with a kid-warm Ink (React+Node) experience: branded welcome screen, Mission progress + Stars balance, permission dialogs the kid actually understands, friendly error screens, Kids Helpline overlay for crisis terms.

## Why this exists

Per [`kids-opencode-client-prd.md`](../../../airbotix/docs/product/prd/kids-opencode-client-prd.md) §2 **C route**, the terminal-end UX must not look like an engineer tool. Upstream `opencode` is a great agent runtime but a hostile first impression for a 12-year-old. This package owns the rendering layer.

Architecture (see PRD §2.3):

```
kids-opencode wrapper → kids-client (this package, Ink)
                         │
                         spawns + supervises
                         ↓
                       opencode serve (upstream kernel + @kidsinai/kids-opencode-plugin)
                         │
                         routes LLM via
                         ↓
                       DeepRouter
```

## How it runs

```
$ kids-opencode --course portfolio-site --mission mission-1
```

The wrapper:
1. Loads `OPENCODE_SERVER_PASSWORD` from `~/.config/kids-opencode/server-password`
2. Translates `--course` / `--mission` to env vars
3. Exec's `kids-client`

The client:
1. Probes `http://127.0.0.1:4096/app` with Basic Auth
2. If down, spawns `opencode serve` as its child and pipes stderr
3. Parses `[kids-audit] {...}` lines into the audit pipeline (local jsonl buffer; remote ingest plumbed but disabled)
4. Subscribes to `client.global.event()` SSE
5. Renders the kid-warm Ink TUI

## Architecture inside this package

- **`src/core/`** — pure TS, no Ink imports. State machine, SDK client, SSE dispatcher, serve subprocess manager, audit pipeline. **V1 Tauri reuses this verbatim.**
- **`src/render/ink/`** — Ink components and screens. Replaceable with a WebView render layer for V1.

### Files

```
src/index.tsx                  Composition root; main()
src/core/env.ts                Reads KIDS_*/OPENCODE_* env, validates
src/core/serve-manager.ts      Spawns + tails opencode serve
src/core/connection.ts         createOpencodeClient with Basic Auth
src/core/session.ts            session.create / prompt / abort
src/core/events.ts             SSE subscribe + dispatch
src/core/store.ts              useSyncExternalStore-compatible pub/sub
src/core/audit-pipeline.ts     stderr → jsonl buffer (+ future remote POST)
src/dangerous-topic-bridge.ts  Crisis-term patterns (mirrors kids-tui-plugin)

src/render/ink/App.tsx                  Router
src/render/ink/theme.ts                 Kid-warm color tokens
src/render/ink/screens/StartupScreen.tsx
src/render/ink/screens/MissionScreen.tsx
src/render/ink/screens/PermissionModal.tsx
src/render/ink/screens/DangerousTopicModal.tsx
src/render/ink/screens/ErrorScreen.tsx
src/render/ink/components/Header.tsx
src/render/ink/components/ChatStream.tsx
src/render/ink/components/Input.tsx
src/render/ink/components/Thinking.tsx
src/render/ink/components/KeyHints.tsx
```

## Dogfood (current path)

From a clone of `kidsinai/kids-opencode`:

```
bun install
bun link --cwd packages/kids-client
KIDS_LLM_BYPASS_GATEWAY=1 ANTHROPIC_API_KEY=sk-ant-... \
  kids-opencode --course portfolio-site --mission mission-1
```

The startup screen should render within ~3 seconds. The wrapper's `--shutdown` subcommand kills any lingering serve on `:4096`.

## V0 MVP scope cuts

Items in the PRD that we deliberately deferred to keep Phase 2.5 shippable for Workshop #2:

- **Session resume across client crashes** (PRD §5.3) — client kills serve on exit; deferred to V1
- **Sound pack** — deferred to V1 Tauri
- **Embedded browser preview** — V1 Tauri
- **Locale runtime switching** — V0 reads `$LANG` once at startup
- **Multi-mission parallel** — single active session only
- **Project sharing** — handled in `airbotix-app` web side

## Tests

```
bun test
```

31 tests across env validation, store mutation, audit pipeline jsonl write,
dangerous-topic pattern detection, and Ink snapshot of StartupScreen/ErrorScreen
variants. Wired into CI via `.github/workflows/ci.yml`.

## Related

- Plan: `~/.claude/plans/resilient-sleeping-pancake.md`
- Q3 spike result: `../../docs/v2-api-verification.md` §Q3
- Plugin (server-side kid-safety): `../kids-plugin/`
- TUI plugin (A-route theme/keymap, sibling): `../kids-tui-plugin/`
