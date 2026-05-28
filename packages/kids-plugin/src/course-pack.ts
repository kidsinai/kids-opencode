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
  /**
   * Project-type metadata for the kid-facing picker. All optional —
   * packs without these fall back to title/short_description rendering.
   */
  type_category?: "game" | "website" | "slides" | "video"
  icon?: string
  picker_label?: string
  picker_order?: number
  guided_flow?: GuidedFlow
}

export interface CoursePackMission {
  id: string
  title: string
  estimated_minutes?: number
  estimated_stars?: number
  file?: string
  acceptance?: string
}

export interface GuidedFlowVibe {
  id: string
  label: string
  palette: string[]
  font: string
}

export interface GuidedFlow {
  one_sentence_prompt: string
  vibes: GuidedFlowVibe[]
  first_5_min_skill?: string
}

/**
 * Pack id aliases. Used to keep legacy `--course portfolio-site` working
 * after the pack was renamed. Resolved inside loadCoursePack().
 */
const PACK_ID_ALIASES: Record<string, string> = {
  // The portfolio-site pack was renamed `website` in v0.2.0. Keep the legacy
  // id working so `--course portfolio-site` (docs, installers, old links) still
  // resolves. Deprecated; remove after V1.
  "portfolio-site": "website",
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
 * Subdirectory of bundledCoursePacksDir() reserved for the private
 * `kids-flows` git submodule (curriculum IP). When the submodule isn't
 * mounted (open-source contributors, fresh clone without
 * `submodule update --init`), this dir simply won't exist and callers
 * fall back to the public-pack search path.
 */
export function privateCoursePacksDir(): string {
  return join(bundledCoursePacksDir(), "private")
}

/**
 * Resolve a pack id to the on-disk directory that contains its pack.yml.
 * Tries the private submodule first, falls back to the public dir.
 * Returns null if the pack isn't installed in either location.
 */
function resolvePackDir(packId: string): string | null {
  const candidates = [
    join(privateCoursePacksDir(), packId),
    join(bundledCoursePacksDir(), packId),
  ]
  for (const c of candidates) {
    if (existsSync(join(c, "pack.yml"))) return c
  }
  return null
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

  const resolved = PACK_ID_ALIASES[packId] ?? packId
  const dir = resolvePackDir(resolved)
  if (!dir) return null

  const packYamlPath = join(dir, "pack.yml")
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
 * Resolve the on-disk directory for a pack id (private-first, public fallback).
 * Used by callers that need to walk the pack's filesystem layout (e.g. skills
 * walking `scaffolds/`). Returns null if the pack isn't installed.
 *
 * Exported for the skill renderer; not part of the public API contract.
 */
export function packDir(packId: string): string | null {
  if (!packId) return null
  if (packId.includes("/") || packId.includes("..") || packId.includes("\\")) {
    return null
  }
  const resolved = PACK_ID_ALIASES[packId] ?? packId
  return resolvePackDir(resolved)
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
  options?: BuildOverlayOptions,
): string {
  if (!pack) return ""

  const parts: string[] = []
  if (pack.system_prompt_overlay) {
    parts.push(pack.system_prompt_overlay.trim())
  }

  if (pack.guided_flow) {
    parts.push(buildGuidedFlowBlock(pack.guided_flow, options))
  }

  if (options?.scaffoldCatalog && options.scaffoldCatalog.length > 0) {
    parts.push(buildScaffoldCatalogBlock(options.scaffoldCatalog))
  }

  if (options?.preRenderedScaffold) {
    parts.push(buildPreRenderedScaffoldBlock(options.preRenderedScaffold))
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

export interface ScaffoldCatalogEntry {
  skill_id: string
  file_target: string
  required_vars: string[]
}

export interface PreRenderedScaffold {
  skill_id: string
  file_target: string
  content: string
}

export interface BuildOverlayOptions {
  /** The vibe the kid picked (or default). Surfaced in the guided-flow block. */
  vibeId?: string
  /** The kid's project name. Surfaced in the guided-flow block. */
  projectName?: string
  /** Available scaffolds for this pack — listed so the AI knows which exist. */
  scaffoldCatalog?: ScaffoldCatalogEntry[]
  /** Pre-rendered first-5-min scaffold the AI must propose verbatim (after kid approval). */
  preRenderedScaffold?: PreRenderedScaffold
}

function buildGuidedFlowBlock(flow: GuidedFlow, options: BuildOverlayOptions | undefined): string {
  const lines: string[] = ["## Guided flow"]
  lines.push(`- Ask the kid first: ${flow.one_sentence_prompt}`)
  if (flow.vibes.length > 0) {
    const labels = flow.vibes.map((v) => `"${v.label}" (id: ${v.id})`).join(", ")
    lines.push(`- Available vibes: ${labels}.`)
    lines.push(`- A vibe is a named bundle of palette + font. When the kid picks one, apply the whole bundle — don't ask them to pick colours separately.`)
  }
  if (options?.vibeId) {
    const picked = flow.vibes.find((v) => v.id === options.vibeId)
    if (picked) {
      lines.push(
        `- The kid has picked vibe "${picked.label}" (${picked.id}). ` +
          `Palette: ${picked.palette.join(", ")}. Font: ${picked.font}.`,
      )
    }
  }
  if (options?.projectName) {
    lines.push(`- The kid named the project "${options.projectName}". Use this name in the title / heading / character label.`)
  }
  return lines.join("\n")
}

function buildScaffoldCatalogBlock(entries: ScaffoldCatalogEntry[]): string {
  const lines: string[] = ["## Available scaffolds"]
  lines.push(
    "When you propose the first file for the kid to approve, prefer matching the scaffold below " +
      "(substituting the listed variables). The scaffold is the curriculum-vetted starting point — " +
      "the kid sees something on screen faster this way.",
  )
  for (const entry of entries) {
    lines.push(
      `- ${entry.skill_id} → writes ${entry.file_target}. Required variables: ` +
        (entry.required_vars.length ? entry.required_vars.join(", ") : "(none)"),
    )
  }
  return lines.join("\n")
}

function buildPreRenderedScaffoldBlock(rendered: PreRenderedScaffold): string {
  return (
    `## First file to propose\n` +
    `When the kid approves Mission 1's first step, propose writing the following exact content to \`${rendered.file_target}\` ` +
    `(this is the rendered "${rendered.skill_id}" scaffold with the kid's vibe + project name already applied):\n\n` +
    "```\n" +
    rendered.content +
    "\n```"
  )
}
