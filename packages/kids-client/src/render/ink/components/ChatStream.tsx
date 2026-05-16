import React from "react"
import { Box, Static, Text } from "ink"
import { getTheme } from "../theme.ts"
import type { ChatMessage } from "../../../core/store.ts"

interface ChatStreamProps {
  messages: ChatMessage[]
}

export function ChatStream({ messages }: ChatStreamProps): React.ReactElement {
  const theme = getTheme()
  if (messages.length === 0) return <Box />
  // Settled messages go into <Static> so Ink doesn't re-render the entire
  // history every delta. The active streaming message (if any) renders
  // below in the live region.
  const finished = messages.filter((m) => !m.streaming)
  const active = messages.find((m) => m.streaming)
  return (
    <Box flexDirection="column">
      <Static items={finished}>
        {(m) => (
          <Box key={m.id} flexDirection="row" marginBottom={1}>
            <ActorBadge actor={m.actor} />
            <Box flexDirection="column" flexGrow={1}>
              <Text color={colorFor(m.actor, theme)}>{m.text || " "}</Text>
            </Box>
          </Box>
        )}
      </Static>
      {active && (
        <Box flexDirection="row" marginBottom={1}>
          <ActorBadge actor={active.actor} />
          <Box flexDirection="column" flexGrow={1}>
            <Text color={colorFor(active.actor, theme)}>{active.text || " "}</Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}

function ActorBadge({ actor }: { actor: ChatMessage["actor"] }): React.ReactElement {
  const theme = getTheme()
  const emoji = actor === "kid" ? "👦" : actor === "agent" ? "🤖" : "⚙️"
  const color = colorFor(actor, theme)
  return (
    <Box marginRight={1}>
      <Text color={color}>{emoji}</Text>
    </Box>
  )
}

function colorFor(actor: ChatMessage["actor"], theme: ReturnType<typeof getTheme>): string {
  switch (actor) {
    case "kid":
      return theme.kid
    case "agent":
      return theme.agent
    case "system":
      return theme.system
  }
}
