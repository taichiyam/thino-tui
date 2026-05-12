import type { Memo } from "../lib/memo"

export function MemoRow({ memo, selected }: { memo: Memo; selected: boolean }) {
  const marker = selected ? "▌" : " "
  return <text>{`${marker} ${memo.time}  ${memo.text}`}</text>
}
