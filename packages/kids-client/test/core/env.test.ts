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

  test("opencodeServerUsername defaults to 'opencode' to match upstream", () => {
    delete process.env.OPENCODE_SERVER_USERNAME
    expect(readEnv().opencodeServerUsername).toBe("opencode")
  })

  test("opencodeServerUsername honors OPENCODE_SERVER_USERNAME override", () => {
    process.env.OPENCODE_SERVER_USERNAME = "kids"
    expect(readEnv().opencodeServerUsername).toBe("kids")
  })

  test("portalBaseUrl defaults to https://app.airbotix.ai", () => {
    delete process.env.AIRBOTIX_PORTAL_URL
    expect(readEnv().portalBaseUrl).toBe("https://app.airbotix.ai")
  })

  test("portalBaseUrl honors AIRBOTIX_PORTAL_URL override", () => {
    process.env.AIRBOTIX_PORTAL_URL = "https://staging.airbotix.ai"
    expect(readEnv().portalBaseUrl).toBe("https://staging.airbotix.ai")
  })
})

describe("validateEnv", () => {
  test("rejects missing server password", () => {
    const result = validateEnv({
      opencodeBaseUrl: "http://127.0.0.1:4096",
      opencodeServerPassword: "",
      opencodeServerUsername: "opencode",
      deeprouterApiKey: "key",
      bypassGateway: false,
      coursePack: null,
      mission: null,
      locale: "en",
      opencodeBin: "opencode",
      configDir: "/tmp/cfg",
      noBanner: false,
      portalBaseUrl: "https://app.airbotix.ai",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.variant).toBe("config_missing")
  })

  test("rejects missing API key unless bypassed", () => {
    const result = validateEnv({
      opencodeBaseUrl: "http://127.0.0.1:4096",
      opencodeServerPassword: "pw",
      opencodeServerUsername: "opencode",
      deeprouterApiKey: "",
      bypassGateway: false,
      coursePack: null,
      mission: null,
      locale: "en",
      opencodeBin: "opencode",
      configDir: "/tmp/cfg",
      noBanner: false,
      portalBaseUrl: "https://app.airbotix.ai",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.variant).toBe("needs_setup")
  })

  test("accepts BYOK bypass with no API key", () => {
    const result = validateEnv({
      opencodeBaseUrl: "http://127.0.0.1:4096",
      opencodeServerPassword: "pw",
      opencodeServerUsername: "opencode",
      deeprouterApiKey: "",
      bypassGateway: true,
      coursePack: null,
      mission: null,
      locale: "en",
      opencodeBin: "opencode",
      configDir: "/tmp/cfg",
      noBanner: false,
      portalBaseUrl: "https://app.airbotix.ai",
    })
    expect(result.ok).toBe(true)
  })
})
