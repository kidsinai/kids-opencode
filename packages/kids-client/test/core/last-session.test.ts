import { describe, expect, test, afterEach } from "bun:test"
import { readLastSession, writeLastSession } from "../../src/core/last-session.ts"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const cfg = mkdtempSync(join(tmpdir(), "kc-last-"))

afterEach(() => {
  // Don't blow away between tests within a single file; cleanup at end.
})

describe("last-session persistence", () => {
  test("returns null when file missing", () => {
    expect(readLastSession(join(cfg, "nonexistent"))).toBeNull()
  })

  test("write then read round-trip", () => {
    const target = mkdtempSync(join(tmpdir(), "kc-last-rt-"))
    try {
      writeLastSession(target, {
        coursePack: "portfolio-site",
        mission: "mission-1",
        lastActiveAt: "2026-05-16T10:00:00.000Z",
        projectDir: "/home/kid/my-portfolio",
      })
      const read = readLastSession(target)
      expect(read).not.toBeNull()
      expect(read?.coursePack).toBe("portfolio-site")
      expect(read?.mission).toBe("mission-1")
      expect(read?.projectDir).toBe("/home/kid/my-portfolio")
    } finally {
      rmSync(target, { recursive: true, force: true })
    }
  })

  test("returns null on malformed JSON", () => {
    const target = mkdtempSync(join(tmpdir(), "kc-last-mal-"))
    try {
      // Write garbage directly
      const { writeFileSync, mkdirSync } = require("node:fs") as typeof import("node:fs")
      mkdirSync(target, { recursive: true })
      writeFileSync(join(target, "last-session.json"), "{not json", "utf8")
      expect(readLastSession(target)).toBeNull()
    } finally {
      rmSync(target, { recursive: true, force: true })
    }
  })
})
