#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { resolveVaultPath } from "./lib/obsidian-config"
import { readThinoConfig } from "./lib/thino-config"
import { App, type AppContextValue } from "./app"

type CliArgs = {
  vault?: string
  days?: number
  readOnly: boolean
  help: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { readOnly: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--vault") {
      i++
      args.vault = argv[i]
    } else if (a === "--days") {
      i++
      const v = argv[i]
      if (v) args.days = Number(v)
    } else if (a === "--read-only") {
      args.readOnly = true
    } else if (a === "--help" || a === "-h") {
      args.help = true
    }
  }
  return args
}

function printHelp() {
  console.log(`thino-tui — Obsidian Thino memos in your terminal

USAGE:
  thino-tui [--vault PATH] [--days N] [--read-only]

OPTIONS:
  --vault PATH    Path to the Obsidian vault. If omitted, auto-detected from
                  Obsidian's own vault list (no setup needed once you have
                  opened a vault in Obsidian). Falls back to $OBSIDIAN_VAULT.
  --days N        How many past days to list (default: 7)
  --read-only     Disable compose
  -h, --help      Show this help
`)
}

function todayJST(): string {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

function nowJSTHHMM(): string {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(11, 16)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  let vaultPath: string
  try {
    vaultPath = resolveVaultPath({ flag: args.vault })
  } catch (e) {
    console.error(`thino-tui: ${e instanceof Error ? e.message : String(e)}`)
    process.exit(1)
  }

  const thinoConfig = readThinoConfig(vaultPath)
  const readOnly = args.readOnly || thinoConfig.mode !== "DAILY"

  const ctx: Omit<AppContextValue, "requestExit"> = {
    vaultPath,
    thinoConfig,
    days: args.days && Number.isFinite(args.days) ? args.days : 7,
    readOnly,
    today: todayJST,
    nowHHMM: nowJSTHHMM,
  }

  const renderer = await createCliRenderer()

  const requestExit = () => {
    renderer.destroy()
    process.exit(0)
  }

  createRoot(renderer).render(<App {...ctx} requestExit={requestExit} />)
}

main()
