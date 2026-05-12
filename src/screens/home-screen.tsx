import type { TextareaRenderable } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { statSync } from "node:fs"
import { useEffect, useMemo, useRef, useState } from "react"
import { appendMemo, listDailyNotePaths, listMemos } from "../lib/memo-repository"
import type { Memo } from "../lib/memo"
import { writeAppConfig } from "../lib/config"
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

const INTERVAL_CYCLE = [60, 30, 120, "off"] as const
type IntervalOption = typeof INTERVAL_CYCLE[number]

function nextInterval(current: IntervalOption): IntervalOption {
  const idx = INTERVAL_CYCLE.indexOf(current)
  return INTERVAL_CYCLE[(idx + 1) % INTERVAL_CYCLE.length]!
}

function intervalLabel(v: IntervalOption): string {
  return v === "off" ? "off" : `${v}s`
}

function getMtimes(paths: string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const p of paths) {
    try { m.set(p, statSync(p).mtimeMs) } catch { /* file may not exist yet */ }
  }
  return m
}

function hasMtimeChanged(paths: string[], prev: Map<string, number>): boolean {
  for (const p of paths) {
    try {
      if (statSync(p).mtimeMs !== (prev.get(p) ?? -1)) return true
    } catch {
      if (prev.has(p)) return true
    }
  }
  return false
}

export function HomeScreen() {
  const app = useApp()
  const textareaRef = useRef<TextareaRenderable>(null)
  const [asTask, setAsTask] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [viewMode, setViewMode] = useState<"line" | "card">("line")
  const [reloadInterval, setReloadIntervalState] = useState<IntervalOption>(() => {
    const v = app.reloadInterval
    if (v === "off") return "off"
    const n = Number(v)
    return (Number.isFinite(n) && INTERVAL_CYCLE.includes(n as IntervalOption))
      ? (n as IntervalOption)
      : 60
  })
  const [reloadedAt, setReloadedAt] = useState<string | null>(null)

  // Track file mtimes to avoid unnecessary re-parses on auto-reload
  const lastMtimesRef = useRef<Map<string, number>>(new Map())

  const memos = useMemo(
    () => listMemos({ vaultPath: app.vaultPath, today: app.today(), days: app.days }),
    [app, refreshTick],
  )

  // Initialise mtime cache after first load
  useEffect(() => {
    const paths = listDailyNotePaths({ vaultPath: app.vaultPath, today: app.today(), days: app.days })
    lastMtimesRef.current = getMtimes(paths)
  }, [app])

  // Auto-reload: silent background poll
  useEffect(() => {
    if (reloadInterval === "off") return
    const ms = reloadInterval * 1000
    const id = setInterval(() => {
      const paths = listDailyNotePaths({ vaultPath: app.vaultPath, today: app.today(), days: app.days })
      if (!hasMtimeChanged(paths, lastMtimesRef.current)) return
      lastMtimesRef.current = getMtimes(paths)
      setRefreshTick((t) => t + 1)
      // No UI feedback for auto-reload — intentionally silent
    }, ms)
    return () => clearInterval(id)
  }, [reloadInterval, app])

  // Clear "Reloaded at HH:MM" feedback after 3 seconds
  useEffect(() => {
    if (!reloadedAt) return
    const id = setTimeout(() => setReloadedAt(null), 3000)
    return () => clearTimeout(id)
  }, [reloadedAt])

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

  const toggleView = () => setViewMode((m) => (m === "line" ? "card" : "line"))

  const manualReload = () => {
    const paths = listDailyNotePaths({ vaultPath: app.vaultPath, today: app.today(), days: app.days })
    lastMtimesRef.current = getMtimes(paths)
    setRefreshTick((t) => t + 1)
    setReloadedAt(app.nowHHMM())
  }

  const cycleInterval = () => {
    const next = nextInterval(reloadInterval)
    setReloadIntervalState(next)
    writeAppConfig({ reloadInterval: next })
  }

  useKeyboard((key) => {
    // Ctrl+C is reserved by the terminal/runtime for SIGINT, so use Ctrl+V for the view toggle.
    if (key.ctrl && key.name === "v") {
      toggleView()
      return
    }
    if (app.readOnly) {
      if (key.ctrl || key.meta) return
      if (key.name === "R" || (key.shift && key.name === "r")) cycleInterval()
      else if (key.name === "r") manualReload()
      else if (key.name === "q") app.requestExit()
      else if (key.name === "c") toggleView()
      return
    }
    if (key.name === "tab") {
      setAsTask((t) => !t)
      return
    }
    if (key.ctrl && key.name === "q") app.requestExit()
    else if (key.ctrl && key.name === "r") manualReload()
    else if (key.name === "R" || (key.shift && key.name === "r")) cycleInterval()
  })

  const intervalInfo = `[${intervalLabel(reloadInterval)}]`
  const reloadFeedback = reloadedAt ? `  ✓ Reloaded ${reloadedAt}` : ""

  const hint = app.readOnly
    ? `READ-ONLY: ${app.thinoConfig.mode}  r: refresh  c/Ctrl+V: toggle view  R: interval${intervalInfo}  q: quit${reloadFeedback}`
    : `Cmd/Ctrl+Enter: submit  Tab: toggle task  Ctrl+V: toggle view  R: interval${intervalInfo}  Ctrl+R: reload  Ctrl+Q: quit${reloadFeedback}`

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
          {list.map((m) =>
            viewMode === "card"
              ? <MemoCard key={m.id} memo={m} selected={false} />
              : <MemoRow key={m.id} memo={m} selected={false} />
          )}
        </box>
      ))}

      <StatusBar hint={hint} />
    </box>
  )
}
