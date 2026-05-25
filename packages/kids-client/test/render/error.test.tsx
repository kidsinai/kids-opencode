import { describe, expect, test } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { ErrorScreen } from "../../src/render/ink/screens/ErrorScreen.tsx"

describe("ErrorScreen", () => {
  test("serve_unreachable variant shows recovery prompt", () => {
    const { lastFrame } = render(
      React.createElement(ErrorScreen, {
        variant: "serve_unreachable",
        locale: "zh-Hans",
        onRetry: () => {},
      }),
    )
    expect(lastFrame() ?? "").toContain("AI 老师还没起来")
  })

  test("stars_exhausted variant links to portal", () => {
    const { lastFrame } = render(
      React.createElement(ErrorScreen, {
        variant: "stars_exhausted",
        locale: "en",
      }),
    )
    expect(lastFrame() ?? "").toContain("airbotix.ai/portal/wallet")
  })

  test("all 7 variants render without crash", () => {
    const variants = ["serve_unreachable", "port_taken", "network_down", "stars_exhausted", "auth_failed", "config_missing", "ai_hung"] as const
    for (const variant of variants) {
      const { lastFrame } = render(
        React.createElement(ErrorScreen, { variant, locale: "en" }),
      )
      expect((lastFrame() ?? "").length).toBeGreaterThan(0)
    }
  })

  test("[c] Change settings button appears when onReconfigure is passed", () => {
    const { lastFrame } = render(
      React.createElement(ErrorScreen, {
        variant: "serve_unreachable",
        locale: "en",
        onRetry: () => {},
        onReconfigure: () => {},
      }),
    )
    expect(lastFrame() ?? "").toContain("[c]")
    expect(lastFrame() ?? "").toContain("Change settings")
  })

  test("[c] Change settings button is hidden when onReconfigure omitted", () => {
    const { lastFrame } = render(
      React.createElement(ErrorScreen, {
        variant: "network_down",
        locale: "en",
        onRetry: () => {},
      }),
    )
    expect(lastFrame() ?? "").not.toContain("[c]")
  })
})
