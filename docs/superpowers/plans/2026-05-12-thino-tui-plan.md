# thino-tui Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP of `thino-tui` — a Bun + OpenTUI terminal application that lists recent Obsidian Thino memos and appends new ones.

**Architecture:** Layered: OpenTUI/React view → screen containers → `memo-repository` use cases → `*-config` infrastructure → Vault filesystem. The infrastructure layer encapsulates Obsidian/Thino/Daily Notes config parsing; screens only know how to list and append memos.

**Tech Stack:** Bun, TypeScript, OpenTUI (`@opentui/core` + `@opentui/react`), hascii-ui (`@hascii/ui`), React 18+, `bun test`.

**Reference:** [`docs/superpowers/specs/2026-05-12-thino-tui-design.md`](../specs/2026-05-12-thino-tui-design.md)

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json` | Bun project manifest, scripts |
| `tsconfig.json` | TypeScript compiler config |
| `bunfig.toml` | Bun config (test settings) |
| `src/index.tsx` | Entry point. CLI flag parsing, OpenTUI render call |
| `src/app.tsx` | Root component. Context provider, screen router |
| `src/screens/list-screen.tsx` | List view, keyboard navigation, refresh |
| `src/screens/compose-screen.tsx` | Compose view, submit / cancel / task toggle |
| `src/components/memo-row.tsx` | One row in the list |
| `src/components/date-header.tsx` | Date section heading |
| `src/components/status-bar.tsx` | Footer help line |
| `src/lib/obsidian-config.ts` | `resolveVaultPath()` |
| `src/lib/thino-config.ts` | `readThinoConfig(vault)` |
| `src/lib/daily-notes-config.ts` | `readDailyNotesConfig(vault)` |
| `src/lib/memo.ts` | `Memo` type + `parseMemoLine` |
| `src/lib/memo-repository.ts` | `listMemos`, `appendMemo` |
| `tests/fixtures/vault/...` | Minimal vault for tests |
| `tests/lib/*.test.ts` | Unit tests for lib layer |

Branching: implementation is done on `feat/initial-scaffold` (one feature branch for the whole MVP); merged into `main` via PR at the end.

---

## Task 0: Create feature branch

**Files:** none

- [ ] **Step 1: Create feature branch off main**

Run:
```bash
cd ~/ghq/github.com/taichiyam/thino-tui
git checkout main
git pull --ff-only
git checkout -b feat/initial-scaffold
```

Expected: `Switched to a new branch 'feat/initial-scaffold'`

---

## Task 1: Bun + TypeScript project init

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `bunfig.toml`

- [ ] **Step 1: Initialize Bun project**

Run:
```bash
bun init -y
```

This creates `package.json`, `tsconfig.json`, `index.ts`, `README.md`. Delete the generated `index.ts` and **do not overwrite the existing `README.md`** from the bootstrap commit.

```bash
rm index.ts
git checkout -- README.md
```

- [ ] **Step 2: Edit package.json to set the script entry**

Open `package.json` and ensure:

```json
{
  "name": "thino-tui",
  "module": "src/index.tsx",
  "type": "module",
  "scripts": {
    "start": "bun run src/index.tsx",
    "test": "bun test"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5"
  }
}
```

- [ ] **Step 3: Edit tsconfig.json**

Ensure it includes:

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,
    "types": ["bun-types"],
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Create bunfig.toml**

```toml
[test]
preload = []
```

- [ ] **Step 5: Verify type-check passes**

Run:
```bash
bunx tsc --noEmit
```

Expected: no output (no type errors).

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json bunfig.toml bun.lockb
git commit -m "chore: initialize bun + typescript project"
```

---

## Task 2: Install OpenTUI + hascii-ui and verify minimal render

**Files:**
- Modify: `package.json` (adds dependencies)
- Create: `src/index.tsx`

- [ ] **Step 1: Add OpenTUI and React dependencies**

```bash
bun add @opentui/core @opentui/react react
bun add -d @types/react
```

- [ ] **Step 2: Add hascii-ui via its installer**

```bash
bunx @hascii/ui init
```

If the installer asks questions, accept defaults. If `@hascii/ui` is not added by `init`, run:

```bash
bun add @hascii/ui
```

- [ ] **Step 3: Create minimal `src/index.tsx`**

```tsx
import { render } from "@opentui/react"

function App() {
  return (
    <box>
      <text>thino-tui boot ok</text>
    </box>
  )
}

render(<App />)
```

- [ ] **Step 4: Verify it boots**

```bash
bun run src/index.tsx
```

Expected: terminal renders `thino-tui boot ok`. Press `Ctrl+C` to exit.

If `<box>` / `<text>` element names differ from the installed OpenTUI version, consult `node_modules/@opentui/react/README.md` and adjust to the actual JSX elements (e.g. `<Box>`, `<Text>`). Update this plan inline if naming differs.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lockb src/index.tsx
git commit -m "feat: scaffold opentui + hascii-ui with minimal boot"
```

---

## Task 3: Build test fixture vault

**Files:**
- Create: `tests/fixtures/vault/.obsidian/plugins/thino/data.json`
- Create: `tests/fixtures/vault/.obsidian/daily-notes.json`
- Create: `tests/fixtures/vault/2026-05-12.md`
- Create: `tests/fixtures/vault/2026-05-11.md`

- [ ] **Step 1: Thino plugin config fixture**

`tests/fixtures/vault/.obsidian/plugins/thino/data.json`:
```json
{
  "mode": "DAILY"
}
```

- [ ] **Step 2: Daily-notes config fixture**

`tests/fixtures/vault/.obsidian/daily-notes.json`:
```json
{
  "folder": "",
  "format": "YYYY-MM-DD",
  "template": ""
}
```

- [ ] **Step 3: Today fixture (2026-05-12)**

`tests/fixtures/vault/2026-05-12.md`:
```markdown
# 2026-05-12

- 09:14 朝のタスク報告 投稿成功
- 10:11 ゆいレールのポストモーテム保存
- [ ] 11:24 はてなCMS と STUDIO の比較メモ完了
```

- [ ] **Step 4: Previous-day fixture (2026-05-11)**

`tests/fixtures/vault/2026-05-11.md`:
```markdown
# 2026-05-11

- 15:03 YUI_RAIL-77 のPR出した
- 18:42 退勤報告完了
```

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures
git commit -m "test: add minimal vault fixtures for lib tests"
```

---

## Task 4: `lib/memo.ts` — type and parser

**Files:**
- Create: `src/lib/memo.ts`
- Test: `tests/lib/memo.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/lib/memo.test.ts`:
```ts
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
```

- [ ] **Step 2: Confirm failure**

```bash
bun test tests/lib/memo.test.ts
```

Expected: FAIL with `Cannot find module '../../src/lib/memo'`.

- [ ] **Step 3: Implement `src/lib/memo.ts`**

```ts
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
  const match = MEMO_RE.exec(line)
  if (!match) return null
  const [, hh, mm, body] = match
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
```

- [ ] **Step 4: Confirm pass**

```bash
bun test tests/lib/memo.test.ts
```

Expected: 3/3 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/memo.ts tests/lib/memo.test.ts
git commit -m "feat(lib): add memo parser"
```

---

## Task 5: `lib/obsidian-config.ts` — vault path resolution

**Files:**
- Create: `src/lib/obsidian-config.ts`
- Test: `tests/lib/obsidian-config.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/lib/obsidian-config.test.ts`:
```ts
import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { resolveVaultPath } from "../../src/lib/obsidian-config"

describe("resolveVaultPath", () => {
  const original = process.env.OBSIDIAN_VAULT

  beforeEach(() => { delete process.env.OBSIDIAN_VAULT })
  afterEach(() => {
    if (original === undefined) delete process.env.OBSIDIAN_VAULT
    else process.env.OBSIDIAN_VAULT = original
  })

  test("[正常] --vault フラグが最優先で採用される", () => {
    process.env.OBSIDIAN_VAULT = "/from-env"
    expect(resolveVaultPath({ flag: "/from-flag" })).toBe("/from-flag")
  })

  test("[正常] フラグ未指定なら OBSIDIAN_VAULT を使う", () => {
    process.env.OBSIDIAN_VAULT = "/from-env"
    expect(resolveVaultPath({})).toBe("/from-env")
  })

  test("[異常] フラグも環境変数も無ければ throw する", () => {
    expect(() => resolveVaultPath({})).toThrow(/vault not found/i)
  })
})
```

- [ ] **Step 2: Confirm failure** — `bun test tests/lib/obsidian-config.test.ts` FAIL.

- [ ] **Step 3: Implement `src/lib/obsidian-config.ts`**

```ts
export type ResolveVaultPathOptions = { flag?: string }

export function resolveVaultPath(opts: ResolveVaultPathOptions): string {
  if (opts.flag) return opts.flag
  const env = process.env.OBSIDIAN_VAULT
  if (env) return env
  throw new Error("vault not found: set --vault or OBSIDIAN_VAULT")
}
```

- [ ] **Step 4: Confirm pass** — 3/3 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/obsidian-config.ts tests/lib/obsidian-config.test.ts
git commit -m "feat(lib): resolve vault path from flag or env"
```

---

## Task 6: `lib/thino-config.ts` — Thino plugin config reader

**Files:**
- Create: `src/lib/thino-config.ts`
- Test: `tests/lib/thino-config.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/lib/thino-config.test.ts`:
```ts
import { describe, expect, test } from "bun:test"
import { readThinoConfig } from "../../src/lib/thino-config"
import { join } from "node:path"

const fixtureVault = join(import.meta.dir, "..", "fixtures", "vault")

describe("readThinoConfig", () => {
  test("[正常] DAILY モード設定を読み取れる", () => {
    expect(readThinoConfig(fixtureVault)).toEqual({ mode: "DAILY" })
  })

  test("[異常] data.json が無い場合に DAILY フォールバック値が返る", () => {
    expect(readThinoConfig("/no-such-vault")).toEqual({ mode: "DAILY" })
  })
})
```

- [ ] **Step 2: Confirm failure**

- [ ] **Step 3: Implement `src/lib/thino-config.ts`**

```ts
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

export type ThinoMode = "DAILY" | "JOURNAL" | "MULTI" | "CANVAS" | "FILE"
export type ThinoConfig = { mode: ThinoMode }

const VALID_MODES: ThinoMode[] = ["DAILY", "JOURNAL", "MULTI", "CANVAS", "FILE"]

export function readThinoConfig(vaultPath: string): ThinoConfig {
  const dataPath = join(vaultPath, ".obsidian", "plugins", "thino", "data.json")
  if (!existsSync(dataPath)) return { mode: "DAILY" }
  try {
    const raw = JSON.parse(readFileSync(dataPath, "utf-8")) as Record<string, unknown>
    const mode = String(raw.mode ?? "DAILY").toUpperCase() as ThinoMode
    return { mode: VALID_MODES.includes(mode) ? mode : "DAILY" }
  } catch {
    return { mode: "DAILY" }
  }
}
```

- [ ] **Step 4: Confirm pass** — 2/2 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/thino-config.ts tests/lib/thino-config.test.ts
git commit -m "feat(lib): read thino plugin config with DAILY fallback"
```

---

## Task 7: `lib/daily-notes-config.ts` — Daily Notes config reader

**Files:**
- Create: `src/lib/daily-notes-config.ts`
- Test: `tests/lib/daily-notes-config.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/lib/daily-notes-config.test.ts`:
```ts
import { describe, expect, test } from "bun:test"
import { readDailyNotesConfig } from "../../src/lib/daily-notes-config"
import { join } from "node:path"

const fixtureVault = join(import.meta.dir, "..", "fixtures", "vault")

describe("readDailyNotesConfig", () => {
  test("[正常] format と folder を fixture から読み取れる", () => {
    expect(readDailyNotesConfig(fixtureVault)).toEqual({
      folder: "",
      format: "YYYY-MM-DD",
      template: "",
    })
  })

  test("[異常] json不在時に既定値が返る", () => {
    expect(readDailyNotesConfig("/no-vault")).toEqual({
      folder: "",
      format: "YYYY-MM-DD",
      template: "",
    })
  })
})
```

- [ ] **Step 2: Confirm failure**

- [ ] **Step 3: Implement `src/lib/daily-notes-config.ts`**

```ts
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

export type DailyNotesConfig = {
  folder: string
  format: string
  template: string
}

const DEFAULTS: DailyNotesConfig = {
  folder: "",
  format: "YYYY-MM-DD",
  template: "",
}

export function readDailyNotesConfig(vaultPath: string): DailyNotesConfig {
  const dataPath = join(vaultPath, ".obsidian", "daily-notes.json")
  if (!existsSync(dataPath)) return DEFAULTS
  try {
    const raw = JSON.parse(readFileSync(dataPath, "utf-8")) as Record<string, unknown>
    return {
      folder: typeof raw.folder === "string" ? raw.folder : DEFAULTS.folder,
      format: typeof raw.format === "string" ? raw.format : DEFAULTS.format,
      template: typeof raw.template === "string" ? raw.template : DEFAULTS.template,
    }
  } catch {
    return DEFAULTS
  }
}
```

- [ ] **Step 4: Confirm pass** — 2/2 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/daily-notes-config.ts tests/lib/daily-notes-config.test.ts
git commit -m "feat(lib): read daily-notes config with defaults fallback"
```

---

## Task 8: `lib/memo-repository.ts` — list and append

**Files:**
- Create: `src/lib/memo-repository.ts`
- Test: `tests/lib/memo-repository.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/lib/memo-repository.test.ts`:
```ts
import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { listMemos, appendMemo, type MemoRepoOptions } from "../../src/lib/memo-repository"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const FIXTURE = join(import.meta.dir, "..", "fixtures", "vault")

function makeTempVault(): string {
  const dir = mkdtempSync(join(tmpdir(), "thino-tui-"))
  mkdirSync(join(dir, ".obsidian"), { recursive: true })
  writeFileSync(join(dir, ".obsidian", "daily-notes.json"), JSON.stringify({
    folder: "",
    format: "YYYY-MM-DD",
    template: "",
  }))
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
  beforeEach(() => { vault = makeTempVault() })
  afterEach(() => { rmSync(vault, { recursive: true, force: true }) })

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
```

- [ ] **Step 2: Confirm failure**

- [ ] **Step 3: Implement `src/lib/memo-repository.ts`**

```ts
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
```

- [ ] **Step 4: Confirm pass** — 5/5 PASS.

- [ ] **Step 5: Full lib suite check** — `bun test` all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/memo-repository.ts tests/lib/memo-repository.test.ts
git commit -m "feat(lib): list and append memos via daily-notes config"
```

---

## Task 9: `src/app.tsx` — root context and screen router

**Files:**
- Create: `src/app.tsx`

- [ ] **Step 1: Implement App with shared context and screen switching**

```tsx
import { createContext, useContext, useMemo, useState } from "react"
import type { ThinoConfig } from "./lib/thino-config"
import { ListScreen } from "./screens/list-screen"
import { ComposeScreen } from "./screens/compose-screen"

export type AppContextValue = {
  vaultPath: string
  thinoConfig: ThinoConfig
  days: number
  readOnly: boolean
  today: () => string
  nowHHMM: () => string
}

const Ctx = createContext<AppContextValue | null>(null)
export const useApp = (): AppContextValue => {
  const v = useContext(Ctx)
  if (!v) throw new Error("useApp called outside of <App>")
  return v
}

export type Screen = "list" | "compose"

export function App(props: AppContextValue) {
  const [screen, setScreen] = useState<Screen>("list")
  const value = useMemo(() => props, [props])
  return (
    <Ctx.Provider value={value}>
      {screen === "list" && <ListScreen onCompose={() => setScreen("compose")} />}
      {screen === "compose" && <ComposeScreen onDone={() => setScreen("list")} />}
    </Ctx.Provider>
  )
}
```

- [ ] **Step 2: Type-check tolerates missing screens (next tasks)**

```bash
bunx tsc --noEmit
```

Expect errors about `./screens/list-screen` / `./screens/compose-screen` until Task 10/11. That's OK.

(No commit yet — bundle with screens in Task 11.)

---

## Task 10: `src/screens/list-screen.tsx` + shared components

**Files:**
- Create: `src/components/memo-row.tsx`
- Create: `src/components/date-header.tsx`
- Create: `src/components/status-bar.tsx`
- Create: `src/screens/list-screen.tsx`

- [ ] **Step 1: Implement shared components**

`src/components/status-bar.tsx`:
```tsx
export function StatusBar({ hint }: { hint: string }) {
  return <text>{hint}</text>
}
```

`src/components/date-header.tsx`:
```tsx
export function DateHeader({ date }: { date: string }) {
  return <text>{date}</text>
}
```

`src/components/memo-row.tsx`:
```tsx
import type { Memo } from "../lib/memo"
export function MemoRow({ memo, selected }: { memo: Memo; selected: boolean }) {
  const marker = selected ? "▌" : " "
  return <text>{`${marker}${memo.time}  ${memo.text}`}</text>
}
```

> **OpenTUI JSX caveat:** If `<text>` lowercase elements are not supported by the installed `@opentui/react`, switch to capitalized exports (`<Text>`, `<Box>`). Adjust all three component files consistently.

- [ ] **Step 2: Implement ListScreen**

`src/screens/list-screen.tsx`:
```tsx
import { useEffect, useMemo, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { listMemos } from "../lib/memo-repository"
import { useApp } from "../app"
import { MemoRow } from "../components/memo-row"
import { DateHeader } from "../components/date-header"
import { StatusBar } from "../components/status-bar"

export function ListScreen({ onCompose }: { onCompose: () => void }) {
  const app = useApp()
  const [refreshTick, setRefreshTick] = useState(0)
  const [index, setIndex] = useState(0)

  const memos = useMemo(
    () => listMemos({ vaultPath: app.vaultPath, today: app.today(), days: app.days }),
    [app, refreshTick],
  )

  useEffect(() => { if (index >= memos.length) setIndex(0) }, [memos, index])

  useKeyboard((key) => {
    if (key.name === "j" || key.name === "down") setIndex((i) => Math.min(i + 1, memos.length - 1))
    else if (key.name === "k" || key.name === "up") setIndex((i) => Math.max(i - 1, 0))
    else if (key.name === "g") setIndex(0)
    else if (key.name === "G") setIndex(Math.max(memos.length - 1, 0))
    else if (key.name === "r") setRefreshTick((t) => t + 1)
    else if (key.name === "n" && !app.readOnly) onCompose()
    else if (key.name === "q") process.exit(0)
  })

  const groups = useMemo(() => {
    const g: Record<string, typeof memos> = {}
    for (const m of memos) (g[m.date] ??= []).push(m)
    return Object.entries(g).sort(([a], [b]) => (a < b ? 1 : -1))
  }, [memos])

  const hint = app.readOnly
    ? `READ-ONLY: ${app.thinoConfig.mode}  up/down select / r refresh / q quit`
    : "up/down select / n new / r refresh / q quit"

  return (
    <box>
      <text>thino-tui ({app.thinoConfig.mode})</text>
      {groups.map(([date, list]) => (
        <box key={date}>
          <DateHeader date={date} />
          {list.map((m) => (
            <MemoRow key={m.id} memo={m} selected={memos[index]?.id === m.id} />
          ))}
        </box>
      ))}
      <StatusBar hint={hint} />
    </box>
  )
}
```

> **OpenTUI keyboard API caveat:** if `useKeyboard` is not the exported hook in the installed version, consult its docs and adjust (`useInput`, `onKeyPress`, etc.). Keep the same bindings.

- [ ] **Step 3: Type-check** — only `compose-screen` should still be missing.

---

## Task 11: `src/screens/compose-screen.tsx` and bundle commit

**Files:**
- Create: `src/screens/compose-screen.tsx`

- [ ] **Step 1: Implement ComposeScreen**

```tsx
import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { appendMemo } from "../lib/memo-repository"
import { useApp } from "../app"
import { StatusBar } from "../components/status-bar"

export function ComposeScreen({ onDone }: { onDone: () => void }) {
  const app = useApp()
  const [body, setBody] = useState("")
  const [asTask, setAsTask] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useKeyboard((key) => {
    if (key.name === "escape") onDone()
    else if (key.name === "tab") setAsTask((t) => !t)
    else if (key.ctrl && key.name === "return") {
      if (!body.trim()) {
        setError("body is empty")
        return
      }
      try {
        appendMemo(body.trim(), { time: app.nowHHMM(), asTask }, {
          vaultPath: app.vaultPath, today: app.today(), days: app.days,
        })
        onDone()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    } else if (key.name === "backspace") setBody((b) => b.slice(0, -1))
    else if (key.sequence && !key.ctrl && !key.meta && key.sequence.length === 1) {
      setBody((b) => b + key.sequence)
    }
  })

  return (
    <box>
      <text>{`New memo  ${app.today()} ${app.nowHHMM()}`}</text>
      <text>{`> ${body}`}</text>
      <text>{`[${asTask ? "x" : " "}] append as task`}</text>
      {error && <text>{`error: ${error}`}</text>}
      <StatusBar hint="Ctrl+Enter submit / Tab toggle task / Esc cancel" />
    </box>
  )
}
```

- [ ] **Step 2: Type-check passes**

```bash
bunx tsc --noEmit
```

Expected: no errors (only `src/index.tsx` not yet updated, but it still compiles since it doesn't import the screens yet).

- [ ] **Step 3: Commit app + screens + components together**

```bash
git add src/app.tsx src/components src/screens
git commit -m "feat(ui): list and compose screens with shared components"
```

---

## Task 12: `src/index.tsx` — CLI arguments, vault resolution, integration

**Files:**
- Modify: `src/index.tsx`

- [ ] **Step 1: Replace the minimal boot with full CLI + render**

```tsx
import { render } from "@opentui/react"
import { resolveVaultPath } from "./lib/obsidian-config"
import { readThinoConfig } from "./lib/thino-config"
import { App, type AppContextValue } from "./app"

type CliArgs = { vault?: string; days?: number; readOnly: boolean; help: boolean }

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { readOnly: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--vault") args.vault = argv[++i]
    else if (a === "--days") args.days = Number(argv[++i])
    else if (a === "--read-only") args.readOnly = true
    else if (a === "--help" || a === "-h") args.help = true
  }
  return args
}

function printHelp() {
  console.log(`thino-tui — Obsidian Thino memos in your terminal

USAGE:
  thino-tui [--vault PATH] [--days N] [--read-only]

OPTIONS:
  --vault PATH    Path to the Obsidian vault (or set OBSIDIAN_VAULT env var)
  --days N        How many past days to list (default: 7)
  --read-only     Disable compose
  -h, --help      Show this help
`)
}

function todayJST(): string {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

function nowJSTHHMM(): string {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(11, 16)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) { printHelp(); return }

  let vaultPath: string
  try {
    vaultPath = resolveVaultPath({ flag: args.vault })
  } catch (e) {
    console.error(`thino-tui: ${e instanceof Error ? e.message : e}`)
    process.exit(1)
  }

  const thinoConfig = readThinoConfig(vaultPath)
  const readOnly = args.readOnly || thinoConfig.mode !== "DAILY"

  const ctx: AppContextValue = {
    vaultPath,
    thinoConfig,
    days: args.days && Number.isFinite(args.days) ? args.days : 7,
    readOnly,
    today: todayJST,
    nowHHMM: nowJSTHHMM,
  }

  render(<App {...ctx} />)
}

main()
```

- [ ] **Step 2: Smoke test against fixture vault**

```bash
bun run src/index.tsx --vault tests/fixtures/vault --days 1000
```

Expected: the TUI renders 5 memos from the fixture vault. Press `q` to quit. `--days 1000` avoids "today doesn't match fixture date" issues.

- [ ] **Step 3: Full test suite**

```bash
bun test
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/index.tsx
git commit -m "feat: wire CLI args, vault resolution, and screens"
```

---

## Task 13: README update and PR

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README "Status" section**

Replace the Status block in `README.md`:

```markdown
## Status

✅ MVP shipped on `feat/initial-scaffold` — list + append.

- [x] Design spec
- [x] Project scaffold (Bun + OpenTUI + hascii-ui)
- [x] lib layer + unit tests (`bun test`)
- [x] ListScreen
- [x] ComposeScreen
- [ ] Edit / delete / search (future)
```

Add a **Usage** section after Concept:

````markdown
## Usage

```bash
OBSIDIAN_VAULT=/path/to/vault bun run src/index.tsx
# or
bun run src/index.tsx --vault /path/to/vault --days 7
```

### Keys

| Screen | Key | Action |
|---|---|---|
| List | up/down or j/k | move |
| List | n | new memo |
| List | r | refresh |
| List | q | quit |
| Compose | Ctrl+Enter | submit |
| Compose | Tab | toggle task |
| Compose | Esc | cancel |
````

- [ ] **Step 2: Commit README**

```bash
git add README.md
git commit -m "docs: update README with usage and MVP status"
```

- [ ] **Step 3: Push branch and open PR**

```bash
git push -u origin feat/initial-scaffold
gh pr create --fill --base main --head feat/initial-scaffold
```

Expected: PR URL is printed.

---

## Acceptance Criteria

1. **Given** the fixture vault and `--days 1000`, **When** `bun run src/index.tsx --vault tests/fixtures/vault --days 1000` runs, **Then** the TUI shows 5 memo rows sorted by date+time descending.
2. **Given** the fixture vault, **When** the user presses `n`, types `テストメモ`, and presses `Ctrl+Enter`, **Then** a new row `- HH:MM テストメモ` is appended to `<today>.md` in the vault.
3. **Given** no `OBSIDIAN_VAULT` env var and no `--vault` flag, **When** the app starts, **Then** it exits with `thino-tui: vault not found: set --vault or OBSIDIAN_VAULT`.
4. **Given** a Thino config with `mode="MULTI"`, **When** the app starts, **Then** the list shows `READ-ONLY: MULTI` and `n` is ignored.
5. **All unit tests pass** under `bun test`.

---

## Self-Review Checklist (after implementation)

- [ ] Run `bun test` — all green.
- [ ] Run `bunx tsc --noEmit` — no errors.
- [ ] Manual run against the real vault — list renders.
- [ ] No `TODO` / `FIXME` left in committed code.
- [ ] No dead code, no unused imports.
- [ ] lib files <150 LOC, screen files <200 LOC.

