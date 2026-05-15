import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { runMissionChecks } from "../src/acceptance"

describe("acceptance runner", () => {
  let projectDir: string

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "kids-opencode-accept-"))
  })

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true })
  })

  test("reports usage error when pack is missing", () => {
    const result = runMissionChecks("mission-1", { projectDir })
    expect("error" in result).toBe(true)
  })

  test("reports usage error for non-existent pack", () => {
    const result = runMissionChecks("mission-1", { packId: "ghost", projectDir })
    expect("error" in result).toBe(true)
    if ("error" in result) {
      expect(result.error).toContain("not found")
    }
  })

  test("reports usage error for non-existent mission in valid pack", () => {
    const result = runMissionChecks("mission-999", {
      packId: "portfolio-site",
      projectDir,
    })
    expect("error" in result).toBe(true)
  })

  test("empty project folder fails Mission 1", () => {
    const result = runMissionChecks("mission-1", {
      packId: "portfolio-site",
      projectDir,
    })
    expect("error" in result).toBe(false)
    if ("error" in result) return
    expect(result.ok).toBe(false)
    expect(result.failed).toBeGreaterThan(0)
  })

  test("Mission 1 passes when index.html with full structure is present", () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Test</title></head>
<body>
  <h1>Hi, I am Alex</h1>
  <p>I love origami and chess and my dog Maple. I am twelve years old and I am building my first website right now.</p>
</body>
</html>`
    writeFileSync(join(projectDir, "index.html"), html)
    const result = runMissionChecks("mission-1", {
      packId: "portfolio-site",
      projectDir,
    })
    expect("error" in result).toBe(false)
    if ("error" in result) return
    // Five real checks should all pass; one audit check skips.
    expect(result.passed).toBe(5)
    expect(result.failed).toBe(0)
    expect(result.skipped).toBe(1)
    expect(result.ok).toBe(true)
  })

  test("Mission 2 fails without style.css and link", () => {
    writeFileSync(
      join(projectDir, "index.html"),
      "<html><body><h1>Hi</h1></body></html>",
    )
    const result = runMissionChecks("mission-2", {
      packId: "portfolio-site",
      projectDir,
    })
    expect("error" in result).toBe(false)
    if ("error" in result) return
    expect(result.failed).toBeGreaterThan(0)
  })

  test("Mission 2 passes with linked stylesheet using common CSS properties", () => {
    writeFileSync(
      join(projectDir, "index.html"),
      `<html><head><link rel="stylesheet" href="style.css"></head><body><h1>Hi</h1></body></html>`,
    )
    writeFileSync(
      join(projectDir, "style.css"),
      `body {
  background-color: #fffaf0;
  color: #2a2a2a;
  font-family: Georgia, serif;
}
h1 {
  font-size: 3rem;
  font-weight: bold;
  color: #b85c00;
}
p {
  font-size: 1.1rem;
  line-height: 1.6;
  margin: 1rem 0;
}
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}
.button {
  background: #b85c00;
}`,
    )
    const result = runMissionChecks("mission-2", {
      packId: "portfolio-site",
      projectDir,
    })
    expect("error" in result).toBe(false)
    if ("error" in result) return
    expect(result.failed).toBe(0)
    expect(result.ok).toBe(true)
  })

  test("Mission 3 detects either addEventListener OR onclick wiring", () => {
    writeFileSync(
      join(projectDir, "index.html"),
      `<html><head><link rel="stylesheet" href="style.css"></head>
<body><h1>Hi</h1><button id="btn">click me</button>
<script src="script.js"></script></body></html>`,
    )
    writeFileSync(join(projectDir, "style.css"), `body { color: red; font-family: Arial; }`)
    // onclick form
    writeFileSync(
      join(projectDir, "script.js"),
      `document.getElementById('btn').onclick = function () { alert('hi'); };`,
    )
    const r1 = runMissionChecks("mission-3", {
      packId: "portfolio-site",
      projectDir,
    })
    expect("error" in r1).toBe(false)
    if ("error" in r1) return
    // not necessarily all passes (Mission 2 dependencies might miss) but the event-listener check passes:
    const evtCheck = r1.results.find((r) => r.id === "script_has_event_listener")
    expect(evtCheck?.status).toBe("pass")

    // addEventListener form
    writeFileSync(
      join(projectDir, "script.js"),
      `document.getElementById('btn').addEventListener('click', () => alert('hi'));`,
    )
    const r2 = runMissionChecks("mission-3", {
      packId: "portfolio-site",
      projectDir,
    })
    if ("error" in r2) return
    const evtCheck2 = r2.results.find((r) => r.id === "script_has_event_listener")
    expect(evtCheck2?.status).toBe("pass")
  })

  test("refuses path traversal in mission id", () => {
    const result = runMissionChecks("../etc/passwd", {
      packId: "portfolio-site",
      projectDir,
    })
    expect("error" in result).toBe(true)
  })
})
