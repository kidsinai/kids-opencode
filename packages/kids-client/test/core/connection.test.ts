import { describe, expect, test } from "bun:test"
import { buildAuthHeader } from "../../src/core/connection.ts"

describe("buildAuthHeader", () => {
  // Regression: opencode ≥1.x compares Basic-auth username against
  // OPENCODE_SERVER_USERNAME (default "opencode"). Sending an empty username
  // ("Basic :pw") produces a 401 even when the password is correct, which
  // surfaced as the "auth mismatch on /app" boot failure.
  test("emits Basic header with explicit username (matches upstream default 'opencode')", () => {
    expect(buildAuthHeader("opencode", "pw")).toBe("Basic " + btoa("opencode:pw"))
  })

  test("base64 payload survives round-trip for non-ASCII-safe passwords", () => {
    const password = "p@ss/word+with=base64-chars"
    const header = buildAuthHeader("opencode", password)
    const decoded = atob(header.replace(/^Basic /, ""))
    expect(decoded).toBe(`opencode:${password}`)
  })

  test("does NOT emit an empty username (the bug that caused 'auth mismatch on /app')", () => {
    const header = buildAuthHeader("opencode", "pw")
    const decoded = atob(header.replace(/^Basic /, ""))
    expect(decoded.startsWith(":")).toBe(false)
  })
})
