import { describe, expect, test } from "bun:test"
import { listInstalledPacks, resolveContext } from "../../src/core/course-pack.ts"

describe("listInstalledPacks", () => {
  test("includes the bundled website pack", () => {
    const packs = listInstalledPacks()
    const website = packs.find((p) => p.id === "website")
    expect(website).toBeDefined()
    expect(website?.missionCount).toBeGreaterThan(0)
    expect(website?.title.length).toBeGreaterThan(0)
  })

  test("surfaces icon / pickerLabel / typeCategory / pickerOrder from pack.yml", () => {
    const packs = listInstalledPacks()
    const website = packs.find((p) => p.id === "website")
    expect(website).toBeDefined()
    expect(website?.icon).toBe("🌐")
    expect(website?.pickerLabel).toBe("A website about you")
    expect(website?.typeCategory).toBe("website")
    expect(website?.pickerOrder).toBe(1)
  })

  test("hides directories starting with underscore (CI fixtures)", () => {
    // _stub doesn't exist yet at X.1a time; this test exercises the guard.
    const packs = listInstalledPacks()
    for (const p of packs) {
      expect(p.id.startsWith("_")).toBe(false)
    }
  })

  test("results are sorted by pickerOrder ascending", () => {
    const packs = listInstalledPacks()
    for (let i = 1; i < packs.length; i++) {
      expect(packs[i]!.pickerOrder).toBeGreaterThanOrEqual(packs[i - 1]!.pickerOrder)
    }
  })
})

describe("resolveContext", () => {
  test("returns null when packId is null (free-play)", () => {
    expect(resolveContext(null, null)).toBeNull()
  })

  test("returns null for unknown pack", () => {
    expect(resolveContext("nonexistent-pack-xyz", null)).toBeNull()
  })

  test("resolves website with mission-1 to index 1", () => {
    const ctx = resolveContext("website", "mission-1")
    expect(ctx).not.toBeNull()
    expect(ctx?.packTitle.length).toBeGreaterThan(0)
    expect(ctx?.missionIndex).toBe(1)
    expect(ctx?.missionTotal).toBeGreaterThanOrEqual(1)
    expect(ctx?.missionTitle).not.toBeNull()
  })

  test("legacy portfolio-site id still resolves via alias", () => {
    const ctx = resolveContext("portfolio-site", "mission-1")
    expect(ctx).not.toBeNull()
    expect(ctx?.missionIndex).toBe(1)
  })

  test("returns null mission/title when missionId not provided", () => {
    const ctx = resolveContext("website", null)
    expect(ctx).not.toBeNull()
    expect(ctx?.missionIndex).toBeNull()
    expect(ctx?.missionTitle).toBeNull()
  })
})
