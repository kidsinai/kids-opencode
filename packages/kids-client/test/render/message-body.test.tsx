import { describe, expect, test } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { splitBlocks, MessageBody } from "../../src/render/ink/components/MessageBody.tsx"

describe("splitBlocks", () => {
  test("plain text → one text block", () => {
    expect(splitBlocks("hello world")).toEqual([{ type: "text", lang: undefined, content: "hello world" }])
  })

  test("fenced code splits out with language", () => {
    const blocks = splitBlocks("before\n```js\nconst x = 1\n```\nafter")
    expect(blocks).toEqual([
      { type: "text", lang: undefined, content: "before" },
      { type: "code", lang: "js", content: "const x = 1" },
      { type: "text", lang: undefined, content: "after" },
    ])
  })

  test("unterminated fence (still streaming) stays a code block", () => {
    const blocks = splitBlocks("ok\n```\nhalf typed")
    expect(blocks[0]).toEqual({ type: "text", lang: undefined, content: "ok" })
    expect(blocks[1]).toEqual({ type: "code", lang: "", content: "half typed" })
  })
})

describe("MessageBody render", () => {
  test("renders code content and strips ** bold markers", () => {
    const { lastFrame } = render(
      React.createElement(MessageBody, { text: "Say **hi** then:\n```\nprint(1)\n```", color: "white" }),
    )
    const f = lastFrame() ?? ""
    expect(f).toContain("print(1)")
    expect(f).toContain("hi")
    expect(f).not.toContain("**hi**")
  })

  test("bullets render with a dot", () => {
    const { lastFrame } = render(React.createElement(MessageBody, { text: "- first\n- second", color: "white" }))
    expect(lastFrame() ?? "").toContain("• first")
  })
})
