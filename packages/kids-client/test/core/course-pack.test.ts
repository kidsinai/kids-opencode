import { describe, expect, test } from "bun:test"
import { listInstalledPacks, resolveContext } from "../../src/core/course-pack.ts"

describe("listInstalledPacks", () => {
  test("includes the bundled portfolio-site pack", () => {
    const packs = listInstalledPacks()
    const portfolio = packs.find((p) => p.id === "portfolio-site")
    expect(portfolio).toBeDefined()
    expect(portfolio?.missionCount).toBeGreaterThan(0)
    expect(portfolio?.title.length).toBeGreaterThan(0)
  })
})

describe("resolveContext", () => {
  test("returns null when packId is null (free-play)", () => {
    expect(resolveContext(null, null)).toBeNull()
  })

  test("returns null for unknown pack", () => {
    expect(resolveContext("nonexistent-pack-xyz", null)).toBeNull()
  })

  test("resolves portfolio-site with mission-1 to index 1", () => {
    const ctx = resolveContext("portfolio-site", "mission-1")
    expect(ctx).not.toBeNull()
    expect(ctx?.packTitle.length).toBeGreaterThan(0)
    expect(ctx?.missionIndex).toBe(1)
    expect(ctx?.missionTotal).toBeGreaterThanOrEqual(1)
    expect(ctx?.missionTitle).not.toBeNull()
  })

  test("returns null mission/title when missionId not provided", () => {
    const ctx = resolveContext("portfolio-site", null)
    expect(ctx).not.toBeNull()
    expect(ctx?.missionIndex).toBeNull()
    expect(ctx?.missionTitle).toBeNull()
  })
})
