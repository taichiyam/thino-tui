import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

export type DailyNotesConfig = {
  folder: string
  format: string
  template: string
}

const DEFAULTS: DailyNotesConfig = {
  folder: "",
  format: "YYYY-MM-DD",
  template: "",
}

export function readDailyNotesConfig(vaultPath: string): DailyNotesConfig {
  const dataPath = join(vaultPath, ".obsidian", "daily-notes.json")
  if (!existsSync(dataPath)) return DEFAULTS
  try {
    const raw = JSON.parse(readFileSync(dataPath, "utf-8")) as Record<string, unknown>
    return {
      folder: typeof raw["folder"] === "string" ? raw["folder"] : DEFAULTS.folder,
      format: typeof raw["format"] === "string" ? raw["format"] : DEFAULTS.format,
      template: typeof raw["template"] === "string" ? raw["template"] : DEFAULTS.template,
    }
  } catch {
    return DEFAULTS
  }
}
