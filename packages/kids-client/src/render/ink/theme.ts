/**
 * Kid-warm color tokens. Three themes, picked automatically based on the
 * terminal's background color (white-bg macOS Terminal vs dark-bg iTerm2
 * vs anything we can't infer).
 *
 * Pick order:
 *   1. KIDS_THEME=dark|light|hc  (explicit override; wins)
 *   2. KIDS_HC=1                 (legacy flag, maps to "hc")
 *   3. COLORFGBG env var         (terminal hint; "fg;bg" — macOS Terminal,
 *                                  iTerm2, VS Code, gnome-terminal all set this)
 *   4. fallback                  : "dark"
 *
 * Logo colors (logoK/I/D/S) are part of the theme so KidsLogo doesn't
 * have to know which terminal it's on.
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
  // Kids OpenCode brand mark, per-letter
  logoK: string
  logoI: string
  logoD: string
  logoS: string
}

/** Default — vibrant on a dark terminal. */
const DARK: Theme = {
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
  logoK: "cyanBright",
  logoI: "yellow",
  logoD: "greenBright",
  logoS: "magentaBright",
}

/**
 * Light terminal (macOS Terminal.app default, light VS Code, etc.).
 * Avoids Bright variants — they wash out to near-invisible on white.
 * Uses non-Bright ANSI codes (33/32/36/35) which most terminals render
 * as darker shades that hold contrast against white.
 */
const LIGHT: Theme = {
  fg: "black",
  bg: "white",
  fgDim: "blackBright",   // dark gray — still readable on white
  accent: "magenta",       // not yellow/cyan, those wash out
  warn: "red",             // yellow text is unreadable on white
  danger: "red",
  success: "green",
  agent: "blue",           // not cyan
  kid: "magenta",
  system: "blue",
  border: "blackBright",   // medium gray frame
  stars: "yellow",         // ANSI 33 = olive/brown on white = "gold-ish"
  logoK: "blue",           // brand K — blue instead of teal
  logoI: "yellow",         // olive on white, readable
  logoD: "green",          // dark green
  logoS: "magenta",        // dark magenta
}

/** High-contrast on dark — for poor-vision / low-light. */
const HC: Theme = {
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
  logoK: "cyanBright",
  logoI: "yellowBright",
  logoD: "greenBright",
  logoS: "magentaBright",
}

export type ThemeKind = "dark" | "light" | "hc"

export function resolveThemeKind(): ThemeKind {
  // 1. Explicit env var
  const explicit = (process.env.KIDS_THEME ?? "").toLowerCase()
  if (explicit === "dark" || explicit === "light" || explicit === "hc") return explicit
  // 2. Legacy flag
  if (process.env.KIDS_HC === "1") return "hc"
  // 3. COLORFGBG terminal hint
  const detected = detectFromColorFgBg(process.env.COLORFGBG)
  if (detected) return detected
  // 4. Fallback
  return "dark"
}

export function getTheme(): Theme {
  const kind = resolveThemeKind()
  if (kind === "light") return LIGHT
  if (kind === "hc") return HC
  return DARK
}

/**
 * Parse the COLORFGBG env var. Format: "fg;bg" or "fg;default;bg" — a
 * semicolon-separated list where the LAST field is the background color
 * code (ANSI 0-15). 0-6 are dark; 7 is light gray; 8 is "bright black"
 * (dark gray); 9-14 are bright dark-family; 15 is bright white.
 *
 * Empirically: macOS Terminal.app sets COLORFGBG=0;15 in light mode and
 * 15;0 in Pro/Homebrew dark themes. iTerm2 mirrors. VS Code's integrated
 * terminal also sets it.
 *
 * We treat 7 (light gray) and 15 (white) as "light"; everything else
 * (incl. 8 dark-gray) as dark. Some terminals send "default" instead of
 * a digit — we return null and let the caller fall through.
 */
export function detectFromColorFgBg(raw: string | undefined): ThemeKind | null {
  if (!raw) return null
  const parts = raw.split(";").map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return null
  const bgStr = parts[parts.length - 1]!
  if (bgStr === "default") return null
  const bg = Number.parseInt(bgStr, 10)
  if (!Number.isFinite(bg)) return null
  if (bg === 7 || bg === 15) return "light"
  return "dark"
}
