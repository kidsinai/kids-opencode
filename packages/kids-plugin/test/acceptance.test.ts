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

  test("Mission 3 detects inline JS wiring (onclick OR addEventListener)", () => {
    // Website Mission 3 is now single-file: HTML + inline <script>. Acceptance
    // checks index.html for an interactive element + JS wiring, not a separate
    // script.js. Sample needs ≥700 chars to clear the substance check.
    const padding = "<p>A bit about me and the things I like to make and do.</p>".repeat(8)
    const onclickPage = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Me</title>
<style>body{font-family:system-ui;background:#fff;color:#111}</style></head>
<body><h1>My site</h1>${padding}
<button id="btn">Switch theme</button>
<script>document.getElementById('btn').onclick = function () { document.body.classList.toggle('dark'); };</script>
</body></html>`
    writeFileSync(join(projectDir, "index.html"), onclickPage)
    const r1 = runMissionChecks("mission-3", { packId: "portfolio-site", projectDir })
    expect("error" in r1).toBe(false)
    if ("error" in r1) return
    expect(r1.results.find((r) => r.id === "index_html_has_js_wiring")?.status).toBe("pass")
    expect(r1.results.find((r) => r.id === "index_html_has_interactive_element")?.status).toBe("pass")

    // addEventListener + localStorage form (guestbook style)
    const guestbookPage = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Me</title></head>
<body><h1>My site</h1>${padding}
<input id="msg"><button id="save">Save</button><ul id="list"></ul>
<script>
document.getElementById('save').addEventListener('click', () => {
  localStorage.setItem('m', document.getElementById('msg').value);
});
</script></body></html>`
    writeFileSync(join(projectDir, "index.html"), guestbookPage)
    const r2 = runMissionChecks("mission-3", { packId: "portfolio-site", projectDir })
    if ("error" in r2) return
    expect(r2.results.find((r) => r.id === "index_html_has_js_wiring")?.status).toBe("pass")
    expect(r2.ok).toBe(true)
  })

  test("refuses path traversal in mission id", () => {
    const result = runMissionChecks("../etc/passwd", {
      packId: "portfolio-site",
      projectDir,
    })
    expect("error" in result).toBe(true)
  })
})
