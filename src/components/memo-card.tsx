import type { Memo } from "../lib/memo"
import { HasciiCheckbox } from "./hascii/checkbox"
import { useHasciiTheme } from "./hascii/theme-context"

export function MemoCard({ memo, selected }: { memo: Memo; selected: boolean }) {
  const theme = useHasciiTheme()
  const marker = selected ? "▌" : " "
  const lines = memo.text.split("\n")
  const borderColor = selected ? theme.color.primary : theme.color.border
  // 1 header row + N body rows, surrounded by top+bottom borders (each 1 row).
  const cardHeight = 1 + lines.length + 2

  return (
    <box
      style={{
        flexDirection: "column",
        border: ["top", "bottom"],
        borderColor,
        paddingLeft: 1,
        paddingRight: 1,
        marginBottom: 1,
        height: cardHeight,
      }}
    >
      <box style={{ flexDirection: "row", height: 1 }}>
        <text>{`${marker} ${memo.time}  `}</text>
        {memo.isTask && <HasciiCheckbox type="ballot" isChecked={false} isDisabled />}
      </box>
      {lines.map((line, i) => (
        <box key={i} style={{ height: 1 }}>
          <text>{line}</text>
        </box>
      ))}
    </box>
  )
}
