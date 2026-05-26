import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  DEFAULT_PORTAL_BASE_URL,
  buildWalletUrl,
  getOrCreateDeviceId,
} from "../../src/core/wallet-link.ts"

describe("buildWalletUrl", () => {
  test("uses DEFAULT_PORTAL_BASE_URL when none provided", () => {
    const url = buildWalletUrl({ deviceId: "abc-123" })
    expect(url.startsWith(DEFAULT_PORTAL_BASE_URL + "/portal/wallet")).toBe(true)
  })

  test("includes from=cli + device id as query params", () => {
    const url = buildWalletUrl({ deviceId: "device-xyz" })
    const parsed = new URL(url)
    expect(parsed.searchParams.get("from")).toBe("cli")
    expect(parsed.searchParams.get("device")).toBe("device-xyz")
  })

  test("includes locale=lang when supplied", () => {
    const url = buildWalletUrl({ deviceId: "d", locale: "zh-Hans" })
    expect(new URL(url).searchParams.get("lang")).toBe("zh-Hans")
  })

  test("strips trailing slash on portalBaseUrl", () => {
    const url = buildWalletUrl({ portalBaseUrl: "https://staging.example.com/", deviceId: "d" })
    expect(url.startsWith("https://staging.example.com/portal/wallet?")).toBe(true)
  })

  test("respects custom portalBaseUrl", () => {
    const url = buildWalletUrl({ portalBaseUrl: "https://staging.airbotix.ai", deviceId: "d" })
    expect(new URL(url).host).toBe("staging.airbotix.ai")
  })
})

describe("getOrCreateDeviceId", () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "kids-wallet-link-"))
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  test("creates a stable UUID file on first call", () => {
    const id1 = getOrCreateDeviceId(dir)
    expect(id1).toMatch(/^[0-9a-f-]{36}$/)
    expect(existsSync(join(dir, "device-id"))).toBe(true)
  })

  test("returns the same id across calls", () => {
    const id1 = getOrCreateDeviceId(dir)
    const id2 = getOrCreateDeviceId(dir)
    expect(id1).toBe(id2)
  })

  test("trims whitespace from existing file", () => {
    writeFileSync(join(dir, "device-id"), "  fixed-id\n  ")
    expect(getOrCreateDeviceId(dir)).toBe("fixed-id")
  })

  test("regenerates when file is empty/whitespace only", () => {
    writeFileSync(join(dir, "device-id"), "   \n")
    const id = getOrCreateDeviceId(dir)
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(readFileSync(join(dir, "device-id"), "utf8").trim()).toBe(id)
  })
})
