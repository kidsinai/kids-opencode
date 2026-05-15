/**
 * @kidsinai/kids-opencode-plugin
 *
 * opencode plugin that turns opencode into a kid-safe coding mentor.
 *
 * Loaded via opencode config:
 *   { "plugin": ["@kidsinai/kids-opencode-plugin"] }
 *
 * What it does (V0):
 *   1. Prepends the kid-safe system prompt to every chat turn.
 *   2. Refuses tool execution for anything outside the V0 whitelist
 *      (defence-in-depth on top of the tool list in config).
 *   3. Emits a minimal audit line for every tool call (sessionID + tool +
 *      sanitised args summary). V0 logs to stderr; V1+ POSTs to
 *      platform-backend /api/audit when a kid is signed in.
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

function readContextFromEnv(): SystemPromptContext {
  return {
    course_pack_title: process.env.KIDS_COURSE_PACK,
    mission_title: process.env.KIDS_MISSION,
    learning_objectives: process.env.KIDS_OBJECTIVES,
    kid_age_band: process.env.KIDS_AGE_BAND,
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

function audit(event: string, fields: Record<string, unknown>): void {
  const line = {
    ts: new Date().toISOString(),
    component: "kids-opencode-plugin",
    event,
    ...fields,
  }
  // V0: stderr only. V1+: POST to platform-backend audit endpoint.
  process.stderr.write(`[kids-audit] ${JSON.stringify(line)}\n`)
}

const plugin: Plugin = async (_input, _options) => {
  audit("plugin.loaded", { version: "0.0.1" })

  const hooks: Hooks = {
    "experimental.chat.system.transform": async (_input, output) => {
      const prompt = buildSystemPrompt(readContextFromEnv())
      // Prepend the kid-safe layer ahead of anything opencode/agent put in.
      output.system.unshift(prompt)
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

      audit("tool.execute.before", {
        sessionID: input.sessionID,
        callID: input.callID,
        tool,
        args_summary: summariseArgs(tool, output.args),
      })
    },

    "tool.execute.after": async (input, output) => {
      audit("tool.execute.after", {
        sessionID: input.sessionID,
        callID: input.callID,
        tool: input.tool,
        title: output.title,
      })
    },
  }

  return hooks
}

// opencode loads `server` as the plugin entry per PluginModule contract.
export const server = plugin

// Convenience re-exports for testing / programmatic use.
export { buildSystemPrompt }
export type { SystemPromptContext }
