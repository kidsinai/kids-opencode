// Skill renderer.
//
// A "skill" in V0 is a file template shipped inside a course pack at
// `course-packs/<id>/scaffolds/<skillId>.html.template`. The template body
// may reference `${VAR}` placeholders that the renderer substitutes from
// runtime context (vibe palette, project name, etc.).
//
// The renderer is plugin-side — the AI never invokes it directly. Instead,
// the plugin pre-renders the first-5-min scaffold at session start and
// injects the *rendered text* into the system prompt overlay (see
// course-pack.ts buildOverlay → preRenderedScaffold). The AI then proposes
// that exact content via the existing `write` tool, with the existing
// kid-approval prompt.
//
// This means the tool whitelist at index.ts:39-46 stays unchanged. The
// scaffolder mechanism never expands the safety surface.

import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
  packDir,
  type CoursePack,
  type ScaffoldCatalogEntry,
} from "./course-pack.js"

const PLACEHOLDER_RE = /\$\{([A-Z][A-Z0-9_]*)\}/g

/**
 * Map of file_target hints by skill_id. Tolerant — falls back to "index.html"
 * for unknown skills, since V0 packs all target a single file.
 */
const DEFAULT_FILE_TARGET = "index.html"

/**
 * Resolve a scaffold directory for a pack, returning null if not present.
 * Honors the same private-first / public-fallback lookup that loadCoursePack
 * uses, via packDir() in course-pack.ts.
 */
function scaffoldsDir(packId: string): string | null {
  const dir = packDir(packId)
  if (!dir) return null
  const scaffolds = join(dir, "scaffolds")
  return existsSync(scaffolds) ? scaffolds : null
}

function templatePath(packId: string, skillId: string): string | null {
  if (!skillId) return null
  if (skillId.includes("/") || skillId.includes("..") || skillId.includes("\\")) {
    return null
  }
  const dir = scaffoldsDir(packId)
  if (!dir) return null
  const file = join(dir, `${skillId}.html.template`)
  return existsSync(file) ? file : null
}

/**
 * Extract every distinct `${VAR}` token used in a template body.
 */
function discoverVarsInTemplate(body: string): string[] {
  const found = new Set<string>()
  for (const match of body.matchAll(PLACEHOLDER_RE)) {
    found.add(match[1]!)
  }
  return [...found]
}

/**
 * Render a scaffold template by substituting `${VAR}` placeholders. Throws
 * if a required variable is missing — surface fast so the caller (plugin
 * init) can decide whether to fall back to no scaffold injection.
 */
export function renderScaffold(packId: string, skillId: string, vars: Record<string, string>): string {
  const file = templatePath(packId, skillId)
  if (!file) {
    throw new Error(`kids-opencode: scaffold "${skillId}" not found in pack "${packId}"`)
  }
  const body = readFileSync(file, "utf8")
  const required = discoverVarsInTemplate(body)
  const missing = required.filter((v) => vars[v] == null)
  if (missing.length > 0) {
    throw new Error(
      `kids-opencode: scaffold "${skillId}" missing required variables: ${missing.join(", ")}`,
    )
  }
  return body.replace(PLACEHOLDER_RE, (_, name) => vars[name] ?? "")
}

/**
 * Enumerate the scaffolds shipped with a pack, exposing their required
 * variables so buildOverlay() can surface them to the AI as a catalogue.
 *
 * Returns an empty array if the pack has no `scaffolds/` directory.
 */
export function listScaffoldsForPack(pack: CoursePack): ScaffoldCatalogEntry[] {
  const dir = scaffoldsDir(pack.id)
  if (!dir) return []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  const out: ScaffoldCatalogEntry[] = []
  for (const filename of entries) {
    if (!filename.endsWith(".html.template")) continue
    const skill_id = filename.slice(0, -".html.template".length)
    try {
      const body = readFileSync(join(dir, filename), "utf8")
      out.push({
        skill_id,
        file_target: DEFAULT_FILE_TARGET,
        required_vars: discoverVarsInTemplate(body),
      })
    } catch {
      // skip unreadable template
    }
  }
  out.sort((a, b) => a.skill_id.localeCompare(b.skill_id))
  return out
}

/**
 * Sanitise a kid-supplied project name before it's substituted into a
 * template. The rendered template is embedded in the system-prompt overlay
 * inside a code fence (see buildPreRenderedScaffoldBlock), so an unsanitised
 * name could attempt to break out of the fence and inject instructions, or
 * smuggle markup into the kid's own page. We strip backticks + control chars,
 * collapse whitespace, and clamp length. The kid's own browser page is not a
 * security boundary, but the system-prompt fence is — this keeps both clean.
 */
function sanitizeProjectName(name: string): string {
  const cleaned = name
    // eslint-disable-next-line no-control-regex
    .replace(/[`\x00-\x1f\x7f]/g, " ") // backticks + control chars → space
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
  return cleaned.length > 0 ? cleaned : "My project"
}

/**
 * Compose the vibe-derived variable bag that V0 templates expect.
 * Centralised here so adding a new template later doesn't sprinkle key
 * names across plugin init.
 */
export function vibeVarBag(pack: CoursePack, vibeId: string | undefined, projectName: string | undefined): Record<string, string> {
  const flow = pack.guided_flow
  const vibe = flow?.vibes.find((v) => v.id === vibeId) ?? flow?.vibes[0]
  const palette = vibe?.palette ?? ["#000", "#fff", "#888"]
  const name = sanitizeProjectName(projectName ?? pack.title)
  return {
    VIBE_ID: vibe?.id ?? "default",
    VIBE_LABEL: vibe?.label ?? "Default",
    VIBE_PALETTE_BG: palette[0] ?? "#000",
    VIBE_PALETTE_FG: palette[1] ?? "#fff",
    VIBE_PALETTE_ACCENT: palette[2] ?? "#888",
    VIBE_FONT: vibe?.font ?? "system-ui",
    PLAYER_NAME: name,
    PROJECT_NAME: name,
  }
}
