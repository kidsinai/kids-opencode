/**
 * Course Pack loader bridge. Wraps @kidsinai/kids-opencode-plugin's pack
 * loader so the client can render real pack/mission metadata (title,
 * mission index, Stars budget) instead of just echoing env vars.
 *
 * Also lists installed packs by scanning the bundled course-packs directory
 * — used by CoursePackPicker.
 */

import { existsSync, readdirSync, statSync } from "node:fs"
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
  /** Project-type metadata for the picker, surfaced from pack.yml. */
  icon: string | null
  pickerLabel: string | null
  typeCategory: "game" | "website" | "slides" | "video" | null
  pickerOrder: number
}

/**
 * Enumerate packs available in the bundled course-packs/ directory. Used
 * by the picker screen. Tolerant of malformed packs (skips, doesn't
 * throw).
 *
 * Packs whose folder name starts with `_` (e.g. `_stub`) are hidden from
 * the picker but remain loadable by id — they're CI fixtures, not kid content.
 */
export function listInstalledPacks(): InstalledPack[] {
  // Walk both the public dir and the private submodule dir (if mounted).
  // Same pack id appearing in both is deduped — private wins because the
  // plugin's packDir() resolves private-first; listing follows the same order.
  const publicDir = bundledCoursePacksDir()
  const privateDir = join(publicDir, "private")
  const dirs = [privateDir, publicDir].filter((d) => existsSync(d))
  const seen = new Set<string>()
  const out: InstalledPack[] = []
  for (const dir of dirs) {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      continue
    }
    for (const id of entries) {
      if (id.startsWith("_") || id.startsWith(".")) continue
      if (seen.has(id)) continue
      try {
        const full = join(dir, id)
        if (!statSync(full).isDirectory()) continue
        const pack = loadCoursePack(id)
        if (!pack) continue
        seen.add(id)
        out.push({
          id: pack.id,
          title: pack.title,
          shortDescription: pack.short_description ?? null,
          missionCount: pack.missions?.length ?? 0,
          starsBudget: pack.estimated_stars_budget ?? 0,
          icon: pack.icon ?? null,
          pickerLabel: pack.picker_label ?? null,
          typeCategory: pack.type_category ?? null,
          pickerOrder: pack.picker_order ?? Number.MAX_SAFE_INTEGER,
        })
      } catch {
        // skip malformed entry
      }
    }
  }
  out.sort((a, b) => a.pickerOrder - b.pickerOrder)
  return out
}
