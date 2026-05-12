export type Memo = {
  id: string
  time: string
  date: string
  text: string
  filePath: string
  lineNumber: number
  isTask: boolean
}

export type ParseContext = {
  filePath: string
  lineNumber: number
  date: string
}

const MEMO_RE = /^-\s+(?:\[\s\]\s+)?(\d{2}):(\d{2})\s+(.+?)\s*$/
const TASK_RE = /^-\s+\[\s\]\s+\d{2}:\d{2}\s/

export function parseMemoLine(line: string, ctx: ParseContext): Memo | null {
  const match = line.match(MEMO_RE)
  if (!match) return null
  const [, hh, mm, body] = match
  if (hh === undefined || mm === undefined || body === undefined) return null
  const hour = Number(hh)
  const minute = Number(mm)
  if (hour > 23 || minute > 59) return null
  return {
    id: `${ctx.filePath}#L${ctx.lineNumber}`,
    time: `${hh}:${mm}`,
    date: ctx.date,
    text: body,
    filePath: ctx.filePath,
    lineNumber: ctx.lineNumber,
    isTask: TASK_RE.test(line),
  }
}
