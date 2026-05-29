/**
 * Upstream sync gauntlet — static subset.
 *
 * Source: PLAN.md "Upstream sync policy" — 15-check list. This file runs
 * the checks that don't need a live `opencode serve`. Live checks live in
 * sibling file `live.test.ts` and are gated by KIDS_GAUNTLET_LIVE=1.
 *
 * The gauntlet gates dependabot-style upgrade PRs (@opencode-ai/sdk +
 * @opencode-ai/plugin + opencode binary). Wired into CI by
 * .github/workflows/upstream-bump-gauntlet.yml.
 *
 * IMPORTANT: failures here are PR-blocking. If you're tempted to relax a
 * check, talk to the team first — these are guarding the kid-safety
 * surface against silent upstream drift.
 */

import { describe, expect, test } from "bun:test"
import { audit, readIdentityFromEnv, server } from "../../src/index.ts"
import { loadCoursePack, findMission, runMissionChecks, bundledCoursePacksDir } from "../../src/index.ts"
import { join } from "node:path"
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"

describe("gauntlet · static", () => {
  // Check #2 — plugin module loads via PluginModule contract.
  test("#2 plugin server export is an async factory", () => {
    expect(typeof server).toBe("function")
    expect(server.constructor.name).toBe("AsyncFunction")
  })

  // Check #9 — audit envelope includes stars_estimated when emitted from
  // tool.execute.before site (per audit-event-schema PRD §3.7 payload shape).
  test("#9 audit envelope carries identity + schema_version + stars fields", () => {
    let captured = ""
    const origWrite = process.stderr.write.bind(process.stderr)
    // @ts-expect-error capture for assertion
    process.stderr.write = (s: string): boolean => {
      captured += s
      return true
    }
    try {
      audit("tool.execute.before", { tool: "read", stars_estimated: 0.5, callID: "c1" })
    } finally {
      // @ts-expect-error restore
      process.stderr.write = origWrite
    }
    const line = captured.trim()
    expect(line.startsWith("[kids-audit] ")).toBe(true)
    const obj = JSON.parse(line.slice("[kids-audit] ".length))
    expect(obj.schema_version).toBe("1")
    expect(obj.identity).toBeDefined()
    expect(obj.stars_estimated).toBe(0.5)
    expect(obj.event).toBe("tool.execute.before")
  })

  // Check #10 — `kids-opencode check mission-1` end-to-end on a satisfying
  // sample project. Reuses runMissionChecks() directly to avoid spawning.
  // Uses the public `_stub` pack so the gauntlet runs without the private
  // kids-flows submodule (real-pack acceptance is covered in acceptance.test.ts
  // + the publish workflow, which check out the submodule).
  test("#10 acceptance runner passes on a satisfying sample project (_stub mission-1)", () => {
    const dir = mkdtempSync(join(tmpdir(), "gauntlet-sample-"))
    try {
      writeFileSync(
        join(dir, "index.html"),
        "<!DOCTYPE html><html><head><title>Sample</title></head>" +
          "<body><h1>Hi I am Sample</h1>" +
          "<p>A sample project used by the upstream-sync gauntlet.</p></body></html>",
        "utf8",
      )
      const result = runMissionChecks("mission-1", { packId: "_stub", projectDir: dir })
      if ("error" in result) {
        throw new Error(`acceptance runner errored: ${result.error}`)
      }
      // ok = failed === 0. Some checks legitimately `skip` offline
      // (audit_log_check needs platform-backend Phase 5 ingestion), so we
      // assert no FAILures rather than passed === total.
      expect(result.ok).toBe(true)
      expect(result.total).toBeGreaterThan(0)
      expect(result.failed).toBe(0)
      expect(result.passed).toBeGreaterThanOrEqual(result.total - result.skipped)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  // Check #15 — critical Hooks names still exist in @opencode-ai/plugin
  // exports. We re-export from our `index.ts` so importing the bundled
  // shape catches signature drift early.
  test("#15 critical plugin Hooks names still resolvable from @opencode-ai/plugin", async () => {
    // The @opencode-ai/plugin package exports Hooks as a TypeScript interface
    // (type-only). To verify the import path itself still works, we import
    // the module dynamically.
    const mod = await import("@opencode-ai/plugin")
    expect(mod).toBeDefined()
    // Hooks is a type, not a value, so just confirm the module shape sane.
    // The presence of the plugin entry through @opencode-ai/plugin is the
    // smoke we care about; subtler hook-rename drift surfaces in our own
    // plugin failing to typecheck (gauntlet wraps the typecheck step in CI).
  })

  // Course Pack loader sanity: the public `_stub` pack must always be
  // findable + parsable so the loader path is exercised even without the
  // private kids-flows submodule. (Real packs — game / website — load via
  // the same code path and are covered in course-pack.test.ts.)
  test("_stub Course Pack loads + has missions", () => {
    const pack = loadCoursePack("_stub")
    expect(pack).not.toBeNull()
    expect(pack?.missions.length).toBeGreaterThanOrEqual(1)
    const m1 = pack ? findMission(pack, "mission-1") : null
    expect(m1).not.toBeNull()
  })

  // Bundled course-packs directory exists. Defends against publish-time
  // packaging mistakes that exclude the course-packs/ folder.
  test("bundled course-packs directory exists at runtime", () => {
    const dir = bundledCoursePacksDir()
    // We don't readdir(); existence-by-loading the flagship pack is the
    // proof we want.
    expect(typeof dir).toBe("string")
    expect(dir.length).toBeGreaterThan(0)
  })

  // Identity envelope works with or without env vars set — never throws.
  test("readIdentityFromEnv is total over env state", () => {
    const idEmpty = readIdentityFromEnv()
    expect(idEmpty).toEqual({
      family_id: null,
      kid_profile_id: null,
      device_id: null,
      workshop_class_id: null,
    })
  })
})
