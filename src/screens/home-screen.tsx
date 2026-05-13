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

export function HomeScreen() {
  const app = useApp()
  const textareaRef = useRef<TextareaRenderable>(null)
  const scrollBoxRef = useRef<ScrollBoxRenderable>(null)
  const [asTask, setAsTask] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [viewMode, setViewMode] = useState<"line" | "card">("line")

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

  const focusTextarea = () => textareaRef.current?.focus()

  const submit = () => {
    const body = textareaRef.current?.plainText?.trim() ?? ""
    if (!body) {
      setError("body is empty")
      focusTextarea()
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
    focusTextarea()
  }

  const clear = () => {
    textareaRef.current?.clear()
    setAsTask(false)
    setError(null)
    focusTextarea()
  }

  const toggleView = () => setViewMode((m) => (m === "line" ? "card" : "line"))

  const scrollDown = () => scrollBoxRef.current?.scrollBy(3)
  const scrollUp = () => scrollBoxRef.current?.scrollBy(-3)
  const scrollPageDown = () => scrollBoxRef.current?.scrollBy(0.5, "viewport")
  const scrollPageUp = () => scrollBoxRef.current?.scrollBy(-0.5, "viewport")

  const isAtTextareaLastLine = () => {
    const t = textareaRef.current
    if (!t) return false
    return t.logicalCursor.row >= t.lineCount - 1
  }
  const isAtTextareaFirstLine = () => {
    const t = textareaRef.current
    if (!t) return false
    return t.logicalCursor.row <= 0
  }

  // textarea の最終行/先頭行で ↓/↑ が押されたらメモ一覧をスクロール。
  // textarea はフォーカスを失わないので、続けてタイピング可能。
  const handleTextareaKeyDown = (key: KeyEvent) => {
    if (key.name === "down" && isAtTextareaLastLine()) {
      scrollDown()
    } else if (key.name === "up" && isAtTextareaFirstLine()) {
      scrollUp()
    }
  }

  // scrollbox はフォーカス不可にして textarea からフォーカスを奪わないようにする。
  // OpenTUI のデフォルトでは scrollbox がマウス操作で focus を取りに行ってしまうため。
  useEffect(() => {
    const sb = scrollBoxRef.current
    if (sb) sb.focusable = false
  }, [])

  // textarea へのマウス操作で常にフォーカスを取り戻せるようにする。
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    const handler = () => focusTextarea()
    ta.onMouseDown = handler
    ta.onMouseOver = handler
    return () => {
      ta.onMouseDown = undefined
      ta.onMouseOver = undefined
    }
  }, [])

  useKeyboard((key) => {
    if (key.ctrl && key.name === "q") { app.requestExit(); return }
    if (key.ctrl && key.name === "r") { setRefreshTick((t) => t + 1); return }
    if (key.ctrl && key.name === "v") { toggleView(); return }
    if (key.name === "pagedown") { scrollPageDown(); return }
    if (key.name === "pageup") { scrollPageUp(); return }
    if (key.name === "tab") { setAsTask((t) => !t); return }
  })

  const hint = "Cmd/Ctrl+Enter: submit  Tab: as-task  ↑↓(@ends)/PgUp/PgDn: scroll  Ctrl+V: view  Ctrl+R/Q: reload/quit"

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
          focused
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
