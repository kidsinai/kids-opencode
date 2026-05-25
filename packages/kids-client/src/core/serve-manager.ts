/**
 * Owns the local `opencode serve` subprocess for the lifetime of this client.
 *
 * Per docs/v2-api-verification.md Q3 (resolved 2026-05-16): plugin cannot
 * publish custom events through SDK public API, so the audit pipeline
 * tails serve stderr and parses `[kids-audit] {...}` lines.
 *
 * V0 scope cut: client crash kills serve. Session-resume (PRD §5.3) is
 * deferred to V1. See Q3 spike notes.
 */

import { spawn, type Subprocess } from "bun"
import { buildAuthHeader } from "./connection.ts"

export type ServeReadiness =
  | { kind: "already_running" }
  | { kind: "spawned"; pid: number }
  // Someone else is holding the port (TCP accepts) but our password doesn't
  // unlock /app. Usually a stale `opencode serve` from a previous run with a
  // different OPENCODE_SERVER_PASSWORD. Telling the kid to retry won't help —
  // they need to free the port (`kids-opencode --shutdown`).
  | { kind: "port_taken_auth_mismatch"; port: string }
  // We spawned a child but it exited before becoming ready (e.g. EADDRINUSE,
  // missing config). exitCode/stderr surface the real cause instead of
  // making the kid wait 10s for a generic timeout.
  | { kind: "spawn_failed"; exitCode: number | null; stderrTail: string }
  | { kind: "timeout"; lastError: string }

/** Tri-state probe result; lets ensureReady() distinguish "nobody home"
 *  from "someone's home but won't let me in". */
export type ProbeResult = "ok" | "auth_mismatch" | "offline"

export interface ServeManagerOptions {
  baseUrl: string
  serverPassword: string
  /**
   * Must match upstream's `OPENCODE_SERVER_USERNAME` (default "opencode").
   * The probe sends this as the Basic-auth username — upstream's
   * authorized() requires an exact match, so an empty username produces
   * a 401 even when the password is correct.
   */
  serverUsername: string
  opencodeBin: string
  /** Max wait for readiness probe in ms. Default 10s. */
  readyTimeoutMs?: number
  /** Called for every parsed `[kids-audit]` JSON line on stderr. */
  onAuditLine?: (event: unknown) => void
  /** Called for every other (non-audit) stderr line. Useful for debug log. */
  onDebugLine?: (line: string) => void
}

export class ServeManager {
  private child: Subprocess | null = null
  private opts: ServeManagerOptions
  // Recent stderr lines from the spawned child, used for spawn_failed
  // diagnostics. Bounded so it doesn't grow unbounded over a long session.
  private stderrTail: string[] = []
  private static STDERR_TAIL_MAX = 20

  constructor(opts: ServeManagerOptions) {
    this.opts = opts
  }

  /**
   * Probe baseUrl. If already up, no-op. If something else holds the port
   * with a different password, return port_taken_auth_mismatch (don't try
   * to spawn — bind would just fail with EADDRINUSE). Otherwise spawn
   * `opencode serve`, hook stderr parsing, and race the readiness poll
   * against the child's exit so port conflicts surface in <1s instead of
   * timing out after 10s.
   */
  async ensureReady(): Promise<ServeReadiness> {
    const initial = await this.probe()
    if (initial === "ok") return { kind: "already_running" }
    if (initial === "auth_mismatch") {
      const url = new URL(this.opts.baseUrl)
      return { kind: "port_taken_auth_mismatch", port: url.port || "4096" }
    }

    const url = new URL(this.opts.baseUrl)
    const proc = spawn({
      cmd: [this.opts.opencodeBin, "serve", "--hostname", url.hostname, "--port", url.port || "4096"],
      env: {
        ...process.env,
        OPENCODE_SERVER_PASSWORD: this.opts.serverPassword,
        OPENCODE_SERVER_USERNAME: this.opts.serverUsername,
      },
      stdout: "pipe",
      stderr: "pipe",
    })
    this.child = proc

    if (proc.stderr) void this.pipeStderr(proc.stderr)

    const timeout = this.opts.readyTimeoutMs ?? 10_000
    const start = Date.now()
    let lastError = "no response"
    while (Date.now() - start < timeout) {
      // If the child died on its own (bind failure, bad args), don't keep
      // polling — surface the exit immediately with whatever stderr we got.
      if (proc.exitCode !== null) {
        return {
          kind: "spawn_failed",
          exitCode: proc.exitCode,
          stderrTail: this.stderrTail.join("\n"),
        }
      }
      const status = await this.probe()
      if (status === "ok") return { kind: "spawned", pid: proc.pid ?? -1 }
      await new Promise((r) => setTimeout(r, 200))
      lastError = status === "auth_mismatch" ? "auth mismatch on /app" : "still booting"
    }
    return { kind: "timeout", lastError }
  }

  /** Kill the serve child (V0 MVP: on client exit). */
  async shutdown(): Promise<void> {
    if (this.child && !this.child.killed) {
      this.child.kill()
      await this.child.exited
    }
    this.child = null
  }

  /** GET /app with Basic Auth.
   *  200 → "ok"; 401/403 → "auth_mismatch" (port owned by another instance
   *  whose password differs); anything else (network refused, 5xx, timeout)
   *  → "offline". */
  private async probe(): Promise<ProbeResult> {
    try {
      const res = await fetch(`${this.opts.baseUrl}/app`, {
        headers: {
          authorization: buildAuthHeader(this.opts.serverUsername, this.opts.serverPassword),
        },
      })
      return classifyProbeStatus(res.status)
    } catch {
      return "offline"
    }
  }

  private async pipeStderr(stream: ReadableStream<Uint8Array>): Promise<void> {
    const decoder = new TextDecoder()
    let buf = ""
    const reader = stream.getReader()
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let nl: number
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl)
        buf = buf.slice(nl + 1)
        this.handleLine(line)
      }
    }
    if (buf.length > 0) this.handleLine(buf)
  }

  private handleLine(line: string): void {
    if (!line) return
    const audit = parseAuditLine(line)
    if (audit) {
      this.opts.onAuditLine?.(audit)
      return
    }
    this.stderrTail.push(line)
    if (this.stderrTail.length > ServeManager.STDERR_TAIL_MAX) {
      this.stderrTail.shift()
    }
    this.opts.onDebugLine?.(line)
  }
}

export function classifyProbeStatus(status: number): ProbeResult {
  if (status >= 200 && status < 300) return "ok"
  if (status === 401 || status === 403) return "auth_mismatch"
  return "offline"
}

export function parseAuditLine(line: string): unknown | null {
  const prefixes = ["[kids-audit] ", "[kids-tui-audit] "]
  for (const prefix of prefixes) {
    if (line.startsWith(prefix)) {
      try {
        return JSON.parse(line.slice(prefix.length))
      } catch {
        return null
      }
    }
  }
  return null
}
