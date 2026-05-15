#!/usr/bin/env bun
/**
 * hello-world-agent.ts
 *
 * Phase 1 (W1-2) acceptance demo. Drives a 5-step agent loop against an
 * upstream `opencode serve` instance using @opencode-ai/sdk.
 *
 * This is the smallest possible end-to-end exercise of the two-repo
 * architecture decided 2026-05-14:
 *
 *   kidsinai/kids-opencode   (this repo) ──HTTP──► kidsinai/opencode-kernel
 *           (SDK client)                                (opencode serve)
 *
 * Usage:
 *
 *   # 1) In the kernel repo, in another terminal:
 *   cd ~/Documents/sites/kidsinai/opencode-kernel
 *   bun run dev serve --port=4096
 *
 *   # 2) In this repo:
 *   cd ~/Documents/sites/kidsinai/kids-opencode
 *   OPENCODE_BASE_URL=http://localhost:4096 bun examples/hello-world-agent.ts
 *
 * Anthropic / OpenAI keys are configured on the kernel side via opencode's
 * own auth mechanism (`opencode auth login` once, then keys persist in
 * ~/.local/share/opencode/). When DeepRouter is wired (Phase 2), set the
 * kernel's provider config to point at our DeepRouter base URL instead.
 */

import { createOpencodeClient } from "@opencode-ai/sdk"

const BASE_URL = process.env.OPENCODE_BASE_URL ?? "http://localhost:4096"

const client = createOpencodeClient({ baseUrl: BASE_URL })

async function main() {
  // 1) Create a session
  const created = await client.session.create({ body: { title: "kids-opencode hello-world" } })
  if (created.error || !created.data) throw new Error(`session.create failed: ${JSON.stringify(created.error)}`)
  const sessionId = created.data.id
  console.log(`✓ session ${sessionId} created`)

  // 2) Send a kid-style prompt — should plan a tiny file, ask before writing.
  const promptText = "Make me a single-file index.html that says hello in a big purple heading."
  console.log(`→ prompting: ${promptText}`)

  const result = await client.session.prompt({
    path: { id: sessionId },
    body: {
      parts: [{ type: "text", text: promptText }],
    },
  })

  if (result.error) {
    console.error("prompt failed:", result.error)
    process.exit(1)
  }

  // 3) Pull message history; agent's plan + tool calls should appear here.
  const messages = await client.session.messages({ path: { id: sessionId } })
  console.log(`✓ got ${messages.data?.length ?? 0} messages`)
  for (const m of messages.data ?? []) {
    console.log(`  - ${m.info.role}: ${m.parts.length} part(s)`)
  }

  // 4) (V0 acceptance) at least one tool call should have happened.
  //    In a kid product we would have intercepted this through a plugin
  //    before-hook and rendered "estimated N⭐, approve?" in the UI.
  const toolCalls = (messages.data ?? []).flatMap((m) =>
    m.parts.filter((p) => p.type === "tool"),
  )
  console.log(`✓ tool invocations observed: ${toolCalls.length}`)

  // 5) Cleanup — leaves project files in place but ends the session.
  await client.session.abort({ path: { id: sessionId } })
  console.log("✓ session ended.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
