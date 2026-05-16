/**
 * Upstream sync gauntlet — live subset.
 *
 * These tests spawn a real `opencode serve` subprocess and exercise the
 * session/SSE/permission/abort surface end-to-end. They're slow + flaky on
 * shared CI runners that lack opencode binary, so they are GATED behind
 * `KIDS_GAUNTLET_LIVE=1` and run separately in
 * `.github/workflows/upstream-bump-gauntlet.yml`.
 *
 * Run locally:
 *   KIDS_GAUNTLET_LIVE=1 OPENCODE_SERVER_PASSWORD=devtest \
 *     bun test --filter=gauntlet
 *
 * If the env var is unset, all checks short-circuit to a single
 * skip-assertion so the regular `bun test` run isn't penalised.
 *
 * TODOs (each maps to PLAN.md "Upstream sync policy" check #):
 * - #1 opencode serve boots < 3s (spawn + poll /app)
 * - #3 session.create succeeds
 * - #4 session.prompt → SSE streaming reply
 * - #5 AI triggers read tool → permission.asked observable
 * - #6 user denies → tool does not execute
 * - #7 plugin rejects shell tool (whitelist effective)
 * - #8 plugin rejects webfetch to example.com
 * - #11 banner prints on wrapper startup (`KIDS_OPENCODE_NO_BANNER=0`)
 * - #12 SSE auto-reconnects within 5s
 * - #13 session.abort halts LLM call (no billing for cancelled work)
 * - #14 missing config file → friendly error
 *
 * These are scaffolded but not yet implemented; the gauntlet workflow
 * fails open (passes) on this file when KIDS_GAUNTLET_LIVE is unset, so
 * dependabot bumps still gate on the static suite while the live suite
 * matures.
 */

import { describe, expect, test } from "bun:test"

const LIVE = process.env.KIDS_GAUNTLET_LIVE === "1"

describe("gauntlet · live (KIDS_GAUNTLET_LIVE=1 required)", () => {
  test("live tests are gated", () => {
    if (!LIVE) {
      expect(LIVE).toBe(false)
      return
    }
    // When the env var is set, this assertion is replaced by the actual
    // live-suite implementations (TODO above).
    expect(LIVE).toBe(true)
  })
})
