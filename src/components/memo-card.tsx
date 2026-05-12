import type { Memo } from "../lib/memo"
import { HasciiCheckbox } from "./hascii/checkbox"
import { useHasciiTheme } from "./hascii/theme-context"

const HEADER_ROWS = 1
const BORDER_ROWS = 2

export function MemoCard({ memo, selected }: { memo: Memo; selected: boolean }) {
  const theme = useHasciiTheme()
  const marker = selected ? "▌" : " "
  const lines = memo.text.split(/\r?\n/)
  const borderColor = selected ? theme.color.primary : theme.color.border
  const cardHeight = HEADER_ROWS + lines.length + BORDER_ROWS

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
