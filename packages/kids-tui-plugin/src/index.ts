/**
 * @kidsinai/kids-opencode-tui-plugin
 *
 * opencode TUI plugin that gives the terminal interface a kid-friendly skin.
 *
 * Loaded via opencode config alongside the server-side plugin:
 *   { "plugin": ["@kidsinai/kids-opencode-plugin", "@kidsinai/kids-opencode-tui-plugin"] }
 *
 * What it does (Phase 2.4 V0a):
 *   1. Installs + activates the bundled "kids-warm" theme.
 *   2. Registers a simplified keymap layer so `?` help shows ~8 bindings
 *      instead of the upstream power-user list.
 *   3. Surfaces kid-friendly status text (locale-aware: en + zh-Hans).
 *   4. Listens for the server-side system prompt's Kids Helpline phrase
 *      in chat output and pops an overlay with the phone number.
 *   5. Emits a Mission progress audit line whenever session.updated
 *      fires (real Solid slot UI lands in Phase 2.5).
 *
 * What it deliberately does NOT do yet (Phase 2.5 / 7):
 *   - home_logo + home_prompt slot replacement (requires Solid runtime
 *     in this package; deferred to own-client work)
 *   - in-process Mission sidebar widget render (same Solid constraint)
 *   - kids sound pack (needs bundled audio assets)
 *   - full chat-pane rewrite (Phase 2.5 own-client owns this)
 *
 * Pairing:
 *   - This plugin MUST run alongside @kidsinai/kids-opencode-plugin
 *     (server-side). The server plugin handles system prompt + tool
 *     whitelist + Stars cost + audit. This plugin only changes the
 *     visual layer and adds the Helpline overlay.
 */

import type { TuiPlugin, TuiPluginApi, TuiPluginMeta, TuiPluginModule } from "@opencode-ai/plugin/tui"
import type { PluginOptions } from "@opencode-ai/plugin"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

import { buildMissionSidebarLine, readMissionContextFromEnv } from "./mission-sidebar.js"
import { resolveLocale, statusText, type Locale, type StatusKey } from "./status-text.js"
import { detectDangerousTopic, buildHelplineOverlay } from "./dangerous-topic.js"
import { buildKidKeymapLayer, buildKidHelpText } from "./keymap.js"

export const PLUGIN_ID = "kidsinai:kids-opencode-tui"
export const THEME_ID = "kids-warm"
const TUI_PLUGIN_VERSION = "0.0.1"

/**
 * Resolve path to the bundled theme JSON relative to this source file.
 * Works in both src/ (dev) and dist/ (built) layouts.
 */
export function bundledThemePath(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  return join(here, "..", "themes", `${THEME_ID}.json`)
}

/**
 * Emit a structured audit line to stderr so the server-side audit
 * pipeline (and a curious parent inspecting `kids-opencode 2>session.log`)
 * can pick it up. We use a distinct `[kids-tui-audit]` prefix so
 * downstream filters can separate TUI events from server events.
 */
export function audit(event: string, fields: Record<string, unknown> = {}): void {
  const line = {
    ts: new Date().toISOString(),
    component: "kids-opencode-tui-plugin",
    event,
    ...fields,
  }
  process.stderr.write(`[kids-tui-audit] ${JSON.stringify(line)}\n`)
}

