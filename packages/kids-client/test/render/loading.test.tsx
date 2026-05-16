import { describe, expect, test } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { LoadingScreen } from "../../src/render/ink/screens/LoadingScreen.tsx"

describe("LoadingScreen", () => {
  test("renders default zh-Hans message", () => {
    const { lastFrame } = render(
      React.createElement(LoadingScreen, { locale: "zh-Hans" }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("AI 老师")
  })

  test("renders custom message override", () => {
    const { lastFrame } = render(
      React.createElement(LoadingScreen, { locale: "en", message: "Custom waiting…" }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Custom waiting")
  })
})
