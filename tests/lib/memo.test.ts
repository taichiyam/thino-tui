import { describe, expect, test } from "bun:test"
import { parseMemoLine, parseContinuation, formatMemoBlock } from "../../src/lib/memo"

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

  test("[正常] 本文なしの `- HH:MM` は text='' で Memo になる(複数行メモのヘッダ)", () => {
    const m = parseMemoLine("- 12:55", ctx)
    expect(m?.time).toBe("12:55")
    expect(m?.text).toBe("")
    expect(m?.isTask).toBe(false)
  })

  test("[正常] 本文なしの `- [ ] HH:MM` も text='' のタスクとしてパースされる", () => {
    const m = parseMemoLine("- [ ] 12:55", ctx)
    expect(m?.isTask).toBe(true)
    expect(m?.text).toBe("")
  })

  test("[異常] 行頭が `- HH:MM` でない行は null を返す", () => {
    expect(parseMemoLine("# 2026-05-12", ctx)).toBeNull()
    expect(parseMemoLine("普通の段落", ctx)).toBeNull()
    expect(parseMemoLine("- メモ", ctx)).toBeNull()
    expect(parseMemoLine("- 25:00 invalid", ctx)).toBeNull()
  })
})

describe("parseContinuation", () => {
  test("[正常] 2スペース字下げの行は本文だけ取り出される", () => {
    expect(parseContinuation("  複数行は")).toBe("複数行は")
    expect(parseContinuation("    深い字下げ")).toBe("  深い字下げ")
  })

  test("[正常] 字下げのみで本文が空の行は空文字を返す", () => {
    expect(parseContinuation("  ")).toBe("")
  })

  test("[異常] 字下げが1スペース以下の行は null", () => {
    expect(parseContinuation(" 1スペースのみ")).toBeNull()
    expect(parseContinuation("字下げ無し")).toBeNull()
    expect(parseContinuation("")).toBeNull()
  })
})

describe("formatMemoBlock", () => {
  test("[正常] 単一行は `- HH:MM 本文` 形式", () => {
    expect(formatMemoBlock("popopo", "12:55", false)).toBe("- 12:55 popopo")
  })

  test("[正常] 複数行はヘッダのみ + 字下げ継続行 (Thino表示と一致)", () => {
    const block = formatMemoBlock("複数行は\nこう見える", "12:55", false)
    expect(block).toBe("- 12:55\n  複数行は\n  こう見える")
  })

  test("[正常] タスク形式でも複数行をサポート", () => {
    const block = formatMemoBlock("やる\nもう一つ", "07:00", true)
    expect(block).toBe("- [ ] 07:00\n  やる\n  もう一つ")
  })
})
