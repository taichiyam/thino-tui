import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { readDailyNotesConfig, type DailyNotesConfig } from "./daily-notes-config"
import { parseMemoLine, type Memo } from "./memo"

export type MemoRepoOptions = {
  vaultPath: string
  today: string
  days: number
}

export type AppendOptions = {
  time: string
  asTask?: boolean
}

function shiftDate(yyyymmdd: string, deltaDays: number): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number)
  if (!y || !m || !d) throw new Error(`invalid date: ${yyyymmdd}`)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + deltaDays)
  return dt.toISOString().slice(0, 10)
}

function dailyNotePath(vaultPath: string, date: string, cfg: DailyNotesConfig): string {
  const folder = cfg.folder ? join(vaultPath, cfg.folder) : vaultPath
  return join(folder, `${date}.md`)
}

export function listMemos(opts: MemoRepoOptions): Memo[] {
  const cfg = readDailyNotesConfig(opts.vaultPath)
  const memos: Memo[] = []
  for (let i = 0; i < opts.days; i++) {
    const date = shiftDate(opts.today, -i)
    const path = dailyNotePath(opts.vaultPath, date, cfg)
    if (!existsSync(path)) continue
    const lines = readFileSync(path, "utf-8").split(/\r?\n/)
    lines.forEach((line, idx) => {
      const m = parseMemoLine(line, { filePath: path, lineNumber: idx + 1, date })
      if (m) memos.push(m)
    })
  }
  memos.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.time < b.time ? 1 : -1
  })
  return memos
}

export function appendMemo(text: string, append: AppendOptions, opts: MemoRepoOptions): Memo {
  const cfg = readDailyNotesConfig(opts.vaultPath)
  const path = dailyNotePath(opts.vaultPath, opts.today, cfg)
  mkdirSync(dirname(path), { recursive: true })
  const prefix = append.asTask ? `- [ ] ${append.time} ` : `- ${append.time} `
  const line = `${prefix}${text}`
  if (!existsSync(path)) {
    writeFileSync(path, `${line}\n`)
  } else {
    const current = readFileSync(path, "utf-8")
    const needsNewline = current.length > 0 && !current.endsWith("\n")
    appendFileSync(path, `${needsNewline ? "\n" : ""}${line}\n`)
  }
  const lineCount = readFileSync(path, "utf-8").split(/\r?\n/).length - 1
  const memo = parseMemoLine(line, { filePath: path, lineNumber: lineCount, date: opts.today })
  if (!memo) throw new Error(`appended line failed to parse: ${line}`)
  return memo
}
