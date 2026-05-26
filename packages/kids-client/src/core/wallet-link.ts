/**
 * Wallet / login deep-link to Airbotix Portal.
 *
 * V0 strategy: open the parent's default browser to portal/wallet?from=cli.
 * Portal handles auth (login first if no session) and Airwallex hosted card
 * entry. TUI does not touch card data — PCI scope stays in the browser.
 *
 * A stable device-id (random UUID, persisted under configDir) is included
 * so platform-backend can later correlate top-ups with the local install
 * for V1 device-link polling. Today portal just logs it.
 */

import { spawn } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { randomUUID } from "node:crypto"

export const DEFAULT_PORTAL_BASE_URL = "https://app.airbotix.ai"

export function getOrCreateDeviceId(configDir: string): string {
  const p = join(configDir, "device-id")
  if (existsSync(p)) {
    const v = readFileSync(p, "utf8").trim()
    if (v) return v
  }
  mkdirSync(configDir, { recursive: true })
  const id = randomUUID()
  writeFileSync(p, id + "\n", { mode: 0o600 })
  return id
}

export interface WalletUrlOpts {
  portalBaseUrl?: string
  deviceId: string
  locale?: "zh-Hans" | "en"
}

export function buildWalletUrl(opts: WalletUrlOpts): string {
  const base = (opts.portalBaseUrl || DEFAULT_PORTAL_BASE_URL).replace(/\/+$/, "")
  const params = new URLSearchParams({
    from: "cli",
    device: opts.deviceId,
  })
  if (opts.locale) params.set("lang", opts.locale)
  return `${base}/portal/wallet?${params.toString()}`
}

export type OpenResult = { ok: true } | { ok: false; reason: string }

export function openInBrowser(url: string): OpenResult {
  const platform = process.platform
  let cmd: string
  let args: string[]
  if (platform === "darwin") {
    cmd = "open"
    args = [url]
  } else if (platform === "win32") {
    // `start` is a cmd.exe builtin; the empty "" is the window title slot.
    cmd = "cmd"
    args = ["/c", "start", "", url]
  } else {
    cmd = "xdg-open"
    args = [url]
  }
  try {
    const child = spawn(cmd, args, { detached: true, stdio: "ignore" })
    child.on("error", () => {
      // Swallow async spawn errors — TUI already showed a toast saying we
      // tried, and the parent can copy the URL from the toast as fallback.
    })
    child.unref()
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) }
  }
}
