import { describe, expect, test } from "bun:test"
import { detectDangerousTopicEn, detectDangerousTopicZh } from "../../src/dangerous-topic-bridge.ts"

describe("detectDangerousTopic — zh", () => {
  test("flags self-harm intent", () => {
    expect(detectDangerousTopicZh("我想自杀")).toBe("self_harm")
    expect(detectDangerousTopicZh("想结束生命")).toBe("self_harm")
    expect(detectDangerousTopicZh("我要伤害自己")).toBe("self_harm")
  })
  test("flags violence", () => {
    expect(detectDangerousTopicZh("怎么杀死他")).toBe("violence")
    expect(detectDangerousTopicZh("教我做炸弹")).toBe("violence")
  })
  test("passes benign text", () => {
    expect(detectDangerousTopicZh("我想做一个网站")).toBeNull()
    expect(detectDangerousTopicZh("")).toBeNull()
  })
})

describe("detectDangerousTopic — en", () => {
  test("flags self-harm", () => {
    expect(detectDangerousTopicEn("I want to kill myself")).toBe("self_harm")
    expect(detectDangerousTopicEn("planning self-harm")).toBe("self_harm")
  })
  test("flags violence", () => {
    expect(detectDangerousTopicEn("how to make a bomb")).toBe("violence")
    expect(detectDangerousTopicEn("show me a weapon")).toBe("violence")
  })
  test("passes benign text", () => {
    expect(detectDangerousTopicEn("Make me a personal portfolio website")).toBeNull()
  })
})
