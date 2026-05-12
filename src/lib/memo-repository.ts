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

// File-system error codes that warrant a retry on iCloud Drive,
// where the sync agent can briefly hold the file open.
const RETRYABLE_CODES = new Set(["EBUSY", "EAGAIN", "EACCES", "EPERM"])
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 200

function isRetryable(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | undefined)?.code
  return code !== undefined && RETRYABLE_CODES.has(code)
}

function withRetrySync<T>(fn: () => T): T {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return fn()
    } catch (err) {
      if (!isRetryable(err)) throw err
      lastError = err
      if (attempt < MAX_RETRIES) Bun.sleepSync(RETRY_DELAY_MS)
    }
  }
  throw lastError
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
  const prefix = append.asTask ? `- [ ] ${append.time} ` : `- ${append.time} `
  const line = `${prefix}${text}`

  withRetrySync(() => {
    mkdirSync(dirname(path), { recursive: true })
    if (!existsSync(path)) {
      writeFileSync(path, `${line}\n`)
      return
    }
    const current = readFileSync(path, "utf-8")
    const needsNewline = current.length > 0 && !current.endsWith("\n")
    appendFileSync(path, `${needsNewline ? "\n" : ""}${line}\n`)
  })

  const lineCount = readFileSync(path, "utf-8").split(/\r?\n/).length - 1
  const memo = parseMemoLine(line, { filePath: path, lineNumber: lineCount, date: opts.today })
  if (!memo) throw new Error(`appended line failed to parse: ${line}`)
  return memo
}

// Exposed for unit testing the retry logic.
export const _internal = { isRetryable, withRetrySync, MAX_RETRIES, RETRY_DELAY_MS }
