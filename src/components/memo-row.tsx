import type { Memo } from "../lib/memo"
import { HasciiCheckbox } from "./hascii/checkbox"

export function MemoRow({ memo, selected }: { memo: Memo; selected: boolean }) {
  const marker = selected ? "▌" : " "
  const lines = memo.text.split("\n")

  if (lines.length <= 1) {
    const body = lines[0] ?? ""
    if (memo.isTask) {
      return (
        <box style={{ flexDirection: "row", height: 1 }}>
          <text>{`${marker} ${memo.time}  `}</text>
          <HasciiCheckbox type="ballot" isChecked={false} isDisabled />
          <text>{` ${body}`}</text>
        </box>
      )
    }
    return (
      <box style={{ flexDirection: "row", height: 1 }}>
        <text>{`${marker} ${memo.time}  ${body}`}</text>
      </box>
    )
  }

  const firstLine = lines[0] ?? ""
  const restLines = lines.slice(1)
  // For task memos, indent subsequent lines 2 more spaces so they align under the checkbox label.
  const restIndent = memo.isTask ? "        " : "      "

  return (
    <box style={{ flexDirection: "column" }}>
      <box style={{ height: 1 }}>
        <text>{`${marker} ${memo.time}`}</text>
      </box>
      {memo.isTask ? (
        <box style={{ flexDirection: "row", height: 1 }}>
          <text>{"      "}</text>
          <HasciiCheckbox type="ballot" isChecked={false} isDisabled />
          <text>{` ${firstLine}`}</text>
        </box>
      ) : (
        <box style={{ height: 1 }}>
          <text>{`      ${firstLine}`}</text>
        </box>
      )}
      {restLines.map((line, i) => (
        <box key={i + 1} style={{ height: 1 }}>
          <text>{`${restIndent}${line}`}</text>
        </box>
      ))}
    </box>
  )
}
