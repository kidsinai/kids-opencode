import { describe, expect, test } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { MissionScreen } from "../../src/render/ink/screens/MissionScreen.tsx"
import type { KidsClientState } from "../../src/core/store.ts"

function missionState(over: Partial<KidsClientState> = {}): KidsClientState {
  return {
    screen: { kind: "mission" },
    sessionId: "s1",
    messages: [],
    starsBalance: 100,
    starsBudget: 200,
    pendingPermission: null,
    dangerousTopic: null,
    thinking: false,
    coursePack: null,
    mission: null,
    packTitle: "Portfolio",
    missionTitle: "Make a page",
    missionIndex: 1,
    missionTotal: 3,
    toast: null,
    auditBuffer: [],
    ...over,
  }
}

describe("MissionScreen voice input", () => {
  test("zh-Hans hint tells the kid Space talks", () => {
    const { lastFrame } = render(
      React.createElement(MissionScreen, {
        state: missionState(),
        locale: "zh-Hans",
        onPrompt: () => {},
        onAbort: () => {},
        onExit: () => {},
      }),
    )
    expect(lastFrame() ?? "").toContain("按「空格」对小助手说话")
  })

  test("en hint tells the kid Space talks", () => {
    const { lastFrame } = render(
      React.createElement(MissionScreen, {
        state: missionState(),
        locale: "en",
        onPrompt: () => {},
        onAbort: () => {},
        onExit: () => {},
      }),
    )
    expect(lastFrame() ?? "").toContain("press Space to talk")
  })

  test("input box renders while idle (voice not engaged)", () => {
    const { lastFrame } = render(
      React.createElement(MissionScreen, {
        state: missionState(),
        locale: "zh-Hans",
        onPrompt: () => {},
        onAbort: () => {},
        onExit: () => {},
      }),
    )
    // The 💬 input prompt is present until a voice turn replaces it.
    expect(lastFrame() ?? "").toContain("💬")
  })
})
