import { existsSync, readFileSync } from "node:fs"
import { homedir, platform as osPlatform } from "node:os"
import { join } from "node:path"

export type ResolveVaultPathOptions = {
  flag?: string
  /** テスト注入用: obsidian.json のパスを上書き */
  obsidianConfigPath?: string
  /** テスト注入用: 環境変数オブジェクト */
  env?: Record<string, string | undefined>
}

export type ObsidianVault = {
  id: string
  path: string
  ts: number
  open: boolean
}

export type GetObsidianConfigPathOptions = {
  home?: string
  platform?: NodeJS.Platform
  appdata?: string
}

export function getObsidianConfigPath(opts: GetObsidianConfigPathOptions = {}): string {
  const home = opts.home ?? homedir()
  const plat = opts.platform ?? osPlatform()
  if (plat === "darwin") {
    return join(home, "Library/Application Support/obsidian/obsidian.json")
  }
  if (plat === "win32") {
    const appdata = opts.appdata ?? process.env.APPDATA ?? join(home, "AppData/Roaming")
    return join(appdata, "obsidian/obsidian.json")
  }
  return join(home, ".config/obsidian/obsidian.json")
}

export function readObsidianVaults(configPath: string): ObsidianVault[] {
  if (!existsSync(configPath)) return []
  let json: unknown
  try {
    json = JSON.parse(readFileSync(configPath, "utf-8"))
  } catch {
    return []
  }
  if (typeof json !== "object" || json === null) return []
  const vaults = (json as Record<string, unknown>).vaults
  if (typeof vaults !== "object" || vaults === null) return []
  const out: ObsidianVault[] = []
  for (const [id, v] of Object.entries(vaults as Record<string, unknown>)) {
    if (typeof v !== "object" || v === null) continue
    const vv = v as Record<string, unknown>
    if (typeof vv.path !== "string") continue
    out.push({
      id,
      path: vv.path,
      ts: typeof vv.ts === "number" ? vv.ts : 0,
      open: typeof vv.open === "boolean" ? vv.open : false,
    })
  }
  return out
}

export function pickObsidianVault(vaults: ObsidianVault[]): ObsidianVault | null {
  if (vaults.length === 0) return null
  if (vaults.length === 1) return vaults[0] ?? null
  const opened = vaults.filter((v) => v.open)
  if (opened.length === 1) return opened[0] ?? null
  const pool = opened.length > 0 ? opened : vaults
  return pool.reduce<ObsidianVault>((max, v) => (v.ts > max.ts ? v : max), pool[0]!)
}

export function resolveVaultPath(opts: ResolveVaultPathOptions = {}): string {
  if (opts.flag) return opts.flag
  const configPath = opts.obsidianConfigPath ?? getObsidianConfigPath()
  const picked = pickObsidianVault(readObsidianVaults(configPath))
  if (picked) return picked.path
  const env = opts.env ?? process.env
  const fromEnv = env.OBSIDIAN_VAULT
  if (fromEnv) return fromEnv
  throw new Error(
    "vault not found: open a vault in Obsidian once, pass --vault PATH, or set OBSIDIAN_VAULT",
  )
}
