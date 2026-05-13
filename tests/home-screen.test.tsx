import { test, expect } from "bun:test"
import { act } from "react"
import { testRender } from "@opentui/react/test-utils"
import { App, type AppContextValue } from "../src/app"

function makeCtx(overrides: Partial<AppContextValue> = {}): AppContextValue {
  return {
    vaultPath: `${import.meta.dir}/fixtures/vault`,
    thinoConfig: { mode: "DAILY" },
    days: 7,
    today: () => "2026-05-12",
    nowHHMM: () => "12:00",
    requestExit: () => {},
    ...overrides,
  }
}

async function renderApp(overrides?: Partial<AppContextValue>) {
  return testRender(<App {...makeCtx(overrides)} />, { width: 80, height: 40 })
}

type MockInput = Awaited<ReturnType<typeof renderApp>>["mockInput"]

async function pressKey(
  mockInput: MockInput,
  key: string,
  modifiers?: { ctrl?: boolean; meta?: boolean; shift?: boolean },
) {
  await act(async () => {
    await mockInput.pressKey(key, modifiers)
  })
}

async function pressArrow(mockInput: MockInput, direction: "up" | "down" | "left" | "right") {
  await act(async () => {
    mockInput.pressArrow(direction)
  })
}

function findRow(frame: string, needle: string): string | undefined {
  return frame.split("\n").find((l) => l.includes(needle))
}

function countRowsWith(frame: string, needle: string): number {
  return frame.split("\n").filter((l) => l.includes(needle)).length
}

// list フォーカスへ移動する補助。textarea は初期空行のため、↓ 一発で最終行から list へ。
async function moveToListFocus(mockInput: MockInput, renderOnce: () => Promise<void>) {
  await pressArrow(mockInput, "down")
  await renderOnce()
}

test("[正常] 初期表示が行スタイルで描画され textarea フォーカスのヒントが出ること", async () => {
  const { captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).toContain("ゆいレールのポストモーテム保存")
  expect(frame).toContain("Cmd/Ctrl+Enter: submit")
  expect(frame).toContain("Ctrl+V: toggle view")
  expect(countRowsWith(frame, "─")).toBeGreaterThanOrEqual(2) // textarea border
})

test("[正常] list フォーカス時に c キー押下でカード型へ切り替わること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await moveToListFocus(mockInput, renderOnce)
  await pressKey(mockInput, "c")
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).not.toContain("ゆいレールのポストモーテム保存")
  expect(findRow(frame, "ゆいレールのポストモーテム保存")).toBeDefined()
})

test("[正常] list フォーカス時に c キー再押下で行スタイルへ戻ること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await moveToListFocus(mockInput, renderOnce)
  await pressKey(mockInput, "c")
  await renderOnce()
  await pressKey(mockInput, "c")
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).toContain("ゆいレールのポストモーテム保存")
})

test("[異常] textarea フォーカス時に c キー単独押下では表示モードが切り替わらないこと", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  // 初期フォーカスは textarea。c は textarea にタイピングされる扱い
  await pressKey(mockInput, "c")
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).toContain("ゆいレールのポストモーテム保存")
})

test("[正常] Ctrl+V 押下でカード型へ切り替わること (textarea フォーカス時)", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await pressKey(mockInput, "v", { ctrl: true })
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).not.toContain("ゆいレールのポストモーテム保存")
  expect(findRow(frame, "ゆいレールのポストモーテム保存")).toBeDefined()
})

test("[正常] カード型で isTask メモの時刻行にチェックボックスが表示されること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await pressKey(mockInput, "v", { ctrl: true })
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "11:24")).toContain("☐")
})

test("[正常] カード型で非タスクメモの時刻行にはチェックボックスが表示されないこと", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await pressKey(mockInput, "v", { ctrl: true })
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).not.toContain("☐")
})

test("[正常] カード型で複数行メモの全本文行がそれぞれ独立した行に描画されること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await pressKey(mockInput, "v", { ctrl: true })
  await renderOnce()
  await moveToListFocus(mockInput, renderOnce)
  // メモは逆時系列表示（11:24→10:11→09:14→08:00）のため、08:00複数行メモは
  // 初期表示の折り返し直下にある。j キーで 2 回スクロールして表示エリアに収める。
  await pressKey(mockInput, "j")
  await renderOnce()
  await pressKey(mockInput, "j")
  await renderOnce()
  const frame = captureCharFrame()

  const firstRow = findRow(frame, "一行目の本文")
  const secondRow = findRow(frame, "二行目の本文")
  const thirdRow = findRow(frame, "三行目の本文")

  expect(firstRow).toBeDefined()
  expect(secondRow).toBeDefined()
  expect(thirdRow).toBeDefined()
  expect(firstRow).not.toBe(secondRow)
  expect(secondRow).not.toBe(thirdRow)
  expect(findRow(frame, "08:00")).not.toContain("一行目の本文")
})

test("[正常] textarea 最終行から↓キー押下で list フォーカスへ遷移すること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  // 初期 textarea は空行のみ → カーソルは唯一の行 = 最終行 → ↓ で list へ
  await pressArrow(mockInput, "down")
  await renderOnce()
  const frame = captureCharFrame()

  expect(frame).toContain("to input")
  expect(frame).not.toContain("Cmd/Ctrl+Enter: submit")
})

test("[正常] list フォーカス時に↑キー押下(scrollTop=0)で textarea フォーカスへ復帰すること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await moveToListFocus(mockInput, renderOnce)
  await pressArrow(mockInput, "up")
  await renderOnce()
  const frame = captureCharFrame()

  expect(frame).toContain("Cmd/Ctrl+Enter: submit")
})

test("[正常] list フォーカス時に i キー押下で textarea フォーカスへ復帰すること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await moveToListFocus(mockInput, renderOnce)
  await pressKey(mockInput, "i")
  await renderOnce()
  const frame = captureCharFrame()

  expect(frame).toContain("Cmd/Ctrl+Enter: submit")
})

test("[正常] list フォーカス時に j キー押下でスクロールできること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await pressKey(mockInput, "v", { ctrl: true }) // toggle to card view
  await renderOnce()
  await moveToListFocus(mockInput, renderOnce)
  await pressKey(mockInput, "j")
  await renderOnce()
  await pressKey(mockInput, "j")
  await renderOnce()
  const frame = captureCharFrame()

  // 08:00 複数行メモが scroll 経由で見えるようになる
  expect(findRow(frame, "一行目の本文")).toBeDefined()
})

test("[正常] textarea フォーカス→list→textarea の往復後も textarea でタイピングが反映されること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await moveToListFocus(mockInput, renderOnce) // textarea → list
  await pressArrow(mockInput, "up") // list (scrollTop=0) → textarea
  await renderOnce()
  await pressKey(mockInput, "h")
  await pressKey(mockInput, "i")
  await renderOnce()
  const frame = captureCharFrame()

  // textarea にタイピングが反映されている
  expect(findRow(frame, "hi")).toBeDefined()
  expect(frame).toContain("Cmd/Ctrl+Enter: submit")
})
