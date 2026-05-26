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
        onOpenWallet: () => {},
        toast: null,
      }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("AI 编程伙伴")
    expect(frame).toContain("1800 55 1800")
  })

  test("renders en greeting", () => {
    const { lastFrame } = render(
      React.createElement(StartupScreen, {
        locale: "en",
        coursePack: null,
        onStart: () => {},
        onOpenWallet: () => {},
        toast: null,
      }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("AI coding buddy")
    expect(frame).toContain("Kids Helpline")
  })

  test("shows 'continue course pack' label when coursePack is set", () => {
    const { lastFrame } = render(
      React.createElement(StartupScreen, {
        locale: "zh-Hans",
        coursePack: "portfolio-site",
        onStart: () => {},
        onOpenWallet: () => {},
        toast: null,
      }),
    )
    expect(lastFrame() ?? "").toContain("继续")
  })

  test("[w] Wallet hint is always shown", () => {
    const { lastFrame } = render(
      React.createElement(StartupScreen, {
        locale: "en",
        coursePack: null,
        onStart: () => {},
        onOpenWallet: () => {},
        toast: null,
      }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("[w]")
    expect(frame).toContain("Wallet")
  })

  test("renders toast under KeyHints when toast is set", () => {
    const { lastFrame } = render(
      React.createElement(StartupScreen, {
        locale: "en",
        coursePack: null,
        onStart: () => {},
        onOpenWallet: () => {},
        toast: { kind: "success", text: "Opened in your browser: https://app.airbotix.ai/portal/wallet?from=cli" },
      }),
    )
    expect(lastFrame() ?? "").toContain("Opened in your browser")
  })
})
