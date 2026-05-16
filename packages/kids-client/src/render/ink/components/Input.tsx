import React from "react"
import { Box, Text } from "ink"
import TextInput from "ink-text-input"
import { getTheme } from "../theme.ts"

interface InputProps {
  value: string
  onChange: (v: string) => void
  onSubmit: (v: string) => void
  placeholder: string
  disabled?: boolean
}

export function Input({ value, onChange, onSubmit, placeholder, disabled }: InputProps): React.ReactElement {
  const theme = getTheme()
  return (
    <Box borderStyle="single" borderColor={theme.fgDim} paddingX={1}>
      <Text color={theme.kid}>💬 </Text>
      {disabled ? (
        <Text color={theme.fgDim} dimColor>
          {value || placeholder}
        </Text>
      ) : (
        <TextInput value={value} onChange={onChange} onSubmit={onSubmit} placeholder={placeholder} />
      )}
    </Box>
  )
}
