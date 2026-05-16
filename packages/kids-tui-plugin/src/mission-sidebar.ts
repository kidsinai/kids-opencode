// Mission progress sidebar string builder.
//
// Loads the bundled Course Pack from @kidsinai/kids-opencode-plugin (the
// server-side sibling package ships course-packs/ in its npm files) and
// formats a one-line string for the sidebar slot:
//
//   "Mission 2/3 · ⭐ 18/40"
//
// Pure function so we can unit-test the format logic without spinning up
// a TUI host. The actual slot rendering happens in the host's @opentui
// runtime; this module just produces the string.

import { loadCoursePack, findMission, type CoursePack } from "@kidsinai/kids-opencode-plugin"

export interface MissionSidebarContext {
  /** From process.env.KIDS_COURSE_PACK */
  packId?: string
  /** From process.env.KIDS_MISSION */
  missionId?: string
  /** Running tally of stars consumed this session (optional; if not provided, hide the budget line) */
  starsConsumed?: number
}

export interface MissionSidebarLine {
  text: string
  /** Visible if there's actually a mission context. The slot host should hide the slot when false. */
  visible: boolean
}

/**
 * Build the one-line sidebar string. Returns visible=false if no Course
 * Pack is active (e.g. free-play mode) so the slot host can hide the slot.
 */
export function buildMissionSidebarLine(ctx: MissionSidebarContext): MissionSidebarLine {
  if (!ctx.packId) {
    return { text: "", visible: false }
  }

  const pack = loadCoursePack(ctx.packId)
  if (!pack) {
    return { text: `Mission ⚠ unknown pack: ${ctx.packId}`, visible: true }
  }

  const total = pack.missions.length
  const missionIdx = findMissionIndex(pack, ctx.missionId)
  const missionPart =
    missionIdx >= 0
      ? `Mission ${missionIdx + 1}/${total}`
      : `Pack: ${pack.title} (no active mission)`

  const budget = pack.estimated_stars_budget
  const starsPart =
    ctx.starsConsumed !== undefined && budget !== undefined
      ? ` · ⭐ ${Math.round(ctx.starsConsumed)}/${budget}`
      : budget !== undefined
        ? ` · ⭐ budget ${budget}`
        : ""

  return { text: missionPart + starsPart, visible: true }
}

function findMissionIndex(pack: CoursePack, missionId: string | undefined): number {
  if (!missionId) return -1
  return pack.missions.findIndex((m) => m.id === missionId)
}

/**
 * Read the Course Pack context from process.env. Plugin re-reads on every
 * sidebar render so a kid switching missions mid-session is reflected
 * immediately without restart.
 */
export function readMissionContextFromEnv(): MissionSidebarContext {
  return {
    packId: process.env.KIDS_COURSE_PACK,
    missionId: process.env.KIDS_MISSION,
    starsConsumed: parseStars(process.env.KIDS_STARS_CONSUMED),
  }
}

function parseStars(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}
