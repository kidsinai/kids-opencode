import { describe, expect, test, afterEach } from "bun:test"
import { AuditPipeline } from "../../src/core/audit-pipeline.ts"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const tmp = mkdtempSync(join(tmpdir(), "kc-audit-"))
afterEach(() => {
  try {
    rmSync(tmp, { recursive: true, force: true })
  } catch {}
})

describe("AuditPipeline", () => {
  test("flush writes one jsonl line per event", async () => {
    const p = new AuditPipeline({ bufferPath: join(tmp, "buf.jsonl") })
    p.push({ event: "tool.execute.before", tool: "read" })
    p.push({ event: "tool.execute.after", tool: "read", stars_charged: 1 })
    await p.flush()
    const contents = readFileSync(join(tmp, "buf.jsonl"), "utf8")
    const lines = contents.trim().split("\n")
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0]!).tool).toBe("read")
    expect(JSON.parse(lines[1]!).stars_charged).toBe(1)
  })

  test("auto-flushes after batchSize", async () => {
    const p = new AuditPipeline({ bufferPath: join(tmp, "auto.jsonl"), batchSize: 2, flushIntervalMs: 60_000 })
    p.push({ n: 1 })
    p.push({ n: 2 })
    // give the async flush a tick
    await new Promise((r) => setTimeout(r, 30))
    const contents = readFileSync(join(tmp, "auto.jsonl"), "utf8")
    expect(contents.trim().split("\n").length).toBe(2)
    await p.stop()
  })
})
