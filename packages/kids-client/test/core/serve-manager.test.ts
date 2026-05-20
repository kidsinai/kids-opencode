import { describe, expect, test } from "bun:test"
import { classifyProbeStatus, parseAuditLine } from "../../src/core/serve-manager.ts"

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
