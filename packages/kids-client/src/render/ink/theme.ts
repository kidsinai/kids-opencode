/**
 * Kid-warm color tokens. Hand-tuned to satisfy WCAG AA on most terminals
 * with dark backgrounds. High-contrast variant available via $KIDS_HC=1.
 *
 * Sourced conceptually from kids-tui-plugin/themes/kids-warm.json but
 * inlined here because Ink consumes raw ANSI/chalk color names, not
 * opentui theme JSON.
 */

export interface Theme {
  fg: string
  bg: string
  fgDim: string
  accent: string
  warn: string
  danger: string
  success: string
  agent: string
  kid: string
  system: string
  border: string
  stars: string
}

const DEFAULT: Theme = {
  fg: "white",
  bg: "black",
  fgDim: "gray",
  accent: "yellow",
  warn: "yellow",
  danger: "red",
  success: "green",
  agent: "cyan",
  kid: "magenta",
  system: "blueBright",
  border: "yellow",
  stars: "yellowBright",
}

const HIGH_CONTRAST: Theme = {
  fg: "whiteBright",
  bg: "black",
  fgDim: "white",
  accent: "yellowBright",
  warn: "yellowBright",
  danger: "redBright",
  success: "greenBright",
  agent: "cyanBright",
  kid: "magentaBright",
  system: "blueBright",
  border: "whiteBright",
  stars: "yellowBright",
}

export function getTheme(): Theme {
  if (process.env.KIDS_HC === "1") return HIGH_CONTRAST
  return DEFAULT
}
