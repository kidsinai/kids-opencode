import { describe, expect, test } from "bun:test"
import { loadCoursePack, buildOverlay, findMission, type CoursePack } from "../src/course-pack"

// Course-pack curriculum content (website / game) lives in the private
// kids-flows submodule. In public CI (and fork PRs) that submodule isn't
// checked out, so content-specific tests are skipped there and run locally
// + in the publish workflow. Mechanism tests use the public `_stub` fixture.
const HAS_PRIVATE = loadCoursePack("website") !== null

describe("loadCoursePack", () => {
  test("loads the public _stub fixture pack", () => {
    const pack = loadCoursePack("_stub")
    expect(pack).not.toBeNull()
    expect(pack?.id).toBe("_stub")
    expect(pack?.missions.length).toBeGreaterThanOrEqual(1)
    expect(pack?.system_prompt_overlay).toBeDefined()
  })

  test.skipIf(!HAS_PRIVATE)("loads the website pack by its canonical id", () => {
    const pack = loadCoursePack("website")
    expect(pack).not.toBeNull()
    expect(pack?.id).toBe("website")
    expect(pack?.title).toBe("A website about you")
    expect(pack?.missions.length).toBe(3)
    expect(pack?.system_prompt_overlay).toBeDefined()
  })

  test.skipIf(!HAS_PRIVATE)("legacy 'portfolio-site' id aliases to the website pack", () => {
    const pack = loadCoursePack("portfolio-site")
    expect(pack).not.toBeNull()
    // Alias resolves to the renamed pack — id reflects the new canonical id.
    expect(pack?.id).toBe("website")
    expect(pack?.missions.length).toBe(3)
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
    const pack = loadCoursePack("_stub")!
    const m1 = findMission(pack, "mission-1")
    expect(m1).not.toBeNull()
    expect(m1?.title).toContain("Stub")
  })

  test("returns null for a missing mission", () => {
    const pack = loadCoursePack("_stub")!
    expect(findMission(pack, "mission-999")).toBeNull()
  })
})

describe("buildOverlay", () => {
  test("returns empty string when pack is null (free-play mode)", () => {
    expect(buildOverlay(null, undefined)).toBe("")
    expect(buildOverlay(null, "mission-1")).toBe("")
  })

  test("includes pack overlay when pack provided", () => {
    const pack = loadCoursePack("_stub")!
    const overlay = buildOverlay(pack, undefined)
    expect(overlay.toLowerCase()).toContain("stub")
    expect(overlay.length).toBeGreaterThan(50)
  })

  test("includes active mission block when missionId provided", () => {
    const pack = loadCoursePack("_stub")!
    const overlay = buildOverlay(pack, "mission-1")
    expect(overlay).toContain("Active mission")
    expect(overlay).toContain("mission-1")
    expect(overlay).toContain("Stub mission")
  })

  test("missing mission id silently omits the mission block (pack overlay still present)", () => {
    const pack = loadCoursePack("_stub")!
    const overlay = buildOverlay(pack, "mission-bogus")
    expect(overlay.toLowerCase()).toContain("stub")
    expect(overlay).not.toContain("Active mission")
  })

  test("guided_flow block surfaces one_sentence_prompt + vibe labels", () => {
    const pack: CoursePack = packWithGuidedFlow()
    const overlay = buildOverlay(pack, undefined)
    expect(overlay).toContain("Guided flow")
    expect(overlay).toContain("Tell me in one sentence")
    expect(overlay).toContain("Mono test")
    expect(overlay).toContain("test-mono")
  })

  test("guided_flow block surfaces the picked vibe palette + project name when supplied", () => {
    const pack: CoursePack = packWithGuidedFlow()
    const overlay = buildOverlay(pack, undefined, { vibeId: "test-mono", projectName: "Hello World" })
    expect(overlay).toContain('vibe "Mono test"')
    expect(overlay).toContain("#000")
    expect(overlay).toContain('"Hello World"')
  })

  test("scaffold catalog block lists every entry", () => {
    const pack: CoursePack = packWithGuidedFlow()
    const overlay = buildOverlay(pack, undefined, {
      scaffoldCatalog: [
        { skill_id: "hello", file_target: "index.html", required_vars: ["NAME"] },
      ],
    })
    expect(overlay).toContain("Available scaffolds")
    expect(overlay).toContain("hello")
    expect(overlay).toContain("index.html")
    expect(overlay).toContain("NAME")
  })

  test("pre-rendered scaffold block embeds the literal content the AI must propose", () => {
    const pack: CoursePack = packWithGuidedFlow()
    const overlay = buildOverlay(pack, undefined, {
      preRenderedScaffold: {
        skill_id: "hello",
        file_target: "index.html",
        content: "<h1>Hi</h1>",
      },
    })
    expect(overlay).toContain("First file to propose")
    expect(overlay).toContain("<h1>Hi</h1>")
    expect(overlay).toContain("index.html")
  })
})

describe("loadCoursePack alias resolution", () => {
  test.skipIf(!HAS_PRIVATE)("canonical id and alias resolve to the same pack", () => {
    const viaCanonical = loadCoursePack("website")
    const viaAlias = loadCoursePack("portfolio-site")
    expect(viaCanonical?.id).toBe("website")
    expect(viaAlias?.id).toBe("website")
    expect(viaAlias?.missions.length).toBe(viaCanonical?.missions.length)
  })
})

function packWithGuidedFlow(): CoursePack {
  return {
    id: "test-pack",
    version: "0.0.1",
    title: "Test pack",
    missions: [],
    guided_flow: {
      one_sentence_prompt: "Tell me in one sentence what you want to make.",
      vibes: [
        { id: "test-mono", label: "Mono test", palette: ["#000", "#fff", "#888"], font: "system-ui" },
      ],
      first_5_min_skill: "hello",
    },
  }
}
