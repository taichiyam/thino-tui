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

test("[正常] read-only起動時は行スタイルで表示され、cキー押下でカード型に切り替わる", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await testRender(<App {...makeCtx()} />, {
    width: 80,
    height: 24,
  })

  await renderOnce()
  const initialFrame = captureCharFrame()

  // 初期表示は行スタイル — 上下ボーダーの罫線文字 (─) はメモ行には現れない
  expect(initialFrame).toContain("11:24")
  expect(initialFrame).toContain("はてなCMS")
  expect(initialFrame).toContain("c/Ctrl+V: toggle view")

  const linesOnlyMemos = initialFrame
    .split("\n")
    .filter((l) => l.includes("11:24") || l.includes("10:11"))
  for (const l of linesOnlyMemos) {
    expect(l.includes("─")).toBe(false)
  }

  await act(async () => {
    await mockInput.pressKey("c")
  })
  await renderOnce()

  const cardFrame = captureCharFrame()
  // カード型では各メモが上下ボーダーで囲まれる
  expect(cardFrame).toContain("─")
  expect(cardFrame).toContain("11:24")
  expect(cardFrame).toContain("はてなCMS")

  // 再度押すと行スタイルに戻る
  await act(async () => {
    await mockInput.pressKey("c")
  })
  await renderOnce()
  const back = captureCharFrame()
  const backMemoLines = back
    .split("\n")
    .filter((l) => l.includes("11:24") || l.includes("10:11"))
  for (const l of backMemoLines) {
    expect(l.includes("─")).toBe(false)
  }
})

test("[正常] 書き込みモードでCtrl+V押下でカード型に切り替わる", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await testRender(
    <App {...makeCtx({ readOnly: false })} />,
    { width: 80, height: 30 },
  )

  await renderOnce()
  const initialFrame = captureCharFrame()
  expect(initialFrame).toContain("Ctrl+V: toggle view")

  // 書き込みモードのメモ行は textarea より下に描画される
  const memoLines = initialFrame
    .split("\n")
    .filter((l) => l.includes("11:24") || l.includes("10:11"))
  for (const l of memoLines) {
    expect(l.includes("─")).toBe(false)
  }

  await act(async () => {
    await mockInput.pressKey("v", { ctrl: true })
  })
  await renderOnce()

  const cardFrame = captureCharFrame()
  // カード型に切り替わると上下ボーダーが描画される
  expect(cardFrame).toContain("─")
  expect(cardFrame).toContain("11:24")
})

test("[正常] カード型ではisTaskメモのチェックボックスが時刻横に表示される", async () => {
  const { mockInput, captureCharFrame, renderOnce } = await testRender(<App {...makeCtx()} />, {
    width: 80,
    height: 24,
  })

  await act(async () => {
    await mockInput.pressKey("c")
  })
  await renderOnce()

  const frame = captureCharFrame()
  const taskLine = frame.split("\n").find((l) => l.includes("11:24"))
  expect(taskLine).toBeDefined()
  // ballotタイプのチェックボックス文字 ☐ がタスク時刻行に現れる
  expect(taskLine ?? "").toContain("☐")
})
