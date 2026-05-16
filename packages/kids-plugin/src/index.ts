/**
 * @kidsinai/kids-opencode-plugin
 *
 * opencode plugin that turns opencode into a kid-safe coding mentor.
 *
 * Loaded via opencode config:
 *   { "plugin": ["@kidsinai/kids-opencode-plugin"] }
 *
 * What it does (V0):
 *   1. Loads the bundled Course Pack (if KIDS_COURSE_PACK is set) and
 *      prepends the kid-safe system prompt + pack overlay + mission context.
 *   2. Refuses tool execution for anything outside the V0 whitelist
 *      (defence-in-depth on top of the tool list in config).
 *   3. Enforces a webfetch host allowlist (MDN / web.dev / W3C / airbotix).
 *   4. Emits structured audit lines on stderr for every tool call, including
 *      a per-tool Stars cost estimate so the family wallet can be reconciled
 *      offline (full Stars accounting happens server-side in DeepRouter +
 *      platform-backend Phase 5).
 *
 * What it deliberately does NOT do (V0):
 *   - Persist anything (no DB, no filesystem state). Audit lines go to stderr.
 *   - Talk to platform-backend or DeepRouter directly. Routing is via
 *     opencode config; this plugin only observes and constrains.
 *   - Replace permissions logic. opencode's permission engine still asks
 *     the kid before each tool execution.
 */

import type { Plugin, Hooks } from "@opencode-ai/plugin"
import { buildSystemPrompt, type SystemPromptContext } from "./system-prompt.js"
import {
  buildOverlay,
  bundledCoursePacksDir,
  findMission,
  loadCoursePack,
  type CoursePack,
  type CoursePackMission,
} from "./course-pack.js"

const ALLOWED_TOOLS = new Set([
  "read",
  "write",
  "edit",
  "glob",
  "grep",
  "webfetch",
])

const WEBFETCH_HOST_ALLOWLIST = [
  "developer.mozilla.org",
  "web.dev",
  "html.spec.whatwg.org",
  "airbotix.ai",
]

/**
 * Stars cost estimates per tool invocation. These are intentionally coarse
 * — exact accounting happens server-side in DeepRouter + platform-backend.
 * The client-side estimate exists so families can budget without a server
 * round-trip on every action.
 */
const STAR_COST_PER_TOOL: Record<string, number> = {
  read: 0.5,
  write: 1,
  edit: 1,
  glob: 0.5,
  grep: 0.5,
  webfetch: 2,
}

function readContextFromEnv(pack: CoursePack | null): SystemPromptContext {
  const missionId = process.env.KIDS_MISSION
  const mission = pack && missionId ? findMission(pack, missionId) : null

  return {
    course_pack_title: pack?.title ?? process.env.KIDS_COURSE_PACK,
    mission_title: mission?.title ?? missionId,
    learning_objectives:
      process.env.KIDS_OBJECTIVES ??
      pack?.learning_objectives?.join("; "),
    kid_age_band:
      process.env.KIDS_AGE_BAND ??
      pack?.target_age_band ??
      "12+",
  }
}

function isWebfetchUrlAllowed(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl)
    if (u.protocol !== "https:" && u.protocol !== "http:") return false
    return WEBFETCH_HOST_ALLOWLIST.some(
      (host) => u.hostname === host || u.hostname.endsWith(`.${host}`),
    )
  } catch {
    return false
  }
}

function summariseArgs(tool: string, args: unknown): string {
  if (!args || typeof args !== "object") return ""
  const a = args as Record<string, unknown>
  switch (tool) {
    case "read":
    case "edit":
      return typeof a.path === "string" ? `path=${a.path}` : ""
    case "write":
      return typeof a.path === "string"
        ? `path=${a.path} bytes=${typeof a.content === "string" ? a.content.length : "?"}`
        : ""
    case "glob":
    case "grep":
      return typeof a.pattern === "string" ? `pattern=${a.pattern}` : ""
    case "webfetch":
      return typeof a.url === "string" ? `url=${a.url}` : ""
    default:
      return ""
  }
}

