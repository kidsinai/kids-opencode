import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import plugin, { THEME_ID, PLUGIN_ID, bundledThemePath, audit } from "../src/index.ts"

// Token list mirrored from upstream TuiThemeCurrent (see @opencode-ai/plugin/dist/tui.d.ts).
// Any kids-warm.json that ships must define all of these — if upstream adds a
// new required token in a future opencode release, this test catches it.
const REQUIRED_TOKENS = [
  "primary", "secondary", "accent", "error", "warning", "success", "info",
  "text", "textMuted",
  "background", "backgroundPanel", "backgroundElement",
  "border", "borderActive", "borderSubtle",
  "diffAdded", "diffRemoved", "diffContext", "diffHunkHeader",
  "diffHighlightAdded", "diffHighlightRemoved",
  "diffAddedBg", "diffRemovedBg", "diffContextBg",
  "diffLineNumber", "diffAddedLineNumberBg", "diffRemovedLineNumberBg",
  "markdownText", "markdownHeading", "markdownLink", "markdownLinkText",
  "markdownCode", "markdownBlockQuote", "markdownEmph", "markdownStrong",
  "markdownHorizontalRule", "markdownListItem", "markdownListEnumeration",
  "markdownImage", "markdownImageText", "markdownCodeBlock",
  "syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxVariable",
  "syntaxString", "syntaxNumber", "syntaxType", "syntaxOperator", "syntaxPunctuation",
] as const

describe("plugin module structure", () => {
  test("exports a valid TuiPluginModule (tui set, server unset)", () => {
    expect(plugin.id).toBe(PLUGIN_ID)
    expect(typeof plugin.tui).toBe("function")
    expect((plugin as unknown as { server?: unknown }).server).toBeUndefined()
  })

  test("PLUGIN_ID uses the kidsinai org prefix", () => {
    expect(PLUGIN_ID.startsWith("kidsinai:")).toBe(true)
  })
})

describe("bundled theme", () => {
  test("bundledThemePath() points at an existing file", () => {
    const path = bundledThemePath()
    expect(path).toContain(`${THEME_ID}.json`)
    expect(existsSync(path)).toBe(true)
  })

  test("theme JSON has the expected opencode theme schema", () => {
    const raw = readFileSync(bundledThemePath(), "utf-8")
    const json = JSON.parse(raw)
    expect(json["$schema"]).toBe("https://opencode.ai/theme.json")
    expect(json.defs).toBeDefined()
    expect(json.theme).toBeDefined()
  })

  test("theme defines every required token with light + dark variants", () => {
    const json = JSON.parse(readFileSync(bundledThemePath(), "utf-8"))
    const missing: string[] = []
    const incomplete: string[] = []
    for (const token of REQUIRED_TOKENS) {
      const entry = json.theme[token]
      if (!entry) {
        missing.push(token)
        continue
      }
      if (typeof entry.light !== "string" || typeof entry.dark !== "string") {
        incomplete.push(token)
      }
    }
    expect(missing).toEqual([])
    expect(incomplete).toEqual([])
  })

  test("every token value references an existing def or is a literal hex", () => {
    const json = JSON.parse(readFileSync(bundledThemePath(), "utf-8"))
    const defs = new Set(Object.keys(json.defs))
    const isHex = (v: string) => /^#[0-9A-Fa-f]{3,8}$/.test(v)
    const bad: string[] = []
    for (const [token, pair] of Object.entries(json.theme)) {
      for (const mode of ["light", "dark"] as const) {
        const v = (pair as Record<string, string>)[mode]
        if (!v) continue
        if (!defs.has(v) && !isHex(v)) bad.push(`${token}.${mode}=${v}`)
      }
    }
    expect(bad).toEqual([])
  })
})

describe("audit logging", () => {
  test("audit() writes a [kids-tui-audit] prefixed JSON line to stderr", () => {
    const captured: string[] = []
    const original = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: unknown) => {
      captured.push(typeof chunk === "string" ? chunk : String(chunk))
      return true
    }) as typeof process.stderr.write
    try {
      audit("test.event", { foo: "bar" })
    } finally {
      process.stderr.write = original
    }
    expect(captured.length).toBe(1)
    const line = captured[0] ?? ""
    expect(line.startsWith("[kids-tui-audit] ")).toBe(true)
    const json = JSON.parse(line.replace("[kids-tui-audit] ", "").trim())
    expect(json.component).toBe("kids-opencode-tui-plugin")
    expect(json.event).toBe("test.event")
    expect(json.foo).toBe("bar")
    expect(typeof json.ts).toBe("string")
  })
})
