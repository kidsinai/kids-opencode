import { describe, expect, test } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { CoursePackPicker } from "../../src/render/ink/screens/CoursePackPicker.tsx"

const SAMPLE_PACKS = [
  { id: "portfolio-site", title: "Personal Portfolio Website", shortDescription: "Build your first website", missionCount: 3, starsBudget: 40 },
  { id: "snake-game", title: "Snake Game", shortDescription: null, missionCount: 4, starsBudget: 50 },
]

describe("CoursePackPicker", () => {
  test("renders pack titles when populated", () => {
    const { lastFrame } = render(
      React.createElement(CoursePackPicker, {
        locale: "en",
        packs: SAMPLE_PACKS,
        onPick: () => {},
        onBack: () => {},
      }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Personal Portfolio Website")
    expect(frame).toContain("Snake Game")
    expect(frame).toContain("3 missions")
  })

  test("renders empty state when no packs installed", () => {
    const { lastFrame } = render(
      React.createElement(CoursePackPicker, {
        locale: "zh-Hans",
        packs: [],
        onPick: () => {},
        onBack: () => {},
      }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("没装")
  })

  test("highlights first item by default in zh-Hans", () => {
    const { lastFrame } = render(
      React.createElement(CoursePackPicker, {
        locale: "zh-Hans",
        packs: SAMPLE_PACKS,
        onPick: () => {},
        onBack: () => {},
      }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("▶")
  })
})
