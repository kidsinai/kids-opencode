// Course Pack loader.
//
// Resolves a pack by ID against the bundled `course-packs/` directory
// (shipped with this npm package). Returns the system-prompt overlay,
// learning objectives, and mission metadata so the plugin can prepend
// them to the kid-safe system prompt.

import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parse as parseYaml } from "yaml"

export interface CoursePack {
  id: string
  version: string
  title: string
  short_description?: string
  target_age_band?: string
  estimated_duration_minutes?: number
  estimated_stars_budget?: number
  learning_objectives?: string[]
  prerequisites?: string[]
  missions: CoursePackMission[]
  system_prompt_overlay?: string
  teacher_notes?: string[]
}

export interface CoursePackMission {
  id: string
  title: string
  estimated_minutes?: number
  estimated_stars?: number
  file?: string
  acceptance?: string
}

/**
 * Resolve the bundled `course-packs/` directory relative to this source file.
 * Works in dev (running from `src/`) and post-publish (running from `dist/`).
 */
export function bundledCoursePacksDir(): string {
  // import.meta.url points at the .ts (dev) or .js (built); either way
  // the `course-packs/` directory is two levels up from this file.
  // - dev:    src/course-pack.ts → ../course-packs/
  // - built:  dist/course-pack.js → ../course-packs/
  const here = dirname(fileURLToPath(import.meta.url))
  return resolve(here, "..", "course-packs")
}

/**
 * Load a Course Pack by ID. Returns null if the pack does not exist.
 * Logs (does not throw) on parse error to avoid crashing kid sessions.
 */
export function loadCoursePack(packId: string): CoursePack | null {
  if (!packId) return null
  // Defence: refuse path-like IDs.
  if (packId.includes("/") || packId.includes("..") || packId.includes("\\")) {
    return null
  }

  const packYamlPath = join(bundledCoursePacksDir(), packId, "pack.yml")
  if (!existsSync(packYamlPath)) {
    return null
  }

  try {
    const raw = readFileSync(packYamlPath, "utf8")
    const parsed = parseYaml(raw) as CoursePack
    return parsed
  } catch (err) {
    process.stderr.write(
      `[kids-audit] {"event":"course_pack.load_error","pack":"${packId}","error":"${(err as Error).message}"}\n`,
    )
    return null
  }
}

/**
 * Get the mission within a pack, or null if missing.
 */
export function findMission(
  pack: CoursePack,
  missionId: string,
): CoursePackMission | null {
  return pack.missions?.find((m) => m.id === missionId) ?? null
}

/**
 * Build a stitched overlay block to prepend to the kid-safe system prompt.
 * Composes: pack.system_prompt_overlay + current Mission context block.
 *
 * Returns an empty string if the pack is null (free-play mode).
 */
export function buildOverlay(
  pack: CoursePack | null,
  missionId: string | undefined,
): string {
  if (!pack) return ""

  const parts: string[] = []
  if (pack.system_prompt_overlay) {
    parts.push(pack.system_prompt_overlay.trim())
  }

  if (missionId) {
    const m = findMission(pack, missionId)
    if (m) {
      parts.push(
        `\n## Active mission\n` +
          `- Mission ID: ${m.id}\n` +
          `- Title: ${m.title}\n` +
          (m.estimated_minutes ? `- Estimated time: ${m.estimated_minutes} min\n` : "") +
          (m.estimated_stars ? `- Estimated cost: ${m.estimated_stars}⭐\n` : ""),
      )
    }
  }

  return parts.join("\n\n").trim()
}
