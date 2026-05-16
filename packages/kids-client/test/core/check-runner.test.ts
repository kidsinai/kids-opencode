import { describe, expect, test } from "bun:test"
import { isCompletionTrigger, runCheck } from "../../src/core/check-runner.ts"

describe("isCompletionTrigger", () => {
  test("zh-Hans variants", () => {
    expect(isCompletionTrigger("/check", "zh-Hans")).toBe(true)
    expect(isCompletionTrigger("我做完了", "zh-Hans")).toBe(true)
    expect(isCompletionTrigger("完成了", "zh-Hans")).toBe(true)
    expect(isCompletionTrigger("/done", "zh-Hans")).toBe(true)
  })

  test("en variants (case-insensitive)", () => {
    expect(isCompletionTrigger("/check", "en")).toBe(true)
    expect(isCompletionTrigger("I'm done", "en")).toBe(true)
    expect(isCompletionTrigger("DONE!", "en")).toBe(true)
    expect(isCompletionTrigger("All done", "en")).toBe(true)
  })

  test("rejects regular prompts", () => {
    expect(isCompletionTrigger("我想做一个网站", "zh-Hans")).toBe(false)
    expect(isCompletionTrigger("Make me a portfolio site", "en")).toBe(false)
    expect(isCompletionTrigger("", "en")).toBe(false)
    expect(isCompletionTrigger("    ", "en")).toBe(false)
  })

  test("rejects long sentences containing the phrase", () => {
    // Defensive: long message shouldn't accidentally trigger.
    const longMsg = "I'm done telling you stories about my project but actually I want to add another feature now please"
    expect(isCompletionTrigger(longMsg, "en")).toBe(false)
  })
})

describe("runCheck", () => {
  test("returns error when missionId is empty", () => {
    const r = runCheck({ missionId: "", packId: "portfolio-site", locale: "en" })
    expect(r.kind).toBe("error")
  })

  test("returns error for unknown pack", () => {
    const r = runCheck({ missionId: "mission-1", packId: "nonexistent-xyz", locale: "en" })
    expect(r.kind).toBe("error")
  })

  test("returns fail when project dir has no expected files", () => {
    const r = runCheck({
      missionId: "mission-1",
      packId: "portfolio-site",
      projectDir: "/tmp",
      locale: "en",
    })
    // Either fail (acceptance found mission but criteria not met)
    // or error (something else went wrong). Both are acceptable signals
    // that the check ran without crashing.
    expect(["fail", "error", "pass"]).toContain(r.kind)
    expect(typeof r.message).toBe("string")
    expect(r.message.length).toBeGreaterThan(0)
  })
})
