import { describe, expect, test } from "bun:test"
import { loadCoursePack, buildOverlay, findMission } from "../src/course-pack"

describe("loadCoursePack", () => {
  test("loads the bundled portfolio-site pack", () => {
    const pack = loadCoursePack("portfolio-site")
    expect(pack).not.toBeNull()
    expect(pack?.id).toBe("portfolio-site")
    expect(pack?.title).toBe("My personal portfolio website")
    expect(pack?.missions.length).toBe(3)
    expect(pack?.system_prompt_overlay).toBeDefined()
  })

  test("returns null for a non-existent pack", () => {
    expect(loadCoursePack("does-not-exist")).toBeNull()
  })

  test("returns null for the empty string (defensive)", () => {
    expect(loadCoursePack("")).toBeNull()
  })

  test("refuses path-traversal IDs", () => {
    expect(loadCoursePack("../etc/passwd")).toBeNull()
    expect(loadCoursePack("../../foo")).toBeNull()
    expect(loadCoursePack("portfolio-site/../portfolio-site")).toBeNull()
    expect(loadCoursePack("/absolute/path")).toBeNull()
  })
})

describe("findMission", () => {
  test("finds an existing mission by ID", () => {
    const pack = loadCoursePack("portfolio-site")!
    const m1 = findMission(pack, "mission-1")
    expect(m1).not.toBeNull()
    expect(m1?.title).toContain("Project setup")
  })

  test("returns null for a missing mission", () => {
    const pack = loadCoursePack("portfolio-site")!
    expect(findMission(pack, "mission-999")).toBeNull()
  })
})

describe("buildOverlay", () => {
  test("returns empty string when pack is null (free-play mode)", () => {
    expect(buildOverlay(null, undefined)).toBe("")
    expect(buildOverlay(null, "mission-1")).toBe("")
  })

  test("includes pack overlay when pack provided", () => {
    const pack = loadCoursePack("portfolio-site")!
    const overlay = buildOverlay(pack, undefined)
    expect(overlay).toContain("portfolio website")
    expect(overlay.length).toBeGreaterThan(50)
  })

  test("includes active mission block when missionId provided", () => {
    const pack = loadCoursePack("portfolio-site")!
    const overlay = buildOverlay(pack, "mission-1")
    expect(overlay).toContain("Active mission")
    expect(overlay).toContain("mission-1")
    expect(overlay).toContain("Project setup")
  })

  test("missing mission id silently omits the mission block (pack overlay still present)", () => {
    const pack = loadCoursePack("portfolio-site")!
    const overlay = buildOverlay(pack, "mission-bogus")
    expect(overlay).toContain("portfolio website")
    expect(overlay).not.toContain("Active mission")
  })
})
