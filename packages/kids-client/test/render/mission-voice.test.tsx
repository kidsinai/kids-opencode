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
    selectedModel: null,
    selectedModelLabel: null,
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
    expect(lastFrame() ?? "").toContain("按「空格」说话")
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
    expect(lastFrame() ?? "").toContain("Space to talk")
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

describe("MissionScreen back navigation", () => {
  const LEFT_ARROW = "[D" // ANSI escape for the ← key

  test("hint advertises ← to go back (zh-Hans)", () => {
    const { lastFrame } = render(
      React.createElement(MissionScreen, {
        state: missionState(),
        locale: "zh-Hans",
        onPrompt: () => {},
        onAbort: () => {},
        onExit: () => {},
      }),
    )
    expect(lastFrame() ?? "").toContain("按 ← 返回菜单")
  })

  // ink sets up raw mode asynchronously, so the first keystroke is dropped
  // unless we let a tick pass after render; it also decodes stdin on a tick.
  const tick = () => new Promise<void>((r) => setTimeout(r, 20))

  test("← exits to the menu when idle and the input is empty", async () => {
    let exited = 0
    const { stdin } = render(
      React.createElement(MissionScreen, {
        state: missionState(),
        locale: "en",
        onPrompt: () => {},
        onAbort: () => {},
        onExit: () => { exited++ },
      }),
    )
    await tick()
    stdin.write(LEFT_ARROW)
    await tick()
    expect(exited).toBe(1)
  })

  test("← does NOT exit while the AI is thinking (Esc is the interrupt, not back)", async () => {
    let exited = 0
    const { stdin } = render(
      React.createElement(MissionScreen, {
        state: missionState({ thinking: true }),
        locale: "en",
        onPrompt: () => {},
        onAbort: () => {},
        onExit: () => { exited++ },
      }),
    )
    await tick()
    stdin.write(LEFT_ARROW)
    await tick()
    expect(exited).toBe(0)
  })
})
