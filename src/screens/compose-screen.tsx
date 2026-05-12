import type { TextareaRenderable } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useRef, useState } from "react"
import { appendMemo } from "../lib/memo-repository"
import { useApp } from "../app"
import { StatusBar } from "../components/status-bar"

export function ComposeScreen({ onDone }: { onDone: () => void }) {
  const app = useApp()
  const textareaRef = useRef<TextareaRenderable>(null)
  const [asTask, setAsTask] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useKeyboard((key) => {
    if (key.name === "escape") {
      onDone()
      return
    }
    if (key.name === "tab") {
      setAsTask((t) => !t)
      return
    }
    // Ctrl+S or Ctrl+D submits (Enter is consumed by the textarea for newlines)
    if (key.ctrl && (key.name === "s" || key.name === "d")) {
      const body = textareaRef.current?.plainText?.trim() ?? ""
      if (!body) {
        setError("body is empty")
        return
      }
      try {
        appendMemo(body, { time: app.nowHHMM(), asTask }, {
          vaultPath: app.vaultPath, today: app.today(), days: app.days,
        })
        onDone()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    }
  })

  return (
    <box style={{ flexDirection: "column", padding: 1, flexGrow: 1 }}>
      <text>{`New memo  ${app.today()} ${app.nowHHMM()}`}</text>
      <box style={{ border: true, flexGrow: 1, marginTop: 1 }} title="Memo">
        <textarea ref={textareaRef} placeholder="Type here, then Ctrl+S to submit..." focused />
      </box>
      <text>{`[${asTask ? "x" : " "}] append as task`}</text>
      {error && <text>{`error: ${error}`}</text>}
      <StatusBar hint="Ctrl+S submit  /  Tab toggle task  /  Esc cancel" />
    </box>
  )
}