const tui: TuiPlugin = async (
  api: TuiPluginApi,
  _options: PluginOptions | undefined,
  meta: TuiPluginMeta,
) => {
  const locale: Locale = resolveLocale()
  audit("plugin.loaded", { version: TUI_PLUGIN_VERSION, id: PLUGIN_ID, locale, state: meta?.state })

  // ── 1. Theme ────────────────────────────────────────────────────────
  try {
    const path = bundledThemePath()
    if (!api.theme.has(THEME_ID)) {
      await api.theme.install(path)
      audit("theme.installed", { id: THEME_ID, path })
    }
    if (api.theme.selected !== THEME_ID) {
      const ok = api.theme.set(THEME_ID)
      audit(ok ? "theme.activated" : "theme.activate_failed", { id: THEME_ID })
    }
  } catch (err) {
    audit("theme.error", {
      id: THEME_ID,
      error: err instanceof Error ? err.message : String(err),
    })
    // Do not throw — a broken theme should never block opencode from launching.
  }

  // ── 2. Keymap layer ─────────────────────────────────────────────────
  try {
    const layer = buildKidKeymapLayer()
    const km = api.keymap as unknown as {
      registerLayer?: (l: ReturnType<typeof buildKidKeymapLayer>) => void
    }
    if (typeof km.registerLayer === "function") {
      km.registerLayer(layer)
      audit("keymap.layer_registered", { bindings: Object.keys(layer.bindings).length })
    } else {
      audit("keymap.layer_skipped", {
        reason: "upstream keymap API does not expose registerLayer at runtime",
      })
    }
  } catch (err) {
    audit("keymap.register_failed", { error: (err as Error).message })
  }

  // ── 3. Status text + Helpline overlay event subscriptions ────────────
  const overlay = buildHelplineOverlay(locale)

  const offIdle = api.event?.on?.("session.idle" as any, () => {
    try {
      ;(api.ui as any)?.toast?.({ title: statusText("ready", locale), duration: 3000 })
    } catch {
      /* toast unavailable in this host; silent */
    }
  })

  const offUpdate = api.event?.on?.("session.updated" as any, () => {
    const ctx = readMissionContextFromEnv()
    const line = buildMissionSidebarLine(ctx)
    if (line.visible) {
      audit("mission_sidebar.update", { line: line.text })
    }
  })

  const offMessage = api.event?.on?.("message.part.updated" as any, (event: any) => {
    const text = extractPartText(event)
    if (!text) return
    const match = detectDangerousTopic(text)
    if (!match.triggered) return
    audit("dangerous_topic.overlay_triggered", {
      reason: match.reason,
      matched: match.matchedText,
    })
    try {
      ;(api.ui as any)?.dialog?.push?.({
        component: () =>
          (api.ui as any).DialogAlert?.({
            title: overlay.title,
            message: `${overlay.body}\n\n${overlay.helplineLine}\n\n${overlay.callToAction}`,
          }),
      })
    } catch (err) {
      // Fall back to a long-duration toast if the dialog API is missing.
      try {
        ;(api.ui as any)?.toast?.({
          title: overlay.title,
          message: overlay.helplineLine,
          duration: 10_000,
        })
      } catch {
        /* both surfaces unavailable; audit captured the trigger anyway */
      }
      audit("dangerous_topic.overlay_fallback_toast", { error: (err as Error).message })
    }
  })

  // ── 4. Help text override (forward-anchor for Phase 2.5 client) ─────
  try {
    ;(api as any).kv?.set?.("kids.help.text", buildKidHelpText())
  } catch {
    /* kv may be readonly or absent in older hosts; ignore */
  }

  // ── 5. Lifecycle cleanup ────────────────────────────────────────────
  ;(api as any).lifecycle?.signal?.addEventListener?.("abort", () => {
    try { offIdle?.() } catch {}
    try { offUpdate?.() } catch {}
    try { offMessage?.() } catch {}
    audit("plugin.deactivated", { version: TUI_PLUGIN_VERSION })
  })

  audit("plugin.activated", { version: TUI_PLUGIN_VERSION })
}

function extractPartText(event: unknown): string {
  if (!event || typeof event !== "object") return ""
  const e = event as { properties?: { part?: { text?: string; type?: string } } }
  const part = e.properties?.part
  if (!part) return ""
  if (part.type === "text" && typeof part.text === "string") return part.text
  return ""
}

const plugin: TuiPluginModule = {
  id: PLUGIN_ID,
  tui,
}

export default plugin

// Named re-exports for tests + future programmatic use.
export {
  tui,
  buildMissionSidebarLine,
  readMissionContextFromEnv,
  statusText,
  resolveLocale,
  detectDangerousTopic,
  buildHelplineOverlay,
  buildKidKeymapLayer,
  buildKidHelpText,
}
export type { Locale, StatusKey }
