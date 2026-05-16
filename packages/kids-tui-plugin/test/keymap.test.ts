import { describe, expect, test } from "bun:test"
import { KID_BINDINGS, buildKidKeymapLayer, buildKidHelpText } from "../src/keymap.ts"

describe("KID_BINDINGS", () => {
  test("contains the V0 baseline 8 bindings", () => {
    const ids = KID_BINDINGS.map((b) => b.id)
    expect(ids).toContain("submit")
    expect(ids).toContain("approve")
    expect(ids).toContain("deny")
    expect(ids).toContain("cancel")
    expect(ids).toContain("scroll_up")
    expect(ids).toContain("scroll_down")
    expect(ids).toContain("help")
    expect(ids).toContain("quit")
    expect(ids.length).toBe(8)
  })

  test("every binding has at least one key", () => {
    for (const b of KID_BINDINGS) {
      expect(b.keys.length).toBeGreaterThan(0)
      expect(b.label.length).toBeGreaterThan(0)
      expect(b.command.length).toBeGreaterThan(0)
    }
  })
})

describe("buildKidKeymapLayer", () => {
  test("priority is high enough to mask upstream layer (>50)", () => {
    expect(buildKidKeymapLayer().priority).toBeGreaterThan(50)
  })

  test("layer id is 'kids'", () => {
    expect(buildKidKeymapLayer().id).toBe("kids")
  })

  test("layer bindings match KID_BINDINGS exactly", () => {
    const layer = buildKidKeymapLayer()
    const cmdIds = Object.keys(layer.bindings)
    expect(cmdIds.length).toBe(KID_BINDINGS.length)
    for (const b of KID_BINDINGS) {
      expect(layer.bindings[b.command]).toEqual(b.keys)
      expect(layer.commands[b.command]?.description).toBe(b.label)
    }
  })
})

describe("buildKidHelpText", () => {
  test("includes the kids-opencode title", () => {
    expect(buildKidHelpText()).toContain("Kids OpenCode")
  })

  test("lists every binding label", () => {
    const help = buildKidHelpText()
    for (const b of KID_BINDINGS) {
      expect(help).toContain(b.label)
    }
  })

  test("does NOT leak upstream power-user commands like command palette", () => {
    const help = buildKidHelpText().toLowerCase()
    expect(help.includes("command palette")).toBe(false)
    expect(help.includes("mcp")).toBe(false)
    expect(help.includes("agent switch")).toBe(false)
  })

  test("ends with the encouragement line", () => {
    expect(buildKidHelpText().trimEnd()).toMatch(/Have fun building!$/)
  })
})
