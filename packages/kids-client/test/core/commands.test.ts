import { describe, expect, test } from "bun:test"
import { parseSlash, matchCommand, filterCommands, COMMANDS } from "../../src/core/commands.ts"

describe("parseSlash", () => {
  test("returns null for non-slash text", () => {
    expect(parseSlash("hello world")).toBeNull()
    expect(parseSlash("  not a command")).toBeNull()
    expect(parseSlash("")).toBeNull()
  })

  test("parses a bare command", () => {
    expect(parseSlash("/model")).toEqual({ name: "/model", args: "" })
    expect(parseSlash("  /new  ")).toEqual({ name: "/new", args: "" })
  })

  test("splits name and args, lowercases the name", () => {
    expect(parseSlash("/Model gpt-4o")).toEqual({ name: "/model", args: "gpt-4o" })
    expect(parseSlash("/sessions  my old chat ")).toEqual({ name: "/sessions", args: "my old chat" })
  })
})

describe("matchCommand", () => {
  test("matches primary slash", () => {
    expect(matchCommand("/model")?.id).toBe("model")
    expect(matchCommand("/help")?.id).toBe("help")
  })

  test("matches aliases (and is case-insensitive)", () => {
    expect(matchCommand("/models")?.id).toBe("model")
    expect(matchCommand("/history")?.id).toBe("sessions")
    expect(matchCommand("/EXIT")?.id).toBe("quit")
    expect(matchCommand("/done")?.id).toBe("check")
  })

  test("returns null for unknown", () => {
    expect(matchCommand("/banana")).toBeNull()
  })

  test("includes the new /compact command", () => {
    expect(matchCommand("/compact")?.id).toBe("compact")
  })
})

describe("filterCommands", () => {
  test("'/' alone returns the whole list", () => {
    expect(filterCommands("/")).toHaveLength(COMMANDS.length)
    expect(filterCommands("")).toHaveLength(COMMANDS.length)
  })

  test("narrows by prefix typing", () => {
    const r = filterCommands("/mod")
    expect(r.map((c) => c.id)).toContain("model")
    expect(r.map((c) => c.id)).not.toContain("quit")
  })

  test("matches against the label too", () => {
    const r = filterCommands("/help")
    expect(r.map((c) => c.id)).toContain("help")
  })
})
