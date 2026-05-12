import { createContext, useContext, useState } from "react"
import type { ThinoConfig } from "./lib/thino-config"
import { ListScreen } from "./screens/list-screen"
import { ComposeScreen } from "./screens/compose-screen"

export type AppContextValue = {
  vaultPath: string
  thinoConfig: ThinoConfig
  days: number
  readOnly: boolean
  today: () => string
  nowHHMM: () => string
  // Called when the user explicitly quits. Implementation is provided by index.tsx
  // and is responsible for tearing down the OpenTUI renderer before exiting the process.
  requestExit: () => void
}

const Ctx = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error("useApp called outside of <App>")
  return v
}

export type Screen = "list" | "compose"

export function App(props: AppContextValue) {
  const [screen, setScreen] = useState<Screen>("list")
  const value = props
  return (
    <Ctx.Provider value={value}>
      {screen === "list" && <ListScreen onCompose={() => setScreen("compose")} />}
      {screen === "compose" && <ComposeScreen onDone={() => setScreen("list")} />}
    </Ctx.Provider>
  )
}
