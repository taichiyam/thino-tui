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

const MEMO_HEADER_RE = /^-\s+(\[\s\]\s+)?(\d{2}):(\d{2})(?:\s+(.+?))?\s*$/
const CONTINUATION_INDENT = "  "
const CONTINUATION_RE = /^ {2}(.*)$/

export function parseMemoLine(line: string, ctx: ParseContext): Memo | null {
  const match = line.match(MEMO_HEADER_RE)
  if (!match) return null
  const [, taskMarker, hh, mm, body] = match
  if (hh === undefined || mm === undefined) return null
  const hour = Number(hh)
  const minute = Number(mm)
  if (hour > 23 || minute > 59) return null
  return {
    id: `${ctx.filePath}#L${ctx.lineNumber}`,
    time: `${hh}:${mm}`,
    date: ctx.date,
    text: body ?? "",
    filePath: ctx.filePath,
    lineNumber: ctx.lineNumber,
    isTask: !!taskMarker,
  }
}

export function parseContinuation(line: string): string | null {
  const match = line.match(CONTINUATION_RE)
  return match ? (match[1] ?? "") : null
}

export function formatMemoBlock(text: string, time: string, asTask: boolean): string {
  const prefix = asTask ? `- [ ] ${time}` : `- ${time}`
  const lines = text.split(/\r?\n/)
  if (lines.length === 1) return `${prefix} ${lines[0]}`
  return [prefix, ...lines.map((l) => `${CONTINUATION_INDENT}${l}`)].join("\n")
}
