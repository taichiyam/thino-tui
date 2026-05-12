import { describe, expect, test } from "bun:test"
import { parseMemoLine } from "../../src/lib/memo"

const ctx = { filePath: "/v/2026-05-12.md", lineNumber: 3, date: "2026-05-12" }

describe("parseMemoLine", () => {
  test("[正常] `- HH:MM 本文` から Memo が組み立てられる", () => {
    const m = parseMemoLine("- 09:14 朝のタスク報告", ctx)
    expect(m).toEqual({
      id: "/v/2026-05-12.md#L3",
      time: "09:14",
      date: "2026-05-12",
      text: "朝のタスク報告",
      filePath: "/v/2026-05-12.md",
      lineNumber: 3,
      isTask: false,
    })
  })

  test("[正常] `- [ ] HH:MM 本文` は isTask=true でパースされる", () => {
    const m = parseMemoLine("- [ ] 11:24 タスクメモ", ctx)
    expect(m?.isTask).toBe(true)
    expect(m?.time).toBe("11:24")
    expect(m?.text).toBe("タスクメモ")
  })

  test("[異常] 行頭が `- HH:MM` でない行は null を返す", () => {
    expect(parseMemoLine("# 2026-05-12", ctx)).toBeNull()
    expect(parseMemoLine("普通の段落", ctx)).toBeNull()
    expect(parseMemoLine("- メモ", ctx)).toBeNull()
    expect(parseMemoLine("- 25:00 invalid", ctx)).toBeNull()
  })
})
