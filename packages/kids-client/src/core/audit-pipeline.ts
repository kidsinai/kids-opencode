/**
 * Audit pipeline: stderr-tail input → batch → local jsonl buffer
 * → (later) POST to platform-backend /api/audit.
 *
 * V0 MVP scope: write only to local file at
 *   ~/.config/kids-opencode/audit-buffer.jsonl
 * Remote ingest is plumbed but disabled until platform-backend ships
 * the endpoint and `@airbotix/audit-schema` is published (see PRD
 * audit-event-schema-prd.md §8).
 *
 * Format on disk: one JSON envelope per line. Each line is the event
 * exactly as parsed from `[kids-audit] {...}` stderr output.
 */

import { appendFile, mkdir } from "node:fs/promises"
import { dirname } from "node:path"

export interface AuditPipelineOptions {
  bufferPath: string
  /** Optional remote endpoint. When unset, only the local buffer is written. */
  remoteUrl?: string
  remoteAuthHeader?: string
  /** Max items held in memory before flushing to disk. */
  batchSize?: number
  /** Max ms between flushes regardless of batch size. */
  flushIntervalMs?: number
}

export class AuditPipeline {
  private opts: AuditPipelineOptions
  private pending: unknown[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private writing = false

  constructor(opts: AuditPipelineOptions) {
    this.opts = { batchSize: 20, flushIntervalMs: 2000, ...opts }
  }

  start(): void {
    if (this.flushTimer) return
    this.flushTimer = setInterval(() => {
      void this.flush().catch(() => {})
    }, this.opts.flushIntervalMs!)
  }

  push(event: unknown): void {
    this.pending.push(event)
    if (this.pending.length >= (this.opts.batchSize ?? 20)) {
      void this.flush().catch(() => {})
    }
  }

  async flush(): Promise<void> {
    if (this.writing) return
    if (this.pending.length === 0) return
    this.writing = true
    const batch = this.pending
    this.pending = []
    try {
      await mkdir(dirname(this.opts.bufferPath), { recursive: true })
      const lines = batch.map((e) => JSON.stringify(e)).join("\n") + "\n"
      await appendFile(this.opts.bufferPath, lines, "utf8")
      if (this.opts.remoteUrl) await this.postRemote(batch)
    } catch {
      // Restore on failure so we retry next tick.
      this.pending = [...batch, ...this.pending]
    } finally {
      this.writing = false
    }
  }

  async stop(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer)
    this.flushTimer = null
    await this.flush()
  }

  private async postRemote(batch: unknown[]): Promise<void> {
    if (!this.opts.remoteUrl) return
    try {
      await fetch(this.opts.remoteUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.opts.remoteAuthHeader ? { authorization: this.opts.remoteAuthHeader } : {}),
        },
        body: JSON.stringify({ events: batch }),
      })
    } catch {
      // Swallow; local jsonl is the source of truth.
    }
  }
}
