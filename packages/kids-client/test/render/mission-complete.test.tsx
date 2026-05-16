import { describe, expect, test } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { MissionCompleteScreen } from "../../src/render/ink/screens/MissionCompleteScreen.tsx"

describe("MissionCompleteScreen", () => {
  test("renders ASCII celebration + completion message", () => {
    const { lastFrame } = render(
      React.createElement(MissionCompleteScreen, {
        locale: "zh-Hans",
        missionId: "mission-1",
        missionTitle: "项目设置 + 第一个 HTML 页面",
        passed: 5,
        total: 5,
        completionMessage: "你做得很棒！",
        hasNextMission: true,
        onNext: () => {},
        onBack: () => {},
      }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("🎆")
    expect(frame).toContain("Mission")
    expect(frame).toContain("5/5")
    expect(frame).toContain("项目设置")
  })

  test("hides next-mission hint when no next", () => {
    const { lastFrame } = render(
      React.createElement(MissionCompleteScreen, {
        locale: "en",
        missionId: "mission-3",
        missionTitle: "Final",
        passed: 3,
        total: 3,
        completionMessage: "Great work!",
        hasNextMission: false,
        onNext: () => {},
        onBack: () => {},
      }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Mission complete")
    expect(frame).not.toContain("Next Mission")
  })
})
