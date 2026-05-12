export function StatusBar({ hint }: { hint: string }) {
  return (
    <box style={{ marginTop: 1 }}>
      <text>{hint}</text>
    </box>
  )
}
