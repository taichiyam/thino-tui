import { useEffect, useMemo, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { listMemos } from "../lib/memo-repository"
import type { Memo } from "../lib/memo"
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

  useEffect(() => {
    if (index >= memos.length) setIndex(0)
  }, [memos, index])

  useKeyboard((key) => {
    if (key.name === "j" || key.name === "down") {
      setIndex((i) => Math.min(i + 1, Math.max(memos.length - 1, 0)))
    } else if (key.name === "k" || key.name === "up") {
      setIndex((i) => Math.max(i - 1, 0))
    } else if (key.name === "g") {
      setIndex(0)
    } else if (key.name === "G") {
      setIndex(Math.max(memos.length - 1, 0))
    } else if (key.name === "r") {
      setRefreshTick((t) => t + 1)
    } else if (key.name === "n" && !app.readOnly) {
      onCompose()
    } else if (key.name === "q") {
      process.exit(0)
    }
  })

  const groups = useMemo(() => {
    const g: Record<string, Memo[]> = {}
    for (const m of memos) {
      const list = g[m.date]
      if (list) list.push(m)
      else g[m.date] = [m]
    }
    return Object.entries(g).sort(([a], [b]) => (a < b ? 1 : -1))
  }, [memos])

  const hint = app.readOnly
    ? `READ-ONLY: ${app.thinoConfig.mode}  ↑↓/jk: select  r: refresh  q: quit`
    : "↑↓/jk: select  n: new  r: refresh  q: quit"

  const selectedId = memos[index]?.id

  return (
    <box style={{ flexDirection: "column", padding: 1, flexGrow: 1 }}>
      <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <text>{`thino-tui  (${app.thinoConfig.mode})`}</text>
        <text>{app.readOnly ? "READ-ONLY" : ""}</text>
      </box>
      {groups.length === 0 && <text>(no memos in the last {app.days} days)</text>}
      {groups.map(([date, list]) => (
        <box key={date} style={{ flexDirection: "column", marginTop: 1 }}>
          <DateHeader date={date} />
          {list.map((m) => (
            <MemoRow key={m.id} memo={m} selected={selectedId === m.id} />
          ))}
        </box>
      ))}
      <StatusBar hint={hint} />
    </box>
  )
}
