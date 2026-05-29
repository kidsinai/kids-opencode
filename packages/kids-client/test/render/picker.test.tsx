import { describe, expect, test } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { CoursePackPicker, FREE_PLAY_PACK_ID } from "../../src/render/ink/screens/CoursePackPicker.tsx"
import type { InstalledPack } from "../../src/core/course-pack.ts"

const SAMPLE_PACKS: InstalledPack[] = [
  {
    id: "game",
    title: "A game you can play",
    shortDescription: "Make a small game in your browser.",
    missionCount: 3,
    starsBudget: 40,
    icon: "🎮",
    pickerLabel: "A game you can play",
    typeCategory: "game",
    pickerOrder: 0,
  },
  {
    id: "website",
    title: "A website about you",
    shortDescription: "Make a one-page site about yourself.",
    missionCount: 3,
    starsBudget: 40,
    icon: "🌐",
    pickerLabel: "A website about you",
    typeCategory: "website",
    pickerOrder: 1,
  },
]

const LEGACY_PACK: InstalledPack[] = [
  {
    id: "portfolio-site",
    title: "Personal Portfolio Website",
    shortDescription: "Build your first website",
    missionCount: 3,
    starsBudget: 40,
    icon: null,
    pickerLabel: null,
    typeCategory: null,
    pickerOrder: Number.MAX_SAFE_INTEGER,
  },
]

describe("CoursePackPicker", () => {
  test("renders picker_label + icon when populated", () => {
    const { lastFrame } = render(
      React.createElement(CoursePackPicker, {
        locale: "en",
        packs: SAMPLE_PACKS,
        onPick: () => {},
        onBack: () => {},
      }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("A game you can play")
    expect(frame).toContain("A website about you")
    expect(frame).toContain("🎮")
    expect(frame).toContain("🌐")
    expect(frame).toContain("3 missions")
  })

  test("falls back to title + 📦 default icon when pack lacks new fields", () => {
    const { lastFrame } = render(
      React.createElement(CoursePackPicker, {
        locale: "en",
        packs: LEGACY_PACK,
        onPick: () => {},
        onBack: () => {},
      }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("Personal Portfolio Website")
    expect(frame).toContain("📦")
  })

  test("always appends a 'just chat' synthetic entry", () => {
    const { lastFrame } = render(
      React.createElement(CoursePackPicker, {
        locale: "en",
        packs: SAMPLE_PACKS,
        onPick: () => {},
        onBack: () => {},
      }),
    )
    const frame = lastFrame() ?? ""
    expect(frame).toContain("I don't know yet")
    expect(frame).toContain("🤔")
  })

  test("renders empty-state warning when zero real packs installed, but still shows the chat entry", () => {
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

  test("highlights first item by default", () => {
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

  test("FREE_PLAY_PACK_ID is the sentinel orchestrator listens for", () => {
    expect(FREE_PLAY_PACK_ID).toBe("_free")
  })
})
