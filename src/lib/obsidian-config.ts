import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir, platform as osPlatform } from "node:os"
import { dirname, join } from "node:path"

export type ObsidianVault = {
  id: string
  path: string
  ts: number
  open: boolean
}

export type LastVaultCache = {
  id: string
  path: string
  savedAt: string
}

export type ResolveVaultPathOptions = {
  flag?: string
  /** true なら last-vault キャッシュを無視して必ずプロンプトを出す */
  reset?: boolean
  /** テスト注入用: obsidian.json のパスを上書き */
  obsidianConfigPath?: string
  /** テスト注入用: last-vault.toml のパスを上書き */
  cacheConfigPath?: string
  /** テスト注入用: 環境変数オブジェクト */
  env?: Record<string, string | undefined>
  /** テスト注入用: プロンプト関数 */
  prompt?: (vaults: ObsidianVault[]) => Promise<ObsidianVault>
  /** テスト注入用: 現在時刻ファクトリ */
  now?: () => Date
}

export type GetObsidianConfigPathOptions = {
  home?: string
  platform?: NodeJS.Platform
  appdata?: string
}

export type GetCacheConfigPathOptions = {
  home?: string
  platform?: NodeJS.Platform
  appdata?: string
  xdgConfigHome?: string
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

export function getCacheConfigPath(opts: GetCacheConfigPathOptions = {}): string {
  const home = opts.home ?? homedir()
  const plat = opts.platform ?? osPlatform()
  if (plat === "win32") {
    const appdata = opts.appdata ?? process.env.APPDATA ?? join(home, "AppData/Roaming")
    return join(appdata, "thino-tui/last-vault.toml")
  }
  const xdg = opts.xdgConfigHome ?? process.env.XDG_CONFIG_HOME ?? join(home, ".config")
  return join(xdg, "thino-tui/last-vault.toml")
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

/** vault が 1 個に決まる場合のみ返す。曖昧（複数あり、かつ open: true が 1 個でない）なら null */
export function pickUnambiguousVault(vaults: ObsidianVault[]): ObsidianVault | null {
  if (vaults.length === 0) return null
  if (vaults.length === 1) return vaults[0] ?? null
  const opened = vaults.filter((v) => v.open)
  if (opened.length === 1) return opened[0] ?? null
  return null
}

/**
 * Phase A 互換: 曖昧時もフォールバックして 1 つ返す（open 優先 → ts 最大）。
 * 互換性のため残しているが、新規ロジックは `pickUnambiguousVault` + プロンプトを使う。
 */
export function pickObsidianVault(vaults: ObsidianVault[]): ObsidianVault | null {
  const unambiguous = pickUnambiguousVault(vaults)
  if (unambiguous) return unambiguous
  if (vaults.length === 0) return null
  const opened = vaults.filter((v) => v.open)
  const pool = opened.length > 0 ? opened : vaults
  return pool.reduce<ObsidianVault>((max, v) => (v.ts > max.ts ? v : max), pool[0]!)
}

// === TOML I/O for last-vault.toml ===
// 単純な key = "value" 行だけのフォーマットに限定した最小実装。
// 依存追加を避けるため自前パース。

const TOML_LINE = /^([a-z_]+)\s*=\s*"((?:[^"\\]|\\.)*)"$/

function escapeTomlString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
}

function unescapeTomlString(s: string): string {
  return s.replace(/\\(.)/g, (_, c) => {
    switch (c) {
      case "n":
        return "\n"
      case "r":
        return "\r"
      case "t":
        return "\t"
      case "\\":
        return "\\"
      case '"':
        return '"'
      default:
        return c
    }
  })
}

export function serializeLastVaultToml(cache: LastVaultCache): string {
  return [
    `id = "${escapeTomlString(cache.id)}"`,
    `path = "${escapeTomlString(cache.path)}"`,
    `saved_at = "${escapeTomlString(cache.savedAt)}"`,
    "",
  ].join("\n")
}

export function parseLastVaultToml(raw: string): LastVaultCache | null {
  const fields: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const m = trimmed.match(TOML_LINE)
    if (!m) continue
    fields[m[1]!] = unescapeTomlString(m[2]!)
  }
  const { id, path, saved_at: savedAt } = fields
  if (!id || !path || !savedAt) return null
  return { id, path, savedAt }
}

export function readLastVaultCache(cachePath: string): LastVaultCache | null {
  if (!existsSync(cachePath)) return null
  try {
    return parseLastVaultToml(readFileSync(cachePath, "utf-8"))
  } catch {
    return null
  }
}

export function writeLastVaultCache(cachePath: string, cache: LastVaultCache): void {
  mkdirSync(dirname(cachePath), { recursive: true })
  writeFileSync(cachePath, serializeLastVaultToml(cache), "utf-8")
}

// === CLI prompt ===

/** 標準入力で vault を選ばせるデフォルトの対話プロンプト */
export async function promptVaultChoice(vaults: ObsidianVault[]): Promise<ObsidianVault> {
  const { createInterface } = await import("node:readline")
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  process.stdout.write("\n複数の Obsidian vault が見つかりました。thino-tui で使う vault を選択してください:\n")
  vaults.forEach((v, i) => {
    const mark = v.open ? " (open)" : ""
    process.stdout.write(`  [${i + 1}] ${v.path}${mark}\n`)
  })
  return await new Promise<ObsidianVault>((resolve, reject) => {
    const ask = () => {
      rl.question(`> (1-${vaults.length}): `, (ans) => {
        const idx = Number.parseInt(ans.trim(), 10)
        if (Number.isFinite(idx) && idx >= 1 && idx <= vaults.length) {
          rl.close()
          resolve(vaults[idx - 1]!)
          return
        }
        process.stdout.write(`  1〜${vaults.length} の数字を入力してください。\n`)
        ask()
      })
    }
    rl.on("close", () => reject(new Error("vault selection cancelled")))
    ask()
  })
}

// === resolve ===

export async function resolveVaultPath(opts: ResolveVaultPathOptions = {}): Promise<string> {
  if (opts.flag) return opts.flag
  const configPath = opts.obsidianConfigPath ?? getObsidianConfigPath()
  const vaults = readObsidianVaults(configPath)

  // 1. unambiguous (vault 1 個 or open: true が一意)
  const unambiguous = pickUnambiguousVault(vaults)
  if (unambiguous) return unambiguous.path

  // 2. 曖昧 (vault 複数 ∧ open != 1 個)
  if (vaults.length > 1) {
    const cachePath = opts.cacheConfigPath ?? getCacheConfigPath()
    if (!opts.reset) {
      const cache = readLastVaultCache(cachePath)
      if (cache) {
        const match =
          vaults.find((v) => v.id === cache.id) ?? vaults.find((v) => v.path === cache.path)
        if (match) return match.path
      }
    }
    const prompt = opts.prompt ?? promptVaultChoice
    const picked = await prompt(vaults)
    const now = opts.now ?? (() => new Date())
    writeLastVaultCache(cachePath, {
      id: picked.id,
      path: picked.path,
      savedAt: now().toISOString(),
    })
    return picked.path
  }

  // 3. 環境変数フォールバック (vault 0 個でも未指定の救済)
  const env = opts.env ?? process.env
  const fromEnv = env.OBSIDIAN_VAULT
  if (fromEnv) return fromEnv
  throw new Error(
    "vault not found: open a vault in Obsidian once, pass --vault PATH, or set OBSIDIAN_VAULT",
  )
}
