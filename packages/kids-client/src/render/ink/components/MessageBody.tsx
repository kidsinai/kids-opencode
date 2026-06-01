/**
 * Lightweight markdown-ish renderer for the AI's chat messages — no heavy dep.
 * Handles the things a kid actually sees from a coding mentor:
 *   - fenced ```code``` blocks (incl. an unterminated one while streaming)
 *   - headings (#, ##), bullet lists (-, *), and inline **bold** / `code`
 * Everything else renders as plain wrapped text. Kid/system messages stay plain
 * (they don't author markdown); only agent text is enriched.
 */

import React from "react"
import { Box, Text } from "ink"
import { getTheme } from "../theme.ts"

type Theme = ReturnType<typeof getTheme>

export interface Block {
  type: "code" | "text"
  /** code language label (may be ""); unused for text blocks. */
  lang?: string
  content: string
}

/** Split message text into fenced-code vs prose blocks. */
export function splitBlocks(text: string): Block[] {
  const lines = text.split("\n")
  const blocks: Block[] = []
  let mode: "text" | "code" = "text"
  let buf: string[] = []
  let lang = ""
  const flush = (type: "code" | "text"): void => {
    if (buf.length === 0 && type === "text") return
    blocks.push({ type, lang: type === "code" ? lang : undefined, content: buf.join("\n") })
    buf = []
  }
  for (const line of lines) {
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      if (mode === "text") { flush("text"); mode = "code"; lang = fence[1] ?? "" }
      else { flush("code"); mode = "text"; lang = "" }
      continue
    }
    buf.push(line)
  }
  // Unterminated fence while streaming → keep what we have as a code block.
  flush(mode)
  return blocks
}

/** Parse inline **bold** and `code` into Ink <Text> spans. */
export function renderInline(line: string, theme: Theme, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push(<Text key={`${keyPrefix}-t${i}`}>{line.slice(last, m.index)}</Text>)
    if (m[2] !== undefined) out.push(<Text key={`${keyPrefix}-b${i}`} bold>{m[2]}</Text>)
    else if (m[3] !== undefined) out.push(<Text key={`${keyPrefix}-c${i}`} color={theme.accent}>{m[3]}</Text>)
    last = m.index + m[0].length
    i++
  }
  if (last < line.length) out.push(<Text key={`${keyPrefix}-t${i}`}>{line.slice(last)}</Text>)
  if (out.length === 0) out.push(<Text key={`${keyPrefix}-empty`}> </Text>)
  return out
}

export function MessageBody({ text, color }: { text: string; color: string }): React.ReactElement {
  const theme = getTheme()
  const blocks = splitBlocks(text)
  return (
    <Box flexDirection="column">
      {blocks.map((b, bi) => {
        if (b.type === "code") {
          return (
            <Box key={`code-${bi}`} flexDirection="column" borderStyle="round" borderColor={theme.fgDim} paddingX={1}>
              {b.lang ? <Text color={theme.fgDim} dimColor>{b.lang}</Text> : null}
              {(b.content || " ").split("\n").map((l, li) => (
                <Text key={li} color={theme.success}>{l || " "}</Text>
              ))}
            </Box>
          )
        }
        return (
          <Box key={`text-${bi}`} flexDirection="column">
            {b.content.split("\n").map((line, li) => {
              const key = `${bi}-${li}`
              const heading = line.match(/^(#{1,3})\s+(.*)$/)
              if (heading) return <Text key={key} color={theme.accent} bold>{heading[2]}</Text>
              const bullet = line.match(/^\s*[-*]\s+(.*)$/)
              if (bullet) return <Text key={key} color={color}>{"• "}{renderInline(bullet[1] ?? "", theme, key)}</Text>
              return <Text key={key} color={color}>{renderInline(line, theme, key)}</Text>
            })}
          </Box>
        )
      })}
    </Box>
  )
}
