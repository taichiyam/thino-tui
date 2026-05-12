import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  getCacheConfigPath,
  getObsidianConfigPath,
  parseLastVaultToml,
  pickObsidianVault,
  pickUnambiguousVault,
  readLastVaultCache,
  readObsidianVaults,
  resolveVaultPath,
  serializeLastVaultToml,
  writeLastVaultCache,
  type LastVaultCache,
  type ObsidianVault,
} from "../../src/lib/obsidian-config"

const FIXTURE_DIR = join(__dirname, "../fixtures/obsidian-config")
const fixture = (name: string) => join(FIXTURE_DIR, name)
const NONEXISTENT_CONFIG = "/__definitely_not_a_real_path__/obsidian.json"
const NONEXISTENT_CACHE = "/__definitely_not_a_real_path__/last-vault.toml"

describe("getObsidianConfigPath", () => {
  test("[正常] macOS は Library/Application Support 配下を返す", () => {
    const p = getObsidianConfigPath({ home: "/Users/u", platform: "darwin" })
    expect(p).toBe("/Users/u/Library/Application Support/obsidian/obsidian.json")
  })

  test("[正常] Linux は $HOME/.config 配下を返す", () => {
    const p = getObsidianConfigPath({ home: "/home/u", platform: "linux" })
    expect(p).toBe("/home/u/.config/obsidian/obsidian.json")
  })

  test("[正常] Windows は %APPDATA% 配下を返す", () => {
    const p = getObsidianConfigPath({
      home: "C:\\Users\\u",
      platform: "win32",
      appdata: "C:\\Users\\u\\AppData\\Roaming",
    })
    expect(p).toBe("C:\\Users\\u\\AppData\\Roaming/obsidian/obsidian.json")
  })

  test("[正常] win32 で appdata 未指定なら home/AppData/Roaming にフォールバックする", () => {
    const original = process.env.APPDATA
    delete process.env.APPDATA
    try {
      const p = getObsidianConfigPath({ home: "C:/Users/u", platform: "win32" })
      expect(p).toBe("C:/Users/u/AppData/Roaming/obsidian/obsidian.json")
    } finally {
      if (original === undefined) delete process.env.APPDATA
      else process.env.APPDATA = original
    }
  })
})

describe("getCacheConfigPath", () => {
  test("[正常] macOS は $HOME/.config 配下に last-vault.toml を返す", () => {
    const p = getCacheConfigPath({ home: "/Users/u", platform: "darwin" })
    expect(p).toBe("/Users/u/.config/thino-tui/last-vault.toml")
  })

  test("[正常] Linux は $XDG_CONFIG_HOME を尊重する", () => {
    const p = getCacheConfigPath({
      home: "/home/u",
      platform: "linux",
      xdgConfigHome: "/home/u/.xdg",
    })
    expect(p).toBe("/home/u/.xdg/thino-tui/last-vault.toml")
  })

  test("[正常] Linux で XDG_CONFIG_HOME 未指定なら $HOME/.config にフォールバック", () => {
    const original = process.env.XDG_CONFIG_HOME
    delete process.env.XDG_CONFIG_HOME
    try {
      const p = getCacheConfigPath({ home: "/home/u", platform: "linux" })
      expect(p).toBe("/home/u/.config/thino-tui/last-vault.toml")
    } finally {
      if (original === undefined) delete process.env.XDG_CONFIG_HOME
      else process.env.XDG_CONFIG_HOME = original
    }
  })

  test("[正常] Windows は %APPDATA% 配下を返す", () => {
    const p = getCacheConfigPath({
      home: "C:/Users/u",
      platform: "win32",
      appdata: "C:/Users/u/AppData/Roaming",
    })
    expect(p).toBe("C:/Users/u/AppData/Roaming/thino-tui/last-vault.toml")
  })
})

describe("readObsidianVaults", () => {
  test("[正常] 単一 vault をパースして返す", () => {
    const vaults = readObsidianVaults(fixture("single-vault.json"))
    expect(vaults).toHaveLength(1)
    expect(vaults[0]).toEqual({
      id: "abc123",
      path: "/path/to/only-vault",
      ts: 1700000000000,
      open: true,
    })
  })

  test("[正常] 複数 vault を全てパースして返す", () => {
    const vaults = readObsidianVaults(fixture("multi-open-one.json"))
    expect(vaults).toHaveLength(3)
    const paths = vaults.map((v) => v.path).sort()
    expect(paths).toEqual([
      "/path/to/archive-vault",
      "/path/to/personal-vault",
      "/path/to/work-vault",
    ])
  })

  test("[正常] vaults が空オブジェクトなら空配列を返す", () => {
    expect(readObsidianVaults(fixture("empty-vaults.json"))).toEqual([])
  })

  test("[正常] ファイルが存在しなければ空配列を返す", () => {
    expect(readObsidianVaults(NONEXISTENT_CONFIG)).toEqual([])
  })

  test("[異常] 壊れた JSON でも throw せず空配列を返す", () => {
    expect(readObsidianVaults(fixture("invalid.json"))).toEqual([])
  })
})

