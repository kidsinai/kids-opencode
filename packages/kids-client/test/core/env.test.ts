import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { readEnv, validateEnv } from "../../src/core/env.ts"

const ORIGINAL = process.env

describe("readEnv", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL }
  })
  afterEach(() => {
    process.env = ORIGINAL
  })

  test("derives locale=zh-Hans from KIDS_LOCALE", () => {
    process.env.KIDS_LOCALE = "zh-Hans"
    expect(readEnv().locale).toBe("zh-Hans")
  })

  test("derives locale=zh-Hans from LANG", () => {
    delete process.env.KIDS_LOCALE
    process.env.LANG = "zh_CN.UTF-8"
    expect(readEnv().locale).toBe("zh-Hans")
  })

  test("defaults locale to en", () => {
    delete process.env.KIDS_LOCALE
    delete process.env.LANG
    expect(readEnv().locale).toBe("en")
  })

  test("propagates KIDS_COURSE_PACK / KIDS_MISSION", () => {
    process.env.KIDS_COURSE_PACK = "portfolio-site"
    process.env.KIDS_MISSION = "mission-1"
    const env = readEnv()
    expect(env.coursePack).toBe("portfolio-site")
    expect(env.mission).toBe("mission-1")
  })

  test("bypassGateway only true on exact '1'", () => {
    process.env.KIDS_LLM_BYPASS_GATEWAY = "true"
    expect(readEnv().bypassGateway).toBe(false)
    process.env.KIDS_LLM_BYPASS_GATEWAY = "1"
    expect(readEnv().bypassGateway).toBe(true)
  })
})

describe("validateEnv", () => {
  test("rejects missing server password", () => {
    const result = validateEnv({
      opencodeBaseUrl: "http://127.0.0.1:4096",
      opencodeServerPassword: "",
      deeprouterApiKey: "key",
      bypassGateway: false,
      coursePack: null,
      mission: null,
      locale: "en",
      opencodeBin: "opencode",
      configDir: "/tmp/cfg",
      noBanner: false,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.variant).toBe("config_missing")
  })

  test("rejects missing API key unless bypassed", () => {
    const result = validateEnv({
      opencodeBaseUrl: "http://127.0.0.1:4096",
      opencodeServerPassword: "pw",
      deeprouterApiKey: "",
      bypassGateway: false,
      coursePack: null,
      mission: null,
      locale: "en",
      opencodeBin: "opencode",
      configDir: "/tmp/cfg",
      noBanner: false,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.variant).toBe("needs_setup")
  })

  test("accepts BYOK bypass with no API key", () => {
    const result = validateEnv({
      opencodeBaseUrl: "http://127.0.0.1:4096",
      opencodeServerPassword: "pw",
      deeprouterApiKey: "",
      bypassGateway: true,
      coursePack: null,
      mission: null,
      locale: "en",
      opencodeBin: "opencode",
      configDir: "/tmp/cfg",
      noBanner: false,
    })
    expect(result.ok).toBe(true)
  })
})
