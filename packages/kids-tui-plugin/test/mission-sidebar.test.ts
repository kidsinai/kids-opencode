import { describe, expect, test, afterEach } from "bun:test"
import { buildMissionSidebarLine, readMissionContextFromEnv } from "../src/mission-sidebar.ts"

describe("buildMissionSidebarLine", () => {
  test("invisible when no Course Pack is active", () => {
    const line = buildMissionSidebarLine({})
    expect(line.visible).toBe(false)
    expect(line.text).toBe("")
  })

  test("flags unknown pack with a warning glyph but stays visible", () => {
    const line = buildMissionSidebarLine({ packId: "no-such-pack" })
    expect(line.visible).toBe(true)
    expect(line.text).toContain("unknown pack")
  })

  test("legacy portfolio-site id (aliased to website) without mission shows pack title fallback", () => {
    const line = buildMissionSidebarLine({ packId: "portfolio-site" })
    expect(line.visible).toBe(true)
    // portfolio-site aliases to the renamed `website` pack (title "A website about you").
    expect(line.text.toLowerCase()).toContain("website")
  })

  test("portfolio-site with a known mission shows N/M format", () => {
    const line = buildMissionSidebarLine({ packId: "portfolio-site", missionId: "mission-2" })
    expect(line.visible).toBe(true)
    expect(line.text).toContain("Mission 2/3")
  })

  test("includes Stars usage when starsConsumed provided", () => {
    const line = buildMissionSidebarLine({
      packId: "portfolio-site",
      missionId: "mission-1",
      starsConsumed: 12,
    })
    expect(line.text).toContain("Mission 1/3")
    expect(line.text).toContain("12/40")
  })

  test("falls back to 'budget X' when starsConsumed missing", () => {
    const line = buildMissionSidebarLine({
      packId: "portfolio-site",
      missionId: "mission-1",
    })
    expect(line.text).toContain("budget 40")
  })

  test("rounds fractional starsConsumed", () => {
    const line = buildMissionSidebarLine({
      packId: "portfolio-site",
      missionId: "mission-1",
      starsConsumed: 7.6,
    })
    expect(line.text).toContain("8/40")
  })
})

describe("readMissionContextFromEnv", () => {
  const originalEnv = { ...process.env }
  afterEach(() => {
    process.env.KIDS_COURSE_PACK = originalEnv.KIDS_COURSE_PACK
    process.env.KIDS_MISSION = originalEnv.KIDS_MISSION
    process.env.KIDS_STARS_CONSUMED = originalEnv.KIDS_STARS_CONSUMED
  })

  test("returns empty when env unset", () => {
    delete process.env.KIDS_COURSE_PACK
    delete process.env.KIDS_MISSION
    delete process.env.KIDS_STARS_CONSUMED
    const ctx = readMissionContextFromEnv()
    expect(ctx.packId).toBeUndefined()
    expect(ctx.missionId).toBeUndefined()
    expect(ctx.starsConsumed).toBeUndefined()
  })

  test("parses KIDS_STARS_CONSUMED as a number, ignores junk", () => {
    process.env.KIDS_COURSE_PACK = "portfolio-site"
    process.env.KIDS_STARS_CONSUMED = "15.5"
    expect(readMissionContextFromEnv().starsConsumed).toBe(15.5)

    process.env.KIDS_STARS_CONSUMED = "not-a-number"
    expect(readMissionContextFromEnv().starsConsumed).toBeUndefined()

    process.env.KIDS_STARS_CONSUMED = "-3"
    expect(readMissionContextFromEnv().starsConsumed).toBeUndefined()
  })
})
