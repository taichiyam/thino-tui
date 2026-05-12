import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir, platform as osPlatform } from "node:os"
import { dirname, join } from "node:path"

export type AppConfig = {
  reloadInterval: number | "off"
}

export type GetAppConfigPathOptions = {
  home?: string
  platform?: NodeJS.Platform
  appdata?: string
  xdgConfigHome?: string
}

export function getAppConfigPath(opts: GetAppConfigPathOptions = {}): string {
  const home = opts.home ?? homedir()
  const plat = opts.platform ?? osPlatform()
  if (plat === "win32") {
    const appdata = opts.appdata ?? process.env.APPDATA ?? join(home, "AppData/Roaming")
    return join(appdata, "thino-tui/config.toml")
  }
  const xdg = opts.xdgConfigHome ?? process.env.XDG_CONFIG_HOME ?? join(home, ".config")
  return join(xdg, "thino-tui/config.toml")
}

const TOML_LINE = /^([a-z_]+)\s*=\s*"((?:[^"\\]|\\.)*)"/

export function readAppConfig(configPath?: string): AppConfig {
  const path = configPath ?? getAppConfigPath()
  if (!existsSync(path)) return { reloadInterval: 60 }
  try {
    const fields: Record<string, string> = {}
    for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const m = trimmed.match(TOML_LINE)
      if (!m) continue
      fields[m[1]!] = m[2]!
    }
    const v = fields["reload_interval"]
    if (v === "off") return { reloadInterval: "off" }
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) return { reloadInterval: n }
    return { reloadInterval: 60 }
  } catch {
    return { reloadInterval: 60 }
  }
}

export function writeAppConfig(config: AppConfig, configPath?: string): void {
  const path = configPath ?? getAppConfigPath()
  mkdirSync(dirname(path), { recursive: true })
  const v = config.reloadInterval === "off" ? "off" : String(config.reloadInterval)
  writeFileSync(path, `reload_interval = "${v}"\n`, "utf-8")
}
