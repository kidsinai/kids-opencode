import { describe, expect, test } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { HelpScreen } from "../../src/render/ink/screens/HelpScreen.tsx"

describe("HelpScreen", () => {
  test("zh-Hans renders helpline + key map", () => {
    const { lastFrame } = render(
      React.createElement(HelpScreen, { locale: "zh-Hans", onBack: () => {} }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("1800 55 1800")
    expect(frame).toContain("Esc")
    expect(frame).toContain("/check")
  })

  test("en renders helpline + key map", () => {
    const { lastFrame } = render(
      React.createElement(HelpScreen, { locale: "en", onBack: () => {} }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("1800 55 1800")
    expect(frame).toContain("Esc")
    expect(frame).toContain("/check")
  })
})
