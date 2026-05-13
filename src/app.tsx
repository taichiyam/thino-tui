import { createContext, useContext } from "react"
import type { ThinoConfig } from "./lib/thino-config"
import { HomeScreen } from "./screens/home-screen"

export type AppContextValue = {
  vaultPath: string
  thinoConfig: ThinoConfig
  days: number
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

export function App(props: AppContextValue) {
  return (
    <Ctx.Provider value={props}>
      <HomeScreen />
    </Ctx.Provider>
  )
}
