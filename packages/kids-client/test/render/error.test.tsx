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

  test("all 6 variants render without crash", () => {
    const variants = ["serve_unreachable", "network_down", "stars_exhausted", "auth_failed", "config_missing", "ai_hung"] as const
    for (const variant of variants) {
      const { lastFrame } = render(
        React.createElement(ErrorScreen, { variant, locale: "en" }),
      )
      expect((lastFrame() ?? "").length).toBeGreaterThan(0)
    }
  })
})
