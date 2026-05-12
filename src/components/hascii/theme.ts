import { z } from "zod"
import tokens from "@/components/hascii/tokens.json"

const HEX = /^#[0-9a-fA-F]{6}$/

const TokensSchema = z.object({
  theme: z.object({
    extend: z.object({
      colors: z.object({
        background: z.string().regex(HEX),
        foreground: z.string().regex(HEX),
        primary: z.string().regex(HEX),
        "primary-foreground": z.string().regex(HEX),
        "primary-hover": z.string().regex(HEX),
        "primary-active": z.string().regex(HEX),
        secondary: z.string().regex(HEX),
        "secondary-foreground": z.string().regex(HEX),
        "secondary-hover": z.string().regex(HEX),
        "secondary-active": z.string().regex(HEX),
        card: z.string().regex(HEX),
        "card-foreground": z.string().regex(HEX),
        popover: z.string().regex(HEX),
        "popover-foreground": z.string().regex(HEX),
        muted: z.string().regex(HEX),
        "muted-foreground": z.string().regex(HEX),
        accent: z.string().regex(HEX),
        "accent-foreground": z.string().regex(HEX),
        "accent-hover": z.string().regex(HEX),
        "accent-active": z.string().regex(HEX),
        destructive: z.string().regex(HEX),
        "destructive-foreground": z.string().regex(HEX),
        "destructive-hover": z.string().regex(HEX),
        "destructive-active": z.string().regex(HEX),
        border: z.string().regex(HEX),
        input: z.string().regex(HEX),
        ring: z.string().regex(HEX),
        "hover-active": z.string().regex(HEX),
      }),
    }),
  }),
})

const parsed = TokensSchema.parse(tokens)
const c = parsed.theme.extend.colors

export type HasciiTheme = {
  color: {
    background: string
    foreground: string

    primary: string
    primaryForeground: string
    primaryHover: string
    primaryActive: string

    secondary: string
    secondaryForeground: string
    secondaryHover: string
    secondaryActive: string

    card: string
    cardForeground: string

    popover: string
    popoverForeground: string

    muted: string
    mutedForeground: string

    accent: string
    accentForeground: string
    accentHover: string
    accentActive: string

    destructive: string
    destructiveForeground: string
    destructiveHover: string
    destructiveActive: string

    border: string
    input: string
    ring: string

    hoverActive: string
  }
}

/** Default dark theme. Tokens are loaded from tokens.json (generated from DESIGN.md by `make tokens`) and validated with zod. */
export const hasciiTheme: HasciiTheme = {
  color: {
    background: c.background,
    foreground: c.foreground,

    primary: c.primary,
    primaryForeground: c["primary-foreground"],
    primaryHover: c["primary-hover"],
    primaryActive: c["primary-active"],

    secondary: c.secondary,
    secondaryForeground: c["secondary-foreground"],
    secondaryHover: c["secondary-hover"],
    secondaryActive: c["secondary-active"],

    card: c.card,
    cardForeground: c["card-foreground"],

    popover: c.popover,
    popoverForeground: c["popover-foreground"],

    muted: c.muted,
    mutedForeground: c["muted-foreground"],

    accent: c.accent,
    accentForeground: c["accent-foreground"],
    accentHover: c["accent-hover"],
    accentActive: c["accent-active"],

    destructive: c.destructive,
    destructiveForeground: c["destructive-foreground"],
    destructiveHover: c["destructive-hover"],
    destructiveActive: c["destructive-active"],

    border: c.border,
    input: c.input,
    ring: c.ring,

    hoverActive: c["hover-active"],
  },
}
