# thino-tui Design

- **Date**: 2026-05-12
- **Author**: taichiyam
- **Status**: Draft (pending review)

## 1. Goal

Build a terminal UI (TUI) application that lets the user browse and append [Obsidian Thino](https://github.com/Quorafind/Obsidian-Thino) memos from a terminal, without launching Obsidian.

MVP scope is intentionally narrow: **list recent memos + append a new memo**. Editing, deletion, search, and non-DAILY Thino modes are out of scope for the first iteration.

## 2. Non-Goals (MVP)

- Editing or deleting existing memos
- Search / tag / date filtering
- Multi-vault management
- Thino modes other than DAILY (JOURNAL / MULTI / CANVAS / FILE)
- File watching (live sync with external edits)
- Template (Templates / Templater) application
- Distributable binary packaging per OS

## 3. Technology Stack

| Layer | Choice |
|---|---|
| Runtime | Bun |
| Language | TypeScript |
| TUI framework | [OpenTUI](https://github.com/anomalyco/opentui) (Zig native core + React renderer) |
| UI components | [hascii-ui](https://github.com/shigurenimo/hascii-ui) (shadcn-style OpenTUI component library) |
| Test runner | `bun test` |
| Scaffold | `bun create tui` (OpenTUI) + `bunx @hascii/ui init` |

## 4. Architecture

```
[OpenTUI / React renderer]                        ← View
     ↓
[screens/*.tsx]                                   ← Container (screen-level state)
     ↓
[lib/memo-repository.ts]                          ← Application (use cases)
     ↓
[lib/{obsidian,thino,daily-notes}-config.ts]      ← Infrastructure (config parsing)
     ↓
[Vault filesystem]                                ← External
```

Single direction: View → Container → Application → Infrastructure. Vault path resolution, Thino mode handling, and daily-note filename conventions are encapsulated in the Infrastructure layer; screen code only knows how to "list memos" and "append a memo".

## 5. Data Model

```ts
// lib/memo.ts
export type Memo = {
  id: string         // `${filePath}#L${lineNumber}` for MVP
  time: string       // "HH:MM"
  date: string       // "YYYY-MM-DD" (derived from daily-note filename)
  text: string       // body without the leading `- HH:MM `
  filePath: string   // absolute path to the daily note
  lineNumber: number // 1-based
  isTask: boolean    // true if the line is `- [ ] HH:MM ...`
}

export type ThinoConfig = {
  mode: 'DAILY' | 'JOURNAL' | 'MULTI' | 'CANVAS' | 'FILE'
}

export type DailyNotesConfig = {
  folder: string     // "" means vault root
  format: string     // e.g. "YYYY-MM-DD"
  template?: string  // not used in MVP
}
```

## 6. Infrastructure Layer

| Module | Key functions | Responsibility |
|---|---|---|
| `obsidian-config.ts` | `resolveVaultPath(): string` | Resolve vault path: `--vault` flag → `OBSIDIAN_VAULT` env → default. |
| `thino-config.ts` | `readThinoConfig(vault): ThinoConfig` | Parse `.obsidian/plugins/thino/data.json`. Fallback to `mode='DAILY'` when missing. |
| `daily-notes-config.ts` | `readDailyNotesConfig(vault): DailyNotesConfig` | Parse `.obsidian/daily-notes.json`. Fallback: `{folder: '', format: 'YYYY-MM-DD'}`. |
| `memo-repository.ts` | `listMemos({days, before?}): Memo[]`, `appendMemo(text, {asTask?}): Memo` | Read recent daily notes and parse memos; append a new memo to the current day's file. |

### Memo parsing rules

A line is a memo iff it matches one of:

- `- HH:MM <text>` — normal memo
- `- [ ] HH:MM <text>` — task memo (`isTask=true`)

`HH` is `00-23`, `MM` is `00-59`. Trailing whitespace is trimmed; leading spaces in the body are preserved.

### Append rules

- Time is computed as JST `HH:MM` at the moment of submission (not at compose-open).
- Target file: `<vault>/<dailyNotesFolder>/<today-formatted>.md`. If the folder does not exist, it is created recursively. If the file does not exist, it is created and the memo is appended as the only content (no template applied).
- Append format: `- HH:MM <text>` (or `- [ ] HH:MM <text>` when task flag is set).
- Writes append at end-of-file; existing lines are never modified.

## 7. UI

### Screen flow

```
   ListScreen ──n──▶ ComposeScreen ──submit/esc──▶ ListScreen (refreshed)
```

MVP has only these two screens. Errors are surfaced via an inline banner / toast, no modals.

### ListScreen

```
┌─ thino-tui ─────────────────────────────── DAILY mode ─┐
│                                                         │
│  2026-05-12                                             │
│  ▌11:24  Memo title preview                             │ ← selected
│   10:11  Another memo                                   │
│                                                         │
│  2026-05-11                                             │
│   18:42  Older memo                                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ↑↓: select   n: new   r: refresh   q: quit             │
└─────────────────────────────────────────────────────────┘
```

- Header: title on the left, Thino mode badge on the right (`HasciiBadge`). Non-DAILY modes show `READ-ONLY: <mode>`.
- Body: date headings, then `HH:MM  <body>` rows.
- Selected row gets `▌` marker + inverted theme color.
- Footer: keybinding help line.

### ComposeScreen

```
┌─ New memo ─────────────────────── 2026-05-12 11:30 ────┐
│  ┌─ Memo ────────────────────────────────────────────┐ │
│  │ Body input area (multi-line)                      │ │
│  └───────────────────────────────────────────────────┘ │
│   [ ] Append as task ( -[ ] form )                     │
├─────────────────────────────────────────────────────────┤
│   Ctrl+Enter: submit   Esc: cancel   Tab: toggle task   │
└─────────────────────────────────────────────────────────┘
```

- Focus cycle is managed by `HasciiFocusGroup`: body → task-toggle → submit/cancel buttons.
- Header timestamp is for display only; the actual submit time is recomputed on submit.

### Keybindings (MVP)

| Screen | Key | Action |
|---|---|---|
| List | `↑` `↓` `k` `j` | Move selection |
| List | `g` `G` | Jump to top / bottom |
| List | `n` | Open ComposeScreen |
| List | `r` | Reload memos |
| List | `q` / `Ctrl+C` | Quit |
| Compose | `Ctrl+Enter` | Submit (`appendMemo`) |
| Compose | `Tab` | Cycle focus |
| Compose | `Space` | Toggle task (when checkbox focused) |
| Compose | `Esc` | Cancel and return to List |

### State management

- Per-screen state via React `useState` / `useReducer`.
- Shared state (vault path, Thino config) via a single React Context.
- Memo list refreshed on mount and on explicit reload (`r`). No file watching in MVP.

### CLI flags / env vars

- `--vault <path>` — override vault path
- `--days <N>` — number of past days to include in the list (default `7`)
- `--read-only` — disable Compose unconditionally
- `OBSIDIAN_VAULT` env var — fallback for `--vault`

## 8. Error Handling

| Scenario | Behavior |
|---|---|
| Vault path not found | Exit with `thino-tui: vault not found. Set --vault or OBSIDIAN_VAULT.` |
| `.obsidian/plugins/thino/data.json` missing | Warn banner; assume `mode='DAILY'`. |
| `.obsidian/daily-notes.json` missing | Warn banner; assume `format='YYYY-MM-DD'`, `folder=''`. |
| Thino mode is not DAILY | Force read-only: ListScreen shows `READ-ONLY: <mode>` badge; Compose disabled. |
| Today's daily note absent (on append) | Auto-create parent folder and file. No template is applied (documented MVP limitation). |
| File write failure | Return to ComposeScreen, show error toast, preserve body for retry. |
| iCloud sync lock | Retry write up to 3 times, 200 ms interval. Then surface error. |

All writes are append-only. Existing lines are never modified.

## 9. Testing

Test runner: `bun test`. MVP covers **the entire `lib/` layer**. UI is verified by hand.

| Module | [Category] Case |
|---|---|
| `thino-config.ts` | [正常] DAILY モード設定を読み取れる |
| `thino-config.ts` | [異常] data.json が無い場合に DAILY フォールバック値が返る |
| `daily-notes-config.ts` | [正常] format と folder が正しく読み取れる |
| `daily-notes-config.ts` | [異常] json不在時に既定値 (YYYY-MM-DD / "") が返る |
| `memo.ts` (parser) | [正常] `- HH:MM 本文` から Memo が組み立てられる |
| `memo.ts` (parser) | [正常] `- [ ] HH:MM 本文` が `isTask=true` でパースされる |
| `memo.ts` (parser) | [異常] 行頭が `- HH:MM` でない行はパース結果に含まれない |
| `memo-repository.ts` | [正常] `listMemos` で直近7日のメモが新しい順に取得できる |
| `memo-repository.ts` | [正常] 存在しない日付のファイルはスキップされる |
| `memo-repository.ts` | [正常] `appendMemo` で当日のデイリーノートに `- HH:MM 本文` が末尾追記される |
| `memo-repository.ts` | [正常] ファイル不在時にフォルダ作成 + ファイル新規作成して追記される |
| `memo-repository.ts` | [異常] 親フォルダ権限なしの場合にエラーが伝播する |

Fixtures live in `tests/fixtures/vault/` (a minimal vault directory committed to the repo). No tests touch the real iCloud vault.

## 10. Project Layout (initial)

```
thino-tui/
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── bunfig.toml
├── docs/
│   └── superpowers/specs/
│       └── 2026-05-12-thino-tui-design.md
├── src/
│   ├── index.tsx             # OpenTUI entry + CLI arg parse
│   ├── app.tsx               # root context + screen router
│   ├── screens/
│   │   ├── list-screen.tsx
│   │   └── compose-screen.tsx
│   ├── components/
│   │   ├── memo-row.tsx
│   │   ├── date-header.tsx
│   │   └── status-bar.tsx
│   └── lib/
│       ├── obsidian-config.ts
│       ├── thino-config.ts
│       ├── daily-notes-config.ts
│       ├── memo.ts
│       └── memo-repository.ts
└── tests/
    ├── fixtures/vault/...
    └── lib/
        ├── thino-config.test.ts
        ├── daily-notes-config.test.ts
        ├── memo.test.ts
        └── memo-repository.test.ts
```

## 11. Dependencies (initial)

```json
{
  "dependencies": {
    "@opentui/core": "latest",
    "@opentui/react": "latest",
    "@hascii/ui": "latest",
    "react": "^18 or 19"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5"
  }
}
```

Exact versions are pinned at scaffold time using `bun create tui` and `bunx @hascii/ui init` output.

## 12. Open Questions

- Exact React major version compatibility with the latest `@opentui/react` (18 vs 19) — confirm at scaffold time.
- Behavior on Thino DAILY-but-with-custom-time-format (Thino allows custom timestamp format in settings) — out of MVP scope, document as a limitation in README.
- Whether to support `OBSIDIAN_VAULT_PATH` (longer name) as an additional fallback alias — defer.
- Whether to ship a `--help` screen via OpenTUI vs. a plain `console.log` — start with `console.log`.

## 13. Commit Plan

1. Commit this spec on `main` (initial repo bootstrap).
2. Switch to a feature branch `feat/initial-scaffold` for the project skeleton (Bun project, tsconfig, OpenTUI scaffold, hascii-ui init).
3. Implement Infrastructure layer with tests on `feat/lib-foundation`.
4. Implement screens incrementally on `feat/list-screen`, `feat/compose-screen`.

Branch / PR strategy follows the project convention: no direct commits to long-lived branches after the initial bootstrap.
