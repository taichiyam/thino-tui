import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { DailyNotesConfig } from "./daily-notes-config"

export class TemplaterAbortError extends Error {
  constructor(templatePath: string) {
    super(
      `テンプレート (${templatePath}) に Templater 構文 (<% %>) が含まれています。` +
        `Obsidian を起動した状態でメモを追加してください。`,
    )
    this.name = "TemplaterAbortError"
  }
}

export type NewNoteResult = { tier: 1 | 2; headerLineNumber: number }

const OBSIDIAN_CLI_CANDIDATES = ["/Applications/Obsidian.app/Contents/MacOS/obsidian-cli"]

export function findObsidianCli(): string | null {
  for (const c of OBSIDIAN_CLI_CANDIDATES) {
    if (existsSync(c)) return c
  }
  return null
}

export function isObsidianRunning(): boolean {
  try {
    const r = Bun.spawnSync(["pgrep", "-x", "Obsidian"])
    return r.exitCode === 0
  } catch {
    return false
  }
}

export function hasTemplaterSyntax(content: string): boolean {
  return content.includes("<%")
}

export function expandCorePlaceholders(content: string, date: string): string {
  const parts = date.split("-").map(Number)
  const y = parts[0] ?? 0
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")

  const format = (fmt: string): string =>
    fmt
      .replace("YYYY", String(y))
      .replace("MM", pad(m))
      .replace("DD", pad(d))
      .replace("HH", pad(now.getHours()))
      .replace("mm", pad(now.getMinutes()))

  return content
    .replace(/\{\{date(?::([^}]+))?\}\}/g, (_, fmt) => (fmt ? format(fmt) : date))
    .replace(/\{\{time\}\}/g, `${pad(now.getHours())}:${pad(now.getMinutes())}`)
    .replace(/\{\{title\}\}/g, date)
}

function resolveTemplate(vaultPath: string, templateRelPath: string): string | null {
  if (!templateRelPath) return null
  const withExt = templateRelPath.endsWith(".md") ? templateRelPath : `${templateRelPath}.md`
  const full = join(vaultPath, withExt)
  if (!existsSync(full)) return null
  return readFileSync(full, "utf-8")
}

function countLinesInString(content: string): number {
  if (content === "") return 0
  const newlines = (content.match(/\r?\n/g) ?? []).length
  return content.endsWith("\n") ? newlines : newlines + 1
}

export function writeNewDailyNote(
  path: string,
  vaultPath: string,
  date: string,
  cfg: DailyNotesConfig,
  text: string,
  block: string,
  asTask: boolean,
): NewNoteResult {
  const cliPath = findObsidianCli()

  // Tier 1: obsidian-cli available + Obsidian process running
  if (cliPath !== null && isObsidianRunning()) {
    const args = [cliPath, "thino", "add", `content=${text}`]
    if (asTask) args.push("type=TASK")
    const r = Bun.spawnSync(args)
    if (r.exitCode === 0) {
      if (existsSync(path)) {
        const lines = readFileSync(path, "utf-8").split(/\r?\n/)
        const reversedIdx = [...lines].reverse().findIndex((l) => l.startsWith("- "))
        const headerLineNumber = reversedIdx >= 0 ? lines.length - reversedIdx : 1
        return { tier: 1, headerLineNumber }
      }
      return { tier: 1, headerLineNumber: 1 }
    }
    // CLI call failed; fall through to Tier 2/3
  }

  // Resolve template content
  const templateContent = resolveTemplate(vaultPath, cfg.template)

  // Tier 3: template has Templater syntax → abort without creating file
  if (templateContent !== null && hasTemplaterSyntax(templateContent)) {
    const withExt = cfg.template.endsWith(".md") ? cfg.template : `${cfg.template}.md`
    throw new TemplaterAbortError(join(vaultPath, withExt))
  }

  // Tier 2: safe template → copy + expand placeholders + append block
  if (templateContent !== null && templateContent !== "") {
    const expanded = expandCorePlaceholders(templateContent, date)
    const prefix = expanded.endsWith("\n") ? expanded : `${expanded}\n`
    writeFileSync(path, `${prefix}${block}\n`)
    return { tier: 2, headerLineNumber: countLinesInString(prefix) + 1 }
  }

  // No template (or template file not found): bare file — original behavior
  writeFileSync(path, `${block}\n`)
  return { tier: 2, headerLineNumber: 1 }
}
