import { describe, expect, test } from "bun:test"
import { ServeManager, classifyProbeStatus, parseAuditLine } from "../../src/core/serve-manager.ts"

describe("parseAuditLine", () => {
  test("parses kids-audit JSON", () => {
    const line = `[kids-audit] {"event":"plugin.loaded","version":"0.0.1"}`
    const parsed = parseAuditLine(line)
    expect(parsed).toEqual({ event: "plugin.loaded", version: "0.0.1" })
  })

  test("parses kids-tui-audit JSON", () => {
    const line = `[kids-tui-audit] {"event":"theme.installed"}`
    expect(parseAuditLine(line)).toEqual({ event: "theme.installed" })
  })

  test("returns null for non-audit lines", () => {
    expect(parseAuditLine("plain log line")).toBeNull()
    expect(parseAuditLine("")).toBeNull()
  })

  test("returns null for malformed audit JSON", () => {
    expect(parseAuditLine("[kids-audit] not json")).toBeNull()
  })
})

describe("classifyProbeStatus", () => {
  test("200 is ok", () => {
    expect(classifyProbeStatus(200)).toBe("ok")
  })

  test("401 and 403 are auth_mismatch (stale serve with wrong password)", () => {
    expect(classifyProbeStatus(401)).toBe("auth_mismatch")
    expect(classifyProbeStatus(403)).toBe("auth_mismatch")
  })

  test("5xx and unexpected codes treated as offline so we retry the spawn", () => {
    expect(classifyProbeStatus(500)).toBe("offline")
    expect(classifyProbeStatus(502)).toBe("offline")
    expect(classifyProbeStatus(404)).toBe("offline")
  })
})

describe("ServeManager probe timeout (no infinite 'Starting AI engine…' hang)", () => {
  test("a /app fetch that never responds is aborted → 'offline', not a forever hang", async () => {
    const orig = globalThis.fetch
    // Simulate a serve that accepts the connection but never sends headers
    // (stuck mid-bootstrap). Only the AbortSignal can end this request.
    globalThis.fetch = ((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        )
      })) as typeof fetch
    try {
      const serve = new ServeManager({
        baseUrl: "http://127.0.0.1:4096",
        serverPassword: "pw",
        serverUsername: "opencode",
        opencodeBin: "opencode",
        probeTimeoutMs: 50,
      })
      const start = Date.now()
      const result = await (serve as unknown as { probe: () => Promise<string> }).probe()
      const elapsed = Date.now() - start
      expect(result).toBe("offline")
      expect(elapsed).toBeLessThan(1_000) // returned promptly via abort, didn't hang
    } finally {
      globalThis.fetch = orig
    }
  })
})