describe("pickObsidianVault (legacy, Phase A 互換)", () => {
  const make = (id: string, path: string, ts: number, open: boolean): ObsidianVault => ({
    id,
    path,
    ts,
    open,
  })

  test("[正常] 空配列なら null を返す", () => {
    expect(pickObsidianVault([])).toBeNull()
  })

  test("[正常] 1 つだけならそれを返す", () => {
    const v = make("a", "/p", 1, false)
    expect(pickObsidianVault([v])).toBe(v)
  })

  test("[正常] 複数で 1 つだけ open=true ならそれを返す", () => {
    const a = make("a", "/a", 100, false)
    const b = make("b", "/b", 200, true)
    const c = make("c", "/c", 300, false)
    expect(pickObsidianVault([a, b, c])?.path).toBe("/b")
  })

  test("[正常] 複数 open のうち ts が最大のものを返す", () => {
    const a = make("a", "/a", 100, true)
    const b = make("b", "/b", 300, true)
    const c = make("c", "/c", 200, true)
    expect(pickObsidianVault([a, b, c])?.path).toBe("/b")
  })

  test("[正常] 全部 open=false なら ts 最大のものを返す", () => {
    const a = make("a", "/a", 100, false)
    const b = make("b", "/b", 300, false)
    const c = make("c", "/c", 200, false)
    expect(pickObsidianVault([a, b, c])?.path).toBe("/b")
  })
})

describe("pickUnambiguousVault", () => {
  const make = (id: string, path: string, ts: number, open: boolean): ObsidianVault => ({
    id,
    path,
    ts,
    open,
  })

  test("[正常] 空配列なら null を返す", () => {
    expect(pickUnambiguousVault([])).toBeNull()
  })

  test("[正常] 1 つだけならそれを返す", () => {
    const v = make("a", "/p", 1, false)
    expect(pickUnambiguousVault([v])).toBe(v)
  })

  test("[正常] 複数 vault で open: true が 1 個ならそれを返す", () => {
    const a = make("a", "/a", 100, false)
    const b = make("b", "/b", 200, true)
    const c = make("c", "/c", 300, false)
    expect(pickUnambiguousVault([a, b, c])?.path).toBe("/b")
  })

  test("[正常] 複数 open があれば曖昧として null を返す", () => {
    const a = make("a", "/a", 100, true)
    const b = make("b", "/b", 200, true)
    expect(pickUnambiguousVault([a, b])).toBeNull()
  })

  test("[正常] 複数 vault で全部 open=false なら曖昧として null を返す", () => {
    const a = make("a", "/a", 100, false)
    const b = make("b", "/b", 200, false)
    expect(pickUnambiguousVault([a, b])).toBeNull()
  })
})

describe("serializeLastVaultToml / parseLastVaultToml", () => {
  test("[正常] シリアライズ → パースで往復一致する", () => {
    const cache: LastVaultCache = {
      id: "abc123",
      path: "/Users/u/PKM",
      savedAt: "2026-05-12T13:30:00.000Z",
    }
    const toml = serializeLastVaultToml(cache)
    expect(parseLastVaultToml(toml)).toEqual(cache)
  })

  test("[正常] バックスラッシュ / ダブルクォート / 改行を含むパスでも往復する", () => {
    const cache: LastVaultCache = {
      id: "id",
      path: 'C:\\Users\\u\\Vault "with quote"\nnext line',
      savedAt: "2026-05-12T13:30:00.000Z",
    }
    const toml = serializeLastVaultToml(cache)
    expect(parseLastVaultToml(toml)).toEqual(cache)
  })

  test("[正常] コメント行・空行は無視される", () => {
    const toml = `# header comment

id = "abc"
path = "/p"
saved_at = "2026-05-12T00:00:00.000Z"

# trailing
`
    expect(parseLastVaultToml(toml)).toEqual({
      id: "abc",
      path: "/p",
      savedAt: "2026-05-12T00:00:00.000Z",
    })
  })

  test("[異常] 必須フィールドが欠けていたら null を返す", () => {
    expect(parseLastVaultToml(`id = "x"\npath = "/p"\n`)).toBeNull()
    expect(parseLastVaultToml(``)).toBeNull()
  })

  test("[正常] シリアライズ出力は末尾に改行を含む", () => {
    const toml = serializeLastVaultToml({
      id: "x",
      path: "/p",
      savedAt: "2026-05-12T00:00:00.000Z",
    })
    expect(toml.endsWith("\n")).toBe(true)
  })
})

