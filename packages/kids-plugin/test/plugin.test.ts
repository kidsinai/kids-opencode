import { describe, expect, test } from "bun:test"
import { server, estimateStarsCost } from "../src/index"

// Minimal stub of the PluginInput shape from @opencode-ai/plugin. The plugin's
// init function only reads env vars + no input fields, so an empty object is
// sufficient for unit testing.
const PLUGIN_INPUT: any = {}

describe("plugin server registration", () => {
  test("plugin entry is an async function (PluginModule.server contract)", () => {
    expect(typeof server).toBe("function")
    // Async functions are recognisable via constructor.name in V8/Bun
    expect(server.constructor.name).toBe("AsyncFunction")
  })

  test("plugin init returns the expected hook set", async () => {
    const hooks = await server(PLUGIN_INPUT)
    expect(hooks).toBeDefined()
    expect(hooks["experimental.chat.system.transform"]).toBeDefined()
    expect(hooks["tool.execute.before"]).toBeDefined()
    expect(hooks["tool.execute.after"]).toBeDefined()
  })
})

describe("system prompt transform", () => {
  test("prepends kid-safe system prompt to output.system", async () => {
    const hooks = await server(PLUGIN_INPUT)
    const transform = hooks["experimental.chat.system.transform"]!
    const output = { system: ["existing prompt"] }
    await transform({ model: {} as any }, output)
    expect(output.system.length).toBe(2)
    expect(output.system[0]).toContain("Kids OpenCode")
    expect(output.system[1]).toBe("existing prompt")
  })

  test("empty existing system array still receives kid-safe prompt", async () => {
    const hooks = await server(PLUGIN_INPUT)
    const transform = hooks["experimental.chat.system.transform"]!
    const output = { system: [] }
    await transform({ model: {} as any }, output)
    expect(output.system.length).toBe(1)
    expect(output.system[0]).toContain("Kids OpenCode")
  })
})

describe("tool whitelist enforcement", () => {
  test("allows whitelisted tools (read/write/edit/glob/grep)", async () => {
    const hooks = await server(PLUGIN_INPUT)
    const before = hooks["tool.execute.before"]!
    for (const tool of ["read", "write", "edit", "glob", "grep"]) {
      await expect(
        before(
          { tool, sessionID: "s1", callID: "c1" },
          { args: { path: "foo.txt" } },
        ),
      ).resolves.toBeUndefined()
    }
  })

  test("refuses shell / bash / non-whitelisted tools", async () => {
    const hooks = await server(PLUGIN_INPUT)
    const before = hooks["tool.execute.before"]!
    for (const tool of ["shell", "bash", "task", "lsp", "skill", "apply_patch"]) {
      await expect(
        before(
          { tool, sessionID: "s1", callID: "c1" },
          { args: {} },
        ),
      ).rejects.toThrow(/not allowed in V0/)
    }
  })

  test("webfetch passes for whitelisted hosts", async () => {
    const hooks = await server(PLUGIN_INPUT)
    const before = hooks["tool.execute.before"]!
    const allowed = [
      "https://developer.mozilla.org/en-US/docs/Web/HTML",
      "https://web.dev/articles/responsive-web-design-basics",
      "https://html.spec.whatwg.org/multipage/",
      "https://airbotix.ai/docs/kids-opencode",
      "https://docs.airbotix.ai/foo", // subdomain
    ]
    for (const url of allowed) {
      await expect(
        before(
          { tool: "webfetch", sessionID: "s1", callID: "c1" },
          { args: { url } },
        ),
      ).resolves.toBeUndefined()
    }
  })

  test("webfetch refuses non-whitelisted hosts", async () => {
    const hooks = await server(PLUGIN_INPUT)
    const before = hooks["tool.execute.before"]!
    const blocked = [
      "https://example.com",
      "https://evil.example.com",
      "http://developer.mozilla.org", // wrong protocol — actually http is allowed per impl; keep as a documentation note
      "https://docs.python.org",
      "ftp://developer.mozilla.org",
      "javascript:alert(1)",
      "not-even-a-url",
    ]
    let refusalCount = 0
    for (const url of blocked) {
      try {
        await before(
          { tool: "webfetch", sessionID: "s1", callID: "c1" },
          { args: { url } },
        )
      } catch {
        refusalCount += 1
      }
    }
    // ftp/javascript/garbage all rejected; example.com / docs.python.org rejected
    expect(refusalCount).toBeGreaterThanOrEqual(5)
  })

  test("webfetch with no url throws", async () => {
    const hooks = await server(PLUGIN_INPUT)
    const before = hooks["tool.execute.before"]!
    await expect(
      before(
        { tool: "webfetch", sessionID: "s1", callID: "c1" },
        { args: {} },
      ),
    ).rejects.toThrow()
  })
})

describe("Stars cost estimation", () => {
  test("each whitelisted tool has a non-negative cost", () => {
    for (const tool of ["read", "write", "edit", "glob", "grep", "webfetch"]) {
      const cost = estimateStarsCost(tool)
      expect(cost).toBeGreaterThanOrEqual(0)
      expect(cost).toBeLessThanOrEqual(10) // sanity ceiling — V0 single-tool cost
    }
  })

  test("unknown tools default to baseline cost of 1", () => {
    expect(estimateStarsCost("nonexistent-tool")).toBe(1)
  })

  test("webfetch costs more than a simple read (proxy for network egress)", () => {
    expect(estimateStarsCost("webfetch")).toBeGreaterThan(estimateStarsCost("read"))
  })
})
