import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

export type ThinoMode = "DAILY" | "JOURNAL" | "MULTI" | "CANVAS" | "FILE"
export type ThinoConfig = { mode: ThinoMode }

const VALID_MODES: ThinoMode[] = ["DAILY", "JOURNAL", "MULTI", "CANVAS", "FILE"]

export function readThinoConfig(vaultPath: string): ThinoConfig {
  const dataPath = join(vaultPath, ".obsidian", "plugins", "thino", "data.json")
  if (!existsSync(dataPath)) return { mode: "DAILY" }
  try {
    const raw = JSON.parse(readFileSync(dataPath, "utf-8")) as Record<string, unknown>
    const mode = String(raw["mode"] ?? "DAILY").toUpperCase() as ThinoMode
    return { mode: VALID_MODES.includes(mode) ? mode : "DAILY" }
  } catch {
    return { mode: "DAILY" }
  }
}
