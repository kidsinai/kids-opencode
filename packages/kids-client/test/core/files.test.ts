import { describe, expect, test } from "bun:test"
import { extractPaths } from "../../src/core/files.ts"

describe("extractPaths", () => {
  test("bare string array", () => {
    expect(extractPaths(["a.html", "b/c.js"])).toEqual(["a.html", "b/c.js"])
  })
  test("{ data: string[] } (SDK fields style)", () => {
    expect(extractPaths({ data: ["index.html"] })).toEqual(["index.html"])
  })
  test("array of FileNode-ish objects", () => {
    expect(extractPaths([{ path: "x.css" }, { absolute: "/abs/y.js" }])).toEqual(["x.css", "/abs/y.js"])
  })
  test("garbage → empty, no throw", () => {
    expect(extractPaths(null)).toEqual([])
    expect(extractPaths({ nope: 1 })).toEqual([])
    expect(extractPaths(42)).toEqual([])
  })
})
