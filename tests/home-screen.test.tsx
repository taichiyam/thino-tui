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

test("[正常] 初期表示で textarea が描画され行スタイルでメモ一覧が出ること", async () => {
  const { captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).toContain("ゆいレールのポストモーテム保存")
  expect(frame).toContain("Cmd/Ctrl+Enter: submit")
  expect(countRowsWith(frame, "─")).toBeGreaterThanOrEqual(2) // textarea border
})

test("[正常] Ctrl+V でカード型へ切り替わり、再度 Ctrl+V で行スタイルに戻ること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()

  await pressKey(mockInput, "v", { ctrl: true })
  await renderOnce()
  let frame = captureCharFrame()
  expect(findRow(frame, "10:11")).not.toContain("ゆいレールのポストモーテム保存")
  expect(findRow(frame, "ゆいレールのポストモーテム保存")).toBeDefined()

  await pressKey(mockInput, "v", { ctrl: true })
  await renderOnce()
  frame = captureCharFrame()
  expect(findRow(frame, "10:11")).toContain("ゆいレールのポストモーテム保存")
})

test("[異常] c キー単独押下では表示モードが切り替わらないこと (textarea へタイピングされる)", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await pressKey(mockInput, "c")
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).toContain("ゆいレールのポストモーテム保存")
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

test("[正常] textarea 最終行から↓キー押下でメモ一覧がスクロール (textarea フォーカス維持)", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await pressKey(mockInput, "v", { ctrl: true }) // カード型へ
  await renderOnce()
  // 初期 textarea は空行のみ → カーソルは唯一の行 = 最終行 → ↓ でスクロール
  // 3 回スクロールで 08:00 の複数行カードを表示エリアに収める。
  for (let i = 0; i < 3; i++) {
    await pressArrow(mockInput, "down")
    await renderOnce()
  }
  const frame = captureCharFrame()

  expect(findRow(frame, "一行目の本文")).toBeDefined()
  expect(findRow(frame, "三行目の本文")).toBeDefined()
})

test("[正常] スクロール後でも textarea にタイピングできること (フォーカス維持)", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  // スクロール
  await pressArrow(mockInput, "down")
  await renderOnce()
  await pressArrow(mockInput, "down")
  await renderOnce()
  // タイピング
  await pressKey(mockInput, "h")
  await pressKey(mockInput, "i")
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "hi")).toBeDefined()
})

test("[正常] カード型で複数行メモの全本文行がそれぞれ独立した行に描画されること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await pressKey(mockInput, "v", { ctrl: true })
  await renderOnce()
  // メモは逆時系列表示（11:24→10:11→09:14→08:00）のため、08:00複数行メモを表示するため
  // ↓ キーで 3 回スクロール (9 行分) して全 3 行を表示エリアに収める。
  for (let i = 0; i < 3; i++) {
    await pressArrow(mockInput, "down")
    await renderOnce()
  }
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
