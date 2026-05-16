import { describe, expect, test } from "bun:test"
import { statusText, resolveLocale } from "../src/status-text.ts"

describe("statusText", () => {
  test("returns English strings by default", () => {
    expect(statusText("thinking")).toContain("thinking")
    expect(statusText("ready")).toContain("Your turn")
  })

  test("returns zh-Hans strings when locale='zh-Hans'", () => {
    expect(statusText("thinking", "zh-Hans")).toContain("AI 老师")
    expect(statusText("ready", "zh-Hans")).toContain("到你了")
  })

  test("every status key has both en + zh-Hans variants", () => {
    const keys = [
      "thinking", "writing_file", "reading_file", "searching",
      "fetching_doc", "ready", "kid_input_waiting",
    ] as const
    for (const k of keys) {
      expect(statusText(k, "en")).toBeTruthy()
      expect(statusText(k, "zh-Hans")).toBeTruthy()
      // Different by design — if they're equal, translation is missing.
      expect(statusText(k, "en")).not.toBe(statusText(k, "zh-Hans"))
    }
  })

  test("unknown key returns the key itself as last-resort fallback", () => {
    // @ts-expect-error — intentional bad input
    expect(statusText("nonexistent_key")).toBe("nonexistent_key")
  })
})

describe("resolveLocale", () => {
  test("explicit KIDS_LOCALE wins over LANG", () => {
    expect(resolveLocale({ KIDS_LOCALE: "zh-Hans", LANG: "en_US.UTF-8" } as any)).toBe("zh-Hans")
    expect(resolveLocale({ KIDS_LOCALE: "en", LANG: "zh_CN.UTF-8" } as any)).toBe("en")
  })

  test("falls back to LANG when KIDS_LOCALE unset", () => {
    expect(resolveLocale({ LANG: "zh_CN.UTF-8" } as any)).toBe("zh-Hans")
    expect(resolveLocale({ LANG: "en_AU.UTF-8" } as any)).toBe("en")
    expect(resolveLocale({ LANG: "fr_FR.UTF-8" } as any)).toBe("en")
  })

  test("LC_ALL respected", () => {
    expect(resolveLocale({ LC_ALL: "zh_TW.UTF-8" } as any)).toBe("zh-Hans")
  })

  test("returns 'en' when nothing is set", () => {
    expect(resolveLocale({} as any)).toBe("en")
  })

  test("ignores garbage KIDS_LOCALE values", () => {
    expect(resolveLocale({ KIDS_LOCALE: "klingon" } as any)).toBe("en")
  })
})
