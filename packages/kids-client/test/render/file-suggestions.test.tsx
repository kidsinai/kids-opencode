import { describe, expect, test } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { FileSuggestions } from "../../src/render/ink/components/FileSuggestions.tsx"

describe("FileSuggestions", () => {
  test("lists matches", () => {
    const { lastFrame } = render(React.createElement(FileSuggestions, { matches: ["index.html", "style.css"], locale: "en" }))
    const f = lastFrame() ?? ""
    expect(f).toContain("index.html")
    expect(f).toContain("style.css")
  })

  test("empty state nudges to keep typing", () => {
    const { lastFrame } = render(React.createElement(FileSuggestions, { matches: [], locale: "en" }))
    expect(lastFrame() ?? "").toContain("keep typing")
  })

  test("zh-Hans hint", () => {
    const { lastFrame } = render(React.createElement(FileSuggestions, { matches: ["a.js"], locale: "zh-Hans" }))
    expect(lastFrame() ?? "").toContain("AI 就能读它")
  })
})
