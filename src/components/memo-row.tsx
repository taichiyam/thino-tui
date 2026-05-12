import type { Memo } from "../lib/memo"

export function MemoRow({ memo, selected }: { memo: Memo; selected: boolean }) {
  const marker = selected ? "▌" : " "
  const lines = memo.text.split("\n")
  if (lines.length <= 1) {
    return (
      <box style={{ flexDirection: "row", height: 1 }}>
        <text>{`${marker} ${memo.time}  ${lines[0] ?? ""}`}</text>
      </box>
    )
  }
  return (
    <box style={{ flexDirection: "column" }}>
      <box style={{ height: 1 }}>
        <text>{`${marker} ${memo.time}`}</text>
      </box>
      {lines.map((line, i) => (
        <box key={i} style={{ height: 1 }}>
          <text>{`      ${line}`}</text>
        </box>
      ))}
    </box>
  )
}