describe("readLastVaultCache / writeLastVaultCache", () => {
  let tmpDir = ""

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "thino-tui-cache-"))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  test("[正常] ファイル不在なら null を返す", () => {
    expect(readLastVaultCache(NONEXISTENT_CACHE)).toBeNull()
  })

  test("[正常] 書き込み後に読み戻すと一致する", () => {
    const path = join(tmpDir, "nested/dir/last-vault.toml")
    const cache: LastVaultCache = {
      id: "abc",
      path: "/v",
      savedAt: "2026-05-12T00:00:00.000Z",
    }
    writeLastVaultCache(path, cache)
    expect(existsSync(path)).toBe(true)
    expect(readLastVaultCache(path)).toEqual(cache)
  })

  test("[正常] write は必要に応じてディレクトリを再帰的に作る", () => {
    const path = join(tmpDir, "a/b/c/last-vault.toml")
    writeLastVaultCache(path, {
      id: "x",
      path: "/p",
      savedAt: "2026-05-12T00:00:00.000Z",
    })
    expect(existsSync(path)).toBe(true)
  })

  test("[異常] 壊れた TOML を読んだら null を返す", () => {
    const path = join(tmpDir, "broken.toml")
    writeFileSync(path, "not a toml at all", "utf-8")
    expect(readLastVaultCache(path)).toBeNull()
  })
})

