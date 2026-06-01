import React from "react"
import { Box, Static, Text } from "ink"
import { getTheme } from "../theme.ts"
import { MessageBody } from "./MessageBody.tsx"
import type { ChatMessage } from "../../../core/store.ts"

interface ChatStreamProps {
  messages: ChatMessage[]
}

/** Agent text gets markdown/code rendering; kid + system stay plain. */
function MessageText({ m }: { m: ChatMessage }): React.ReactElement {
  const theme = getTheme()
  const color = colorFor(m.actor, theme)
  if (m.actor === "agent") return <MessageBody text={m.text || " "} color={color} />
  return <Text color={color}>{m.text || " "}</Text>
}

export function ChatStream({ messages }: ChatStreamProps): React.ReactElement {
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
              <MessageText m={m} />
            </Box>
          </Box>
        )}
      </Static>
      {active && (
        <Box flexDirection="row" marginBottom={1}>
          <ActorBadge actor={active.actor} />
          <Box flexDirection="column" flexGrow={1}>
            <MessageText m={active} />
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
