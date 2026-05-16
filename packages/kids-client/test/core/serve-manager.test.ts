import { describe, expect, test } from "bun:test"
import { parseAuditLine } from "../../src/core/serve-manager.ts"

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
