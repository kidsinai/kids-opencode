import { describe, expect, test } from "bun:test"
import { detectDangerousTopic, buildHelplineOverlay } from "../src/dangerous-topic.ts"

describe("detectDangerousTopic", () => {
  test("triggers on exact Helpline phrase from system prompt", () => {
    const text =
      "It sounds like something serious is going on. The best thing is to talk to a parent, teacher, or someone you trust right now. In Australia, you can call Kids Helpline on 1800 55 1800 any time — they're free and confidential."
    const r = detectDangerousTopic(text)
    expect(r.triggered).toBe(true)
    expect(r.reason).toBe("helpline_mention")
    expect(r.matchedText).toContain("1800 55 1800")
  })

  test("triggers on self-harm hint (defensive path)", () => {
    const r = detectDangerousTopic("i want to die because my code does not compile")
    expect(r.triggered).toBe(true)
    expect(r.reason).toBe("self_harm_hint")
  })

  test("triggers on 'suicide' keyword (case-insensitive)", () => {
    const r = detectDangerousTopic("Is this about Suicide?")
    expect(r.triggered).toBe(true)
    expect(r.reason).toBe("self_harm_hint")
  })

  test("does NOT trigger on normal coding chat", () => {
    const r = detectDangerousTopic("Should I use a flex container or grid for this layout?")
    expect(r.triggered).toBe(false)
    expect(r.reason).toBeNull()
  })

  test("does NOT trigger on benign use of 'kill' (kill a process / game enemy)", () => {
    // We deliberately do not include "kill" alone in SELF_HARM_HINTS; kids code games.
    const r = detectDangerousTopic("The button should kill the timer when clicked.")
    expect(r.triggered).toBe(false)
  })

  test("handles empty / undefined text gracefully", () => {
    expect(detectDangerousTopic("").triggered).toBe(false)
    expect(detectDangerousTopic(undefined as any).triggered).toBe(false)
  })

  test("first match wins (helpline mention before self_harm scan)", () => {
    const text = "Kids Helpline on 1800 55 1800. (kid also said suicide somewhere earlier)"
    const r = detectDangerousTopic(text)
    expect(r.reason).toBe("helpline_mention")
  })
})

describe("buildHelplineOverlay", () => {
  test("English variant has 1800 55 1800 in the helpline line", () => {
    const o = buildHelplineOverlay("en")
    expect(o.helplineLine).toContain("1800 55 1800")
    expect(o.title.length).toBeGreaterThan(0)
    expect(o.body.length).toBeGreaterThan(0)
    expect(o.callToAction.length).toBeGreaterThan(0)
  })

  test("zh-Hans variant has 1800 55 1800 in the helpline line", () => {
    const o = buildHelplineOverlay("zh-Hans")
    expect(o.helplineLine).toContain("1800 55 1800")
    expect(o.title).toContain("暂停")
  })

  test("English and zh-Hans copy is different (translation actually exists)", () => {
    const en = buildHelplineOverlay("en")
    const zh = buildHelplineOverlay("zh-Hans")
    expect(en.title).not.toBe(zh.title)
    expect(en.body).not.toBe(zh.body)
  })
})