describe("resolveVaultPath", () => {
  let tmpDir = ""

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "thino-tui-resolve-"))
  })
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  const cachePathIn = (name = "last-vault.toml") => join(tmpDir, name)
  const neverPrompt = async (): Promise<ObsidianVault> => {
    throw new Error("prompt should not be called")
  }

  test("[正常] --vault フラグが最優先で採用される (env も obsidian.json もある場合)", async () => {
    expect(
      await resolveVaultPath({
        flag: "/from-flag",
        obsidianConfigPath: fixture("single-vault.json"),
        cacheConfigPath: cachePathIn(),
        env: { OBSIDIAN_VAULT: "/from-env" },
        prompt: neverPrompt,
      }),
    ).toBe("/from-flag")
  })

  test("[正常] vault 1 個なら自動採用、プロンプトは呼ばれない", async () => {
    expect(
      await resolveVaultPath({
        obsidianConfigPath: fixture("single-vault.json"),
        cacheConfigPath: cachePathIn(),
        env: { OBSIDIAN_VAULT: "/from-env" },
        prompt: neverPrompt,
      }),
    ).toBe("/path/to/only-vault")
  })

  test("[正常] obsidian.json が無ければ OBSIDIAN_VAULT にフォールバック", async () => {
    expect(
      await resolveVaultPath({
        obsidianConfigPath: NONEXISTENT_CONFIG,
        cacheConfigPath: cachePathIn(),
        env: { OBSIDIAN_VAULT: "/from-env" },
        prompt: neverPrompt,
      }),
    ).toBe("/from-env")
  })

  test("[正常] multi vault で open: true が一意ならそれが採用される (プロンプト不要)", async () => {
    expect(
      await resolveVaultPath({
        obsidianConfigPath: fixture("multi-open-one.json"),
        cacheConfigPath: cachePathIn(),
        env: {},
        prompt: neverPrompt,
      }),
    ).toBe("/path/to/personal-vault")
  })

  test("[正常] 曖昧 (全 closed) のときプロンプトが呼ばれ、選択結果が採用される", async () => {
    let promptedWith: ObsidianVault[] = []
    const picked = await resolveVaultPath({
      obsidianConfigPath: fixture("multi-all-closed.json"),
      cacheConfigPath: cachePathIn(),
      env: {},
      prompt: async (vaults) => {
        promptedWith = vaults
        // 候補の中から path="/path/to/middle" を選ぶ
        return vaults.find((v) => v.path === "/path/to/middle")!
      },
      now: () => new Date("2026-05-12T13:30:00.000Z"),
    })
    expect(picked).toBe("/path/to/middle")
    expect(promptedWith.length).toBe(3)
  })

  test("[正常] プロンプト選択後に last-vault キャッシュが書き込まれる", async () => {
    const cachePath = cachePathIn()
    await resolveVaultPath({
      obsidianConfigPath: fixture("multi-all-closed.json"),
      cacheConfigPath: cachePath,
      env: {},
      prompt: async (vaults) => vaults.find((v) => v.path === "/path/to/recent")!,
      now: () => new Date("2026-05-12T13:30:00.000Z"),
    })
    expect(existsSync(cachePath)).toBe(true)
    const cache = readLastVaultCache(cachePath)
    expect(cache?.path).toBe("/path/to/recent")
    expect(cache?.savedAt).toBe("2026-05-12T13:30:00.000Z")
  })

  test("[正常] キャッシュが有効ならプロンプトは呼ばれずキャッシュの vault が採用される", async () => {
    const cachePath = cachePathIn()
    writeLastVaultCache(cachePath, {
      id: "v3", // multi-all-closed.json の v3 に存在する id
      path: "/path/to/middle",
      savedAt: "2026-05-10T00:00:00.000Z",
    })
    expect(
      await resolveVaultPath({
        obsidianConfigPath: fixture("multi-all-closed.json"),
        cacheConfigPath: cachePath,
        env: {},
        prompt: neverPrompt,
      }),
    ).toBe("/path/to/middle")
  })

  test("[正常] キャッシュの id が現 vault list に無ければ path で照合する", async () => {
    const cachePath = cachePathIn()
    writeLastVaultCache(cachePath, {
      id: "unknown-id",
      path: "/path/to/recent",
      savedAt: "2026-05-10T00:00:00.000Z",
    })
    expect(
      await resolveVaultPath({
        obsidianConfigPath: fixture("multi-all-closed.json"),
        cacheConfigPath: cachePath,
        env: {},
        prompt: neverPrompt,
      }),
    ).toBe("/path/to/recent")
  })

  test("[正常] キャッシュの vault が消えていたらプロンプトを出す", async () => {
    const cachePath = cachePathIn()
    writeLastVaultCache(cachePath, {
      id: "stale-id",
      path: "/path/to/no-longer-exists",
      savedAt: "2026-05-10T00:00:00.000Z",
    })
    let promptCalled = false
    await resolveVaultPath({
      obsidianConfigPath: fixture("multi-all-closed.json"),
      cacheConfigPath: cachePath,
      env: {},
      prompt: async (vaults) => {
        promptCalled = true
        return vaults[0]!
      },
      now: () => new Date("2026-05-12T13:30:00.000Z"),
    })
    expect(promptCalled).toBe(true)
  })

  test("[正常] reset=true ならキャッシュを無視してプロンプトを出す", async () => {
    const cachePath = cachePathIn()
    writeLastVaultCache(cachePath, {
      id: "v3",
      path: "/path/to/middle",
      savedAt: "2026-05-10T00:00:00.000Z",
    })
    let promptCalled = false
    await resolveVaultPath({
      obsidianConfigPath: fixture("multi-all-closed.json"),
      cacheConfigPath: cachePath,
      env: {},
      reset: true,
      prompt: async (vaults) => {
        promptCalled = true
        return vaults.find((v) => v.path === "/path/to/old")!
      },
      now: () => new Date("2026-05-12T13:30:00.000Z"),
    })
    expect(promptCalled).toBe(true)
    expect(readLastVaultCache(cachePath)?.path).toBe("/path/to/old")
  })

  test("[異常] vault も env も無く解決できない場合エラーになる", async () => {
    await expect(
      resolveVaultPath({
        obsidianConfigPath: NONEXISTENT_CONFIG,
        cacheConfigPath: cachePathIn(),
        env: {},
        prompt: neverPrompt,
      }),
    ).rejects.toThrow(/vault not found/i)
  })

  test("[異常] エラーメッセージに対処法 (--vault / Obsidian / OBSIDIAN_VAULT) が含まれる", async () => {
    try {
      await resolveVaultPath({
        obsidianConfigPath: NONEXISTENT_CONFIG,
        cacheConfigPath: cachePathIn(),
        env: {},
        prompt: neverPrompt,
      })
      throw new Error("should have thrown")
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      expect(msg).toMatch(/--vault/)
      expect(msg).toMatch(/Obsidian/i)
      expect(msg).toMatch(/OBSIDIAN_VAULT/)
    }
  })
})
