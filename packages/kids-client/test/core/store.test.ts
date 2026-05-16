import { describe, expect, test } from "bun:test"
import { Store } from "../../src/core/store.ts"

describe("Store", () => {
  test("starts in loading screen", () => {
    const s = new Store()
    expect(s.getSnapshot().screen.kind).toBe("loading")
  })

  test("update merges patch", () => {
    const s = new Store()
    s.update({ screen: { kind: "startup" }, coursePack: "portfolio-site" })
    const snap = s.getSnapshot()
    expect(snap.screen.kind).toBe("startup")
    expect(snap.coursePack).toBe("portfolio-site")
  })

  test("appendMessage + appendDelta + endStream flow", () => {
    const s = new Store()
    s.appendMessage({ id: "m1", actor: "agent", text: "", streaming: true, ts: 0 })
    s.appendDelta("m1", "Hello ")
    s.appendDelta("m1", "world")
    s.endStream("m1")
    const snap = s.getSnapshot()
    expect(snap.messages).toHaveLength(1)
    expect(snap.messages[0]!.text).toBe("Hello world")
    expect(snap.messages[0]!.streaming).toBe(false)
  })

  test("subscriber receives notifications", () => {
    const s = new Store()
    let count = 0
    const unsub = s.subscribe(() => count++)
    s.update({ thinking: true })
    s.update({ thinking: false })
    unsub()
    s.update({ thinking: true })
    expect(count).toBe(2)
  })

  test("audit buffer caps at 500", () => {
    const s = new Store()
    for (let i = 0; i < 600; i++) s.pushAudit({ i })
    expect(s.getSnapshot().auditBuffer).toHaveLength(500)
  })
})