export function audit(event: string, fields: Record<string, unknown>): void {
  const line = {
    ts: new Date().toISOString(),
    component: "kids-opencode-plugin",
    event,
    ...fields,
  }
  // V0: stderr only. V1+: POST to platform-backend audit endpoint.
  process.stderr.write(`[kids-audit] ${JSON.stringify(line)}\n`)
}

export function estimateStarsCost(tool: string): number {
  return STAR_COST_PER_TOOL[tool] ?? 1
}

const plugin: Plugin = async (_input, _options) => {
  // Load Course Pack at plugin init if requested.
  const packId = process.env.KIDS_COURSE_PACK
  const pack: CoursePack | null = packId ? loadCoursePack(packId) : null

  audit("plugin.loaded", {
    version: "0.0.1",
    course_pack: pack?.id ?? null,
    mission: process.env.KIDS_MISSION ?? null,
  })

  if (packId && !pack) {
    audit("course_pack.not_found", { requested: packId })
  }

  const baseContext = readContextFromEnv(pack)
  const baseSystemPrompt = buildSystemPrompt(baseContext)
  const overlay = buildOverlay(pack, process.env.KIDS_MISSION)

  const hooks: Hooks = {
    "experimental.chat.system.transform": async (_input, output) => {
      // Prepend kid-safe layer (and pack overlay if applicable) ahead of anything
      // opencode/agent put in. The plugin layer always wins.
      const stitched = overlay
        ? `${baseSystemPrompt}\n\n${overlay}`
        : baseSystemPrompt
      output.system.unshift(stitched)
    },

    "tool.execute.before": async (input, output) => {
      const tool = input.tool

      // Belt-and-braces tool whitelist. Config also restricts the list, but
      // if a future opencode upgrade re-enables shell by default we refuse here.
      if (!ALLOWED_TOOLS.has(tool)) {
        audit("tool.blocked.not_whitelisted", {
          sessionID: input.sessionID,
          tool,
        })
        throw new Error(
          `kids-opencode: tool "${tool}" is not allowed in V0. ` +
            `Allowed tools: ${[...ALLOWED_TOOLS].join(", ")}. ` +
            `Shell / command execution is disabled by design.`,
        )
      }

      if (tool === "webfetch") {
        const rawUrl =
          output.args && typeof output.args === "object"
            ? (output.args as Record<string, unknown>).url
            : undefined
        if (typeof rawUrl !== "string" || !isWebfetchUrlAllowed(rawUrl)) {
          audit("tool.blocked.webfetch_host", {
            sessionID: input.sessionID,
            tool,
            url: typeof rawUrl === "string" ? rawUrl : null,
          })
          throw new Error(
            `kids-opencode: webfetch only allows: ${WEBFETCH_HOST_ALLOWLIST.join(", ")}. ` +
              `Other URLs are blocked in V0.`,
          )
        }
      }

      const starsCost = estimateStarsCost(tool)

      audit("tool.execute.before", {
        sessionID: input.sessionID,
        callID: input.callID,
        tool,
        args_summary: summariseArgs(tool, output.args),
        stars_estimated: starsCost,
      })
    },

    "tool.execute.after": async (input, output) => {
      audit("tool.execute.after", {
        sessionID: input.sessionID,
        callID: input.callID,
        tool: input.tool,
        title: output.title,
        stars_charged: estimateStarsCost(input.tool),
      })
    },
  }

  return hooks
}

// opencode loads `server` as the plugin entry per PluginModule contract.
export const server = plugin

// Convenience re-exports for testing / programmatic use.
// Consumed by @kidsinai/kids-client to render Course Pack metadata and to
// run mission acceptance checks from inside the TUI (Phase 2.5 "In-TUI
// mission check command").
export { buildSystemPrompt, loadCoursePack, buildOverlay, findMission, bundledCoursePacksDir }
export { runMissionChecks, loadAcceptanceForMission } from "./acceptance.ts"
export type { SystemPromptContext, CoursePack, CoursePackMission }
export type { MissionResult, CheckResult, AcceptanceCheck } from "./acceptance.ts"
