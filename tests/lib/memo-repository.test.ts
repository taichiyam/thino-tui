import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { listMemos, appendMemo, type MemoRepoOptions } from "../../src/lib/memo-repository"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const FIXTURE = join(import.meta.dir, "..", "fixtures", "vault")

function makeTempVault(): string {
  const dir = mkdtempSync(join(tmpdir(), "thino-tui-"))
  mkdirSync(join(dir, ".obsidian"), { recursive: true })
  writeFileSync(
    join(dir, ".obsidian", "daily-notes.json"),
    JSON.stringify({ folder: "", format: "YYYY-MM-DD", template: "" }),
  )
  return dir
}

describe("listMemos", () => {
  test("[正常] 直近のメモが新しい日付・新しい時刻順で返る", () => {
    const memos = listMemos({ vaultPath: FIXTURE, today: "2026-05-12", days: 7 })
    expect(memos.length).toBe(5)
    expect(memos[0]?.date).toBe("2026-05-12")
    expect(memos[0]?.time).toBe("11:24")
    expect(memos[memos.length - 1]?.date).toBe("2026-05-11")
    expect(memos[memos.length - 1]?.time).toBe("15:03")
  })

  test("[正常] 存在しない日付のファイルはスキップされる", () => {
    const memos = listMemos({ vaultPath: FIXTURE, today: "2030-01-01", days: 3 })
    expect(memos).toEqual([])
  })
})

describe("appendMemo", () => {
  let vault: string
  beforeEach(() => {
    vault = makeTempVault()
  })
  afterEach(() => {
    rmSync(vault, { recursive: true, force: true })
  })

  test("[正常] 当日のデイリーノートに行が追記される", () => {
    const opts: MemoRepoOptions = { vaultPath: vault, today: "2026-05-12", days: 7 }
    appendMemo("最初のメモ", { time: "12:00" }, opts)
    appendMemo("二つ目", { time: "12:30" }, opts)
    const body = readFileSync(join(vault, "2026-05-12.md"), "utf-8")
    expect(body.trim().split("\n")).toEqual([
      "- 12:00 最初のメモ",
      "- 12:30 二つ目",
    ])
  })

  test("[正常] ファイル不在時にファイル新規作成して追記される", () => {
    appendMemo("新規日付メモ", { time: "09:00" }, {
      vaultPath: vault, today: "2026-06-01", days: 7,
    })
    expect(existsSync(join(vault, "2026-06-01.md"))).toBe(true)
    expect(readFileSync(join(vault, "2026-06-01.md"), "utf-8")).toBe("- 09:00 新規日付メモ\n")
  })

  test("[正常] asTask=true で `- [ ] HH:MM 本文` の形式になる", () => {
    appendMemo("やること", { time: "07:00", asTask: true }, {
      vaultPath: vault, today: "2026-05-13", days: 7,
    })
    expect(readFileSync(join(vault, "2026-05-13.md"), "utf-8")).toBe("- [ ] 07:00 やること\n")
  })
})
