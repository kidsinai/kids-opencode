/**
 * Course Pack loader bridge. Wraps @kidsinai/kids-opencode-plugin's pack
 * loader so the client can render real pack/mission metadata (title,
 * mission index, Stars budget) instead of just echoing env vars.
 *
 * Also lists installed packs by scanning the bundled course-packs directory
 * — used by CoursePackPicker.
 */

import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import {
  bundledCoursePacksDir,
  findMission,
  loadCoursePack,
  type CoursePack,
  type CoursePackMission,
} from "@kidsinai/kids-opencode-plugin"

export interface ResolvedMissionContext {
  pack: CoursePack
  packTitle: string
  mission: CoursePackMission | null
  missionTitle: string | null
  /** 1-based index of the current mission within pack.missions. null if free-play. */
  missionIndex: number | null
  missionTotal: number
  starsBudget: number
}

export function resolveContext(packId: string | null, missionId: string | null): ResolvedMissionContext | null {
  if (!packId) return null
  const pack = loadCoursePack(packId)
  if (!pack) return null
  const missions = pack.missions ?? []
  const mission = missionId ? findMission(pack, missionId) : null
  const missionIndex = mission ? missions.findIndex((m) => m.id === mission.id) + 1 : null
  return {
    pack,
    packTitle: pack.title,
    mission,
    missionTitle: mission?.title ?? null,
    missionIndex: missionIndex && missionIndex > 0 ? missionIndex : null,
    missionTotal: missions.length,
    starsBudget: pack.estimated_stars_budget ?? 0,
  }
}

export interface InstalledPack {
  id: string
  title: string
  shortDescription: string | null
  missionCount: number
  starsBudget: number
}

/**
 * Enumerate packs available in the bundled course-packs/ directory. Used
 * by the picker screen. Tolerant of malformed packs (skips, doesn't
 * throw).
 */
export function listInstalledPacks(): InstalledPack[] {
  const dir = bundledCoursePacksDir()
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  const out: InstalledPack[] = []
  for (const id of entries) {
    try {
      const full = join(dir, id)
      if (!statSync(full).isDirectory()) continue
      const pack = loadCoursePack(id)
      if (!pack) continue
      out.push({
        id: pack.id,
        title: pack.title,
        shortDescription: pack.short_description ?? null,
        missionCount: pack.missions?.length ?? 0,
        starsBudget: pack.estimated_stars_budget ?? 0,
      })
    } catch {
      // skip malformed entry
    }
  }
  return out
}
