import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { readDailyNotesConfig, type DailyNotesConfig } from "./daily-notes-config"
import { parseMemoLine, parseContinuation, formatMemoBlock, type Memo } from "./memo"

export type MemoRepoOptions = {
  vaultPath: string
  today: string
  days: number
}

export type AppendOptions = {
  time: string
  asTask?: boolean
}

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

function countLines(content: string): number {
  if (content === "") return 0
  const newlines = (content.match(/\r?\n/g) ?? []).length
  return content.endsWith("\n") ? newlines : newlines + 1
}

function collectMemos(lines: string[], filePath: string, date: string): Memo[] {
  const memos: Memo[] = []
  let header: Memo | null = null
  let bodyLines: string[] = []

  const finalize = () => {
    if (!header) return
    if (bodyLines.length > 0) {
      const combined = header.text
        ? [header.text, ...bodyLines].join("\n")
        : bodyLines.join("\n")
      memos.push({ ...header, text: combined })
    } else {
      memos.push(header)
    }
    header = null
    bodyLines = []
  }

  lines.forEach((line, idx) => {
    const m = parseMemoLine(line, { filePath, lineNumber: idx + 1, date })
    if (m) {
      finalize()
      header = m
      return
    }
    if (header) {
      const cont = parseContinuation(line)
      if (cont !== null) {
        bodyLines.push(cont)
        return
      }
      finalize()
    }
  })
  finalize()
  return memos
}

export function listDailyNotePaths(opts: MemoRepoOptions): string[] {
  const cfg = readDailyNotesConfig(opts.vaultPath)
  const paths: string[] = []
  for (let i = 0; i < opts.days; i++) {
    const date = shiftDate(opts.today, -i)
    const path = dailyNotePath(opts.vaultPath, date, cfg)
    if (existsSync(path)) paths.push(path)
  }
  return paths
}

export function listMemos(opts: MemoRepoOptions): Memo[] {
  const cfg = readDailyNotesConfig(opts.vaultPath)
  const memos: Memo[] = []
  for (let i = 0; i < opts.days; i++) {
    const date = shiftDate(opts.today, -i)
    const path = dailyNotePath(opts.vaultPath, date, cfg)
    if (!existsSync(path)) continue
    const lines = readFileSync(path, "utf-8").split(/\r?\n/)
    memos.push(...collectMemos(lines, path, date))
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
  const asTask = append.asTask ?? false
  const block = formatMemoBlock(text, append.time, asTask)

  let headerLineNumber = 1
  withRetrySync(() => {
    mkdirSync(dirname(path), { recursive: true })
    if (!existsSync(path)) {
      writeFileSync(path, `${block}\n`)
      headerLineNumber = 1
      return
    }
    const current = readFileSync(path, "utf-8")
    const needsNewline = current.length > 0 && !current.endsWith("\n")
    appendFileSync(path, `${needsNewline ? "\n" : ""}${block}\n`)
    headerLineNumber = countLines(current) + 1
  })

  return {
    id: `${path}#L${headerLineNumber}`,
    time: append.time,
    date: opts.today,
    text,
    filePath: path,
    lineNumber: headerLineNumber,
    isTask: asTask,
  }
}

export const _internal = { isRetryable, withRetrySync, MAX_RETRIES, RETRY_DELAY_MS }
