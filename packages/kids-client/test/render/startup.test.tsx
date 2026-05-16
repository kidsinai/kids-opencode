import { describe, expect, test } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { StartupScreen } from "../../src/render/ink/screens/StartupScreen.tsx"

describe("StartupScreen", () => {
  test("renders zh-Hans greeting + helpline", () => {
    const { lastFrame } = render(
      React.createElement(StartupScreen, {
        locale: "zh-Hans",
        coursePack: null,
        onStart: () => {},
      }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Airbotix Kids OpenCode")
    expect(frame).toContain("Kids OpenCode")
    expect(frame).toContain("1800 55 1800")
  })

  test("renders en greeting", () => {
    const { lastFrame } = render(
      React.createElement(StartupScreen, {
        locale: "en",
        coursePack: null,
        onStart: () => {},
      }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("AI teacher")
    expect(frame).toContain("1800 55 1800")
  })

  test("shows 'continue course pack' label when coursePack is set", () => {
    const { lastFrame } = render(
      React.createElement(StartupScreen, {
        locale: "zh-Hans",
        coursePack: "portfolio-site",
        onStart: () => {},
      }),
    )
    expect(lastFrame() ?? "").toContain("继续")
  })
})
