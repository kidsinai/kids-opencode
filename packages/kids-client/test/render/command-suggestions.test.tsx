import { describe, expect, test } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { CommandSuggestions } from "../../src/render/ink/components/CommandSuggestions.tsx"

describe("CommandSuggestions", () => {
  test("'/' shows the command list", () => {
    const { lastFrame } = render(React.createElement(CommandSuggestions, { query: "/", locale: "en" }))
    const f = lastFrame() ?? ""
    expect(f).toContain("/model")
    expect(f).toContain("/help")
  })

  test("narrows as the kid types", () => {
    const { lastFrame } = render(React.createElement(CommandSuggestions, { query: "/mod", locale: "en" }))
    const f = lastFrame() ?? ""
    expect(f).toContain("/model")
    expect(f).not.toContain("/quit")
  })

  test("unknown command nudges toward /help", () => {
    const { lastFrame } = render(React.createElement(CommandSuggestions, { query: "/zzz", locale: "en" }))
    expect(lastFrame() ?? "").toContain("/help")
  })

  test("localised hint in zh-Hans", () => {
    const { lastFrame } = render(React.createElement(CommandSuggestions, { query: "/", locale: "zh-Hans" }))
    expect(lastFrame() ?? "").toContain("选 AI 模型")
  })
})
