# examples/

Smallest possible end-to-end exercises of the kids-opencode + opencode-kernel two-repo architecture.

| File | What it shows | Phase |
|---|---|---|
| `hello-world-agent.ts` | `@opencode-ai/sdk` driving a 5-step agent loop against a `opencode serve` instance in the kernel repo | Phase 1 (W1-2) acceptance |

## Prerequisites

1. **Bun** ≥ 1.1 — `which bun` to verify.
2. **Kernel checkout** at `~/Documents/sites/kidsinai/opencode-kernel/` with `bun install` already run.
3. **Provider auth** on the kernel side. Two paths:
   - **Pre-DeepRouter (Phase 1)**: `cd ~/Documents/sites/kidsinai/opencode-kernel && bun run dev auth login` once — store an Anthropic / OpenAI key. Tier-accumulating Anthropic keys are preferred (per master plan); per-tenant separation comes via DeepRouter in Phase 2.
   - **Post-DeepRouter (Phase 2+)**: configure the kernel's provider config to point at `https://staging.deeprouter.ai/v1` (or local DeepRouter at `http://localhost:3000/v1`) with the `airbotix-kids` tenant API key.

## Run hello-world-agent

```bash
# Terminal A — start the kernel server
cd ~/Documents/sites/kidsinai/opencode-kernel
bun run dev serve --port=4096

# Terminal B — drive it from this repo
cd ~/Documents/sites/kidsinai/kids-opencode
bun install
OPENCODE_BASE_URL=http://localhost:4096 bun examples/hello-world-agent.ts
```

Expected output: session created → 1+ tool invocations observed (plan, write_file) → session ended.

## What this does NOT exercise yet

- Kid-safe constraints (no plugin loaded; the agent has full upstream tool access)
- Virtual filesystem isolation (writes hit your real OS filesystem in the project the kernel was launched against)
- DeepRouter routing (kernel calls the provider directly until Phase 2)
- Course Pack runner / Stars metering / parent audit log

Those come in later phases per `PLAN.md`.
