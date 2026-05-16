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

export type ServeReadiness =
  | { kind: "already_running" }
  | { kind: "spawned"; pid: number }
  | { kind: "timeout"; lastError: string }

export interface ServeManagerOptions {
  baseUrl: string
  serverPassword: string
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

  constructor(opts: ServeManagerOptions) {
    this.opts = opts
  }

  /**
   * Probe baseUrl. If already up, no-op. Otherwise spawn `opencode serve`
   * as a child, hook stderr parsing, poll until /app responds 200.
   */
  async ensureReady(): Promise<ServeReadiness> {
    if (await this.probe()) return { kind: "already_running" }

    const url = new URL(this.opts.baseUrl)
    const proc = spawn({
      cmd: [this.opts.opencodeBin, "serve", "--hostname", url.hostname, "--port", url.port || "4096"],
      env: {
        ...process.env,
        OPENCODE_SERVER_PASSWORD: this.opts.serverPassword,
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
      if (await this.probe()) return { kind: "spawned", pid: proc.pid ?? -1 }
      await new Promise((r) => setTimeout(r, 200))
      lastError = "still booting"
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

  /** GET /app with Basic Auth. Returns true on 200. */
  private async probe(): Promise<boolean> {
    try {
      const res = await fetch(`${this.opts.baseUrl}/app`, {
        headers: {
          authorization: "Basic " + btoa(`:${this.opts.serverPassword}`),
        },
      })
      return res.ok
    } catch {
      return false
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
    if (audit) this.opts.onAuditLine?.(audit)
    else this.opts.onDebugLine?.(line)
  }
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
