import { createContext, useContext, useMemo, useState } from "react"
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
  const value = useMemo(() => props, [props])
  return (
    <Ctx.Provider value={value}>
      {screen === "list" && <ListScreen onCompose={() => setScreen("compose")} />}
      {screen === "compose" && <ComposeScreen onDone={() => setScreen("list")} />}
    </Ctx.Provider>
  )
}
