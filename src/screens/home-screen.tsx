import type { TextareaRenderable } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useMemo, useRef, useState } from "react"
import { appendMemo, listMemos } from "../lib/memo-repository"
import type { Memo } from "../lib/memo"
import { useApp } from "../app"
import { MemoRow } from "../components/memo-row"
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
  const [asTask, setAsTask] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

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
  }

  useKeyboard((key) => {
    if (app.readOnly) {
      if (key.name === "r") setRefreshTick((t) => t + 1)
      else if (key.name === "q") app.requestExit()
      return
    }
    if (key.name === "tab") {
      setAsTask((t) => !t)
      return
    }
    if (key.ctrl && key.name === "q") app.requestExit()
    else if (key.ctrl && key.name === "r") setRefreshTick((t) => t + 1)
  })

  const hint = app.readOnly
    ? `READ-ONLY: ${app.thinoConfig.mode}  r: refresh  q: quit`
    : "Cmd+Enter / Ctrl+Enter: submit  Tab: toggle task  Ctrl+R: reload  Ctrl+Q: quit  (or click [Submit]/[Clear])"

  return (
    <box style={{ flexDirection: "column", padding: 1, flexGrow: 1 }}>
      <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <text>{`thino-tui  (${app.thinoConfig.mode})`}</text>
        <text>{app.readOnly ? "READ-ONLY" : `${app.today()} ${app.nowHHMM()}`}</text>
      </box>

      {!app.readOnly && (
        <>
          <box style={{ border: true, marginTop: 1, height: 8 }} title="New memo">
            <textarea
              ref={textareaRef}
              placeholder="Type here, then Cmd+Enter (or Ctrl+Enter) to submit..."
              focused
              keyBindings={SUBMIT_KEY_BINDINGS}
              onSubmit={submit}
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
        </>
      )}

      {groups.length === 0 && <text>(no memos in the last {app.days} days)</text>}
      {groups.map(([date, list]) => (
        <box key={date} style={{ flexDirection: "column", marginTop: 1 }}>
          <DateHeader date={date} />
          {list.map((m) => (
            <MemoRow key={m.id} memo={m} selected={false} />
          ))}
        </box>
      ))}

      <StatusBar hint={hint} />
    </box>
  )
}
