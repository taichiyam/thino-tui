import type { KeyEvent, ScrollBoxRenderable, TextareaRenderable } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { appendMemo, listMemos } from "../lib/memo-repository"
import type { Memo } from "../lib/memo"
import { useApp } from "../app"
import { MemoRow } from "../components/memo-row"
import { MemoCard } from "../components/memo-card"
import { DateHeader } from "../components/date-header"
import { StatusBar } from "../components/status-bar"
import { HasciiButton } from "../components/hascii/button"
import { HasciiCheckbox } from "../components/hascii/checkbox"

const SUBMIT_KEY_BINDINGS = [
  { name: "return", super: true, action: "submit" as const },
  { name: "return", ctrl: true, action: "submit" as const },
]

type FocusTarget = "textarea" | "list"

export function HomeScreen() {
  const app = useApp()
  const textareaRef = useRef<TextareaRenderable>(null)
  const scrollBoxRef = useRef<ScrollBoxRenderable>(null)
  const [asTask, setAsTask] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [viewMode, setViewMode] = useState<"line" | "card">("line")
  const [focusTarget, setFocusTarget] = useState<FocusTarget>("textarea")

  const memos = useMemo(
    () => listMemos({ vaultPath: app.vaultPath, today: app.today(), days: app.days }),
    [app, refreshTick],
  )

  const groups = useMemo(() => {
    const g: Record<string, Memo[]> = {}
    for (const m of memos) {
      const list = g[m.date]
      if (list) list.push(m)
      else g[m.date] = [m]
    }
    return Object.entries(g).sort(([a], [b]) => (a < b ? 1 : -1))
  }, [memos])

  const submit = () => {
    const body = textareaRef.current?.plainText?.trim() ?? ""
    if (!body) {
      setError("body is empty")
      return
    }
    try {
      appendMemo(body, { time: app.nowHHMM(), asTask }, {
        vaultPath: app.vaultPath, today: app.today(), days: app.days,
      })
      textareaRef.current?.clear()
      setAsTask(false)
      setError(null)
      setRefreshTick((t) => t + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const clear = () => {
    textareaRef.current?.clear()
    setAsTask(false)
    setError(null)
    focusTextarea()
  }

  const toggleView = () => setViewMode((m) => (m === "line" ? "card" : "line"))

  const focusTextarea = () => setFocusTarget("textarea")
  const focusList = () => setFocusTarget("list")

  // フォーカス状態をネイティブ側にも反映。focused prop だけだと
  // scrollbox がマウス操作で奪った後の復帰が確実でないため、明示的に同期する。
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    if (focusTarget === "textarea") ta.focus()
    else ta.blur()
  }, [focusTarget])

  const scrollDown = () => scrollBoxRef.current?.scrollBy(3)
  const scrollUp = () => scrollBoxRef.current?.scrollBy(-3)
  const scrollPageDown = () => scrollBoxRef.current?.scrollBy(0.5, "viewport")
  const scrollPageUp = () => scrollBoxRef.current?.scrollBy(-0.5, "viewport")
  const scrollToTop = () => scrollBoxRef.current?.scrollTo(0)
  const scrollToBottom = () => scrollBoxRef.current?.scrollTo(999999)

  const isAtTextareaLastLine = () => {
    const t = textareaRef.current
    if (!t) return true
    return t.logicalCursor.row >= t.lineCount - 1
  }
  const isScrollAtTop = () => (scrollBoxRef.current?.scrollTop ?? 0) <= 0

  const handleTextareaKeyDown = (key: KeyEvent) => {
    if (key.name === "down" && isAtTextareaLastLine()) {
      focusList()
    }
  }

  // scrollbox はフォーカス不可にして textarea からフォーカスを奪わないようにする。
  // OpenTUI のデフォルトでは scrollbox がマウス操作で focus を取りに行ってしまい、
  // textarea が blur されたまま戻らない/ボタンへのクリックがブロックされるため。
  // キーボード操作は useKeyboard でグローバルにハンドルしているので focus は不要。
  useEffect(() => {
    const sb = scrollBoxRef.current
    if (!sb) return
    sb.focusable = false
    sb.onMouseDown = () => focusList()
    return () => {
      sb.onMouseDown = undefined
    }
  }, [])

  // textarea をクリックしたら textarea フォーカスへ。
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.onMouseDown = () => focusTextarea()
    return () => {
      ta.onMouseDown = undefined
    }
  }, [])

  useKeyboard((key) => {
    // モード非依存のグローバルショートカット
    if (key.ctrl && key.name === "q") { app.requestExit(); return }
    if (key.ctrl && key.name === "r") { setRefreshTick((t) => t + 1); return }
    if (key.ctrl && key.name === "v") { toggleView(); return }
    if (key.name === "pagedown") { scrollPageDown(); return }
    if (key.name === "pageup") { scrollPageUp(); return }

    // textarea フォーカス時はタイピング/カーソル移動 native 任せ。
    // Down 最終行 → list 遷移は textarea.onKeyDown で処理する。
    if (focusTarget === "textarea") {
      if (key.name === "tab") setAsTask((t) => !t)
      return
    }

    // list フォーカス時
    if (key.name === "j" || key.name === "down") { scrollDown(); return }
    if (key.name === "k" || key.name === "up") {
      if (isScrollAtTop()) focusTextarea()
      else scrollUp()
      return
    }
    if (key.name === "g" && !key.shift) { scrollToTop(); return }
    if (key.name === "G" || (key.shift && key.name === "g")) { scrollToBottom(); return }
    if (key.name === "c") { toggleView(); return }
    if (key.name === "i" || key.name === "escape") { focusTextarea(); return }
  })

  const hint = focusTarget === "textarea"
    ? "Cmd/Ctrl+Enter: submit  Tab: as-task  ↓: to list  Ctrl+V: toggle view  Ctrl+R/Q: reload/quit"
    : "j/k/g/G: scroll  ↑(@top)/i/Esc: to input  c/Ctrl+V: view  Ctrl+R/Q: reload/quit"

  return (
    <box style={{ flexDirection: "column", padding: 1, flexGrow: 1 }}>
      <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <text>{`thino-tui  (${app.thinoConfig.mode})`}</text>
        <text>{`${app.today()} ${app.nowHHMM()}`}</text>
      </box>

      <box style={{ border: true, marginTop: 1, height: 8 }} title="New memo">
        <textarea
          ref={textareaRef}
          placeholder="Type here, then Cmd+Enter (or Ctrl+Enter) to submit..."
          focused={focusTarget === "textarea"}
          keyBindings={SUBMIT_KEY_BINDINGS}
          onSubmit={submit}
          onKeyDown={handleTextareaKeyDown}
        />
      </box>
      <box
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 1,
        }}
      >
        <box style={{ flexDirection: "row", alignItems: "center", flexShrink: 1 }}>
          <HasciiCheckbox isChecked={asTask} onChange={setAsTask}>append as task</HasciiCheckbox>
          {error && <text>{`   error: ${error}`}</text>}
        </box>
        <box
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 1,
            flexShrink: 0,
          }}
        >
          <HasciiButton size="sm" onPress={submit}>Submit</HasciiButton>
          <box style={{ marginLeft: 1 }}>
            <HasciiButton size="sm" variant="secondary" onPress={clear}>Clear</HasciiButton>
          </box>
        </box>
      </box>

      <scrollbox
        ref={scrollBoxRef}
        style={{ flexGrow: 1, flexDirection: "column" }}
        scrollY={true}
        stickyScroll={false}
        verticalScrollbarOptions={{ showArrows: false }}
      >
        {groups.length === 0 && <text>(no memos in the last {app.days} days)</text>}
        {groups.map(([date, list]) => (
          <box key={date} style={{ flexDirection: "column", marginTop: 1 }}>
            <DateHeader date={date} />
            {list.map((m) =>
              viewMode === "card"
                ? <MemoCard key={m.id} memo={m} selected={false} />
                : <MemoRow key={m.id} memo={m} selected={false} />
            )}
          </box>
        ))}
      </scrollbox>

      <StatusBar hint={hint} />
    </box>
  )
}
