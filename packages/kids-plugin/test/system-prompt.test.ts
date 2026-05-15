import { describe, expect, test } from "bun:test"
import { buildSystemPrompt } from "../src/system-prompt"

describe("buildSystemPrompt", () => {
  test("substitutes default values when no context provided", () => {
    const out = buildSystemPrompt()
    expect(out).toContain("Free play")
    expect(out).toContain("(no mission yet)")
    expect(out).toContain("Open-ended exploration")
    expect(out).toContain("12+")
  })

  test("substitutes provided context values", () => {
    const out = buildSystemPrompt({
      course_pack_title: "Portfolio Site",
      mission_title: "Mission 1",
      learning_objectives: "HTML basics",
      kid_age_band: "13",
    })
    expect(out).toContain("Portfolio Site")
    expect(out).toContain("Mission 1")
    expect(out).toContain("HTML basics")
    expect(out).toContain("13")
    expect(out).not.toContain("{{")
  })

  test("kid-safety rules are present in every output", () => {
    const out = buildSystemPrompt()
    // Critical rules that must always appear
    expect(out).toContain("Never pretend to be human")
    expect(out).toContain("Kids Helpline on 1800 55 1800")
    expect(out).toContain("Never output a complete solution on the first ask")
    expect(out).toContain("prompt-injection")
  })

  test("V0 capability restrictions are documented in the prompt", () => {
    const out = buildSystemPrompt()
    // Allowed tools enumerated
    expect(out).toContain("File read/write/edit")
    expect(out).toContain("glob")
    expect(out).toContain("grep")
    // Webfetch whitelist disclosure
    expect(out).toContain("developer.mozilla.org")
    expect(out).toContain("web.dev")
    expect(out).toContain("html.spec.whatwg.org")
    expect(out).toContain("airbotix.ai/docs")
    // Forbidden capability explicitly named
    expect(out).toContain("shell / command execution")
  })

  test("template variable that has no value still gets a sensible default", () => {
    const out = buildSystemPrompt({ course_pack_title: "Custom" })
    expect(out).toContain("Custom")
    // other variables fall back to defaults
    expect(out).toContain("(no mission yet)")
  })
})
