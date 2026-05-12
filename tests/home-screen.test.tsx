import { test, expect } from "bun:test"
import { act } from "react"
import { testRender } from "@opentui/react/test-utils"
import { App, type AppContextValue } from "../src/app"

function makeCtx(overrides: Partial<AppContextValue> = {}): AppContextValue {
  return {
    vaultPath: `${import.meta.dir}/fixtures/vault`,
    thinoConfig: { mode: "DAILY" },
    days: 7,
    readOnly: true,
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

function findRow(frame: string, needle: string): string | undefined {
  return frame.split("\n").find((l) => l.includes(needle))
}

function countRowsWith(frame: string, needle: string): number {
  return frame.split("\n").filter((l) => l.includes(needle)).length
}

test("[正常] read-only時に初期表示が行スタイルで描画されること", async () => {
  const { captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).toContain("ゆいレールのポストモーテム保存")
  expect(frame).toContain("c/Ctrl+V: toggle view")
  expect(frame).not.toContain("Cmd+Enter")
  expect(countRowsWith(frame, "─")).toBe(0)
})

test("[正常] read-only時にcキー押下でカード型へ切り替わること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await pressKey(mockInput, "c")
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).not.toContain("ゆいレールのポストモーテム保存")
  expect(findRow(frame, "ゆいレールのポストモーテム保存")).toBeDefined()
  expect(countRowsWith(frame, "─")).toBeGreaterThanOrEqual(8)
})

test("[正常] カード型でcキー再押下時に行スタイルへ戻ること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await pressKey(mockInput, "c")
  await renderOnce()
  await pressKey(mockInput, "c")
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).toContain("ゆいレールのポストモーテム保存")
  expect(countRowsWith(frame, "─")).toBe(0)
})

test("[正常] read-only時にCtrl+C押下では表示モードが切り替わらないこと", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await pressKey(mockInput, "c", { ctrl: true })
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).toContain("ゆいレールのポストモーテム保存")
  expect(countRowsWith(frame, "─")).toBe(0)
})

test("[正常] 書き込みモードの初期表示が行スタイルでCtrl+V案内が出ること", async () => {
  const { captureCharFrame, renderOnce } = await renderApp({ readOnly: false })
  await renderOnce()
  const frame = captureCharFrame()

  expect(frame).toContain("Ctrl+V: toggle view")
  expect(frame).not.toContain("READ-ONLY: DAILY")
  expect(findRow(frame, "10:11")).toContain("ゆいレールのポストモーテム保存")
})

test("[正常] 書き込みモードでCtrl+V押下でカード型へ切り替わること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp({ readOnly: false })
  await renderOnce()
  await pressKey(mockInput, "v", { ctrl: true })
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).not.toContain("ゆいレールのポストモーテム保存")
  expect(findRow(frame, "ゆいレールのポストモーテム保存")).toBeDefined()
})

test("[正常] 書き込みモードでcキー単独押下では表示モードが切り替わらないこと", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp({ readOnly: false })
  await renderOnce()
  await pressKey(mockInput, "c")
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).toContain("ゆいレールのポストモーテム保存")
})

test("[正常] カード型でisTaskメモの時刻行にチェックボックスが表示されること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await pressKey(mockInput, "c")
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "11:24")).toContain("☐")
})

test("[正常] カード型で非タスクメモの時刻行にはチェックボックスが表示されないこと", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await pressKey(mockInput, "c")
  await renderOnce()
  const frame = captureCharFrame()

  expect(findRow(frame, "10:11")).not.toContain("☐")
})

test("[正常] カード型で複数行メモの全本文行がそれぞれ独立した行に描画されること", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await renderApp()
  await renderOnce()
  await pressKey(mockInput, "c")
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
