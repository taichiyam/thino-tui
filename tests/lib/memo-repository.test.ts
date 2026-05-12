import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { listMemos, appendMemo, _internal, type MemoRepoOptions } from "../../src/lib/memo-repository"
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

  test("[正常] 複数行メモは Thino形式(ヘッダ+字下げ継続行) で保存される", () => {
    const opts: MemoRepoOptions = { vaultPath: vault, today: "2026-05-12", days: 7 }
    appendMemo("複数行は\nこう見える", { time: "12:55" }, opts)
    expect(readFileSync(join(vault, "2026-05-12.md"), "utf-8")).toBe(
      "- 12:55\n  複数行は\n  こう見える\n",
    )
  })

  test("[正常] 複数行タスクも `- [ ] HH:MM` + 字下げ継続行 で保存される", () => {
    const opts: MemoRepoOptions = { vaultPath: vault, today: "2026-05-12", days: 7 }
    appendMemo("複数行の\nタスク", { time: "07:00", asTask: true }, opts)
    expect(readFileSync(join(vault, "2026-05-12.md"), "utf-8")).toBe(
      "- [ ] 07:00\n  複数行の\n  タスク\n",
    )
  })

  test("[正常] 単一行と複数行が混在しても改行付きで連続追記できる", () => {
    const opts: MemoRepoOptions = { vaultPath: vault, today: "2026-05-12", days: 7 }
    appendMemo("単一行", { time: "10:00" }, opts)
    appendMemo("複数\n行", { time: "11:00" }, opts)
    appendMemo("また単一", { time: "12:00" }, opts)
    expect(readFileSync(join(vault, "2026-05-12.md"), "utf-8")).toBe(
      "- 10:00 単一行\n- 11:00\n  複数\n  行\n- 12:00 また単一\n",
    )
  })

  test("[正常] 書き込んだ複数行メモを listMemos で読み戻すと text に \\n が保たれる", () => {
    const opts: MemoRepoOptions = { vaultPath: vault, today: "2026-05-12", days: 7 }
    appendMemo("複数行は\nこう見える", { time: "12:55" }, opts)
    const memos = listMemos(opts)
    expect(memos).toHaveLength(1)
    expect(memos[0]?.text).toBe("複数行は\nこう見える")
    expect(memos[0]?.time).toBe("12:55")
  })
})

describe("listMemos の複数行対応", () => {
  let vault: string
  beforeEach(() => {
    vault = makeTempVault()
  })
  afterEach(() => {
    rmSync(vault, { recursive: true, force: true })
  })

  test("[正常] ヘッダ行+字下げ継続行 を 1つの Memo として組み立てる", () => {
    writeFileSync(
      join(vault, "2026-05-12.md"),
      "- 12:55\n  複数行は\n  こう見える\n- 13:00 後続の単一行\n",
    )
    const memos = listMemos({ vaultPath: vault, today: "2026-05-12", days: 1 })
    expect(memos).toHaveLength(2)
    expect(memos[0]?.time).toBe("13:00")
    expect(memos[0]?.text).toBe("後続の単一行")
    expect(memos[1]?.time).toBe("12:55")
    expect(memos[1]?.text).toBe("複数行は\nこう見える")
  })

  test("[正常] 空行が間に挟まると複数行メモは終端する", () => {
    writeFileSync(
      join(vault, "2026-05-12.md"),
      "- 12:55\n  本文1\n\n  本文2\n",
    )
    const memos = listMemos({ vaultPath: vault, today: "2026-05-12", days: 1 })
    expect(memos).toHaveLength(1)
    expect(memos[0]?.text).toBe("本文1")
  })
})

describe("withRetrySync (iCloud lock retry)", () => {
  test("[正常] EBUSY を投げる関数は MAX_RETRIES+1 回まで再試行され最終的に成功する", () => {
    let calls = 0
    const result = _internal.withRetrySync(() => {
      calls++
      if (calls <= _internal.MAX_RETRIES) {
        const err = new Error("locked") as NodeJS.ErrnoException
        err.code = "EBUSY"
        throw err
      }
      return "ok"
    })
    expect(result).toBe("ok")
    expect(calls).toBe(_internal.MAX_RETRIES + 1)
  })

  test("[異常] retry不能なエラーは即座に伝播し再試行されない", () => {
    let calls = 0
    expect(() =>
      _internal.withRetrySync(() => {
        calls++
        const err = new Error("missing") as NodeJS.ErrnoException
        err.code = "ENOENT"
        throw err
      }),
    ).toThrow(/missing/)
    expect(calls).toBe(1)
  })

  test("[異常] retry を MAX_RETRIES 回繰り返してもダメな場合は最後の例外を投げる", () => {
    let calls = 0
    expect(() =>
      _internal.withRetrySync(() => {
        calls++
        const err = new Error("busy forever") as NodeJS.ErrnoException
        err.code = "EBUSY"
        throw err
      }),
    ).toThrow(/busy forever/)
    expect(calls).toBe(_internal.MAX_RETRIES + 1)
  })
})
