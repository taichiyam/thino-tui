import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import {
  getObsidianConfigPath,
  pickObsidianVault,
  readObsidianVaults,
  resolveVaultPath,
  type ObsidianVault,
} from "../../src/lib/obsidian-config"

const FIXTURE_DIR = join(__dirname, "../fixtures/obsidian-config")
const fixture = (name: string) => join(FIXTURE_DIR, name)
const NONEXISTENT_CONFIG = "/__definitely_not_a_real_path__/obsidian.json"

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

describe("pickObsidianVault", () => {
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

describe("resolveVaultPath", () => {
  test("[正常] --vault フラグが最優先で採用される (env も obsidian.json もある場合)", () => {
    expect(
      resolveVaultPath({
        flag: "/from-flag",
        obsidianConfigPath: fixture("single-vault.json"),
        env: { OBSIDIAN_VAULT: "/from-env" },
      }),
    ).toBe("/from-flag")
  })

  test("[正常] フラグが無ければ obsidian.json を採用する (env より優先)", () => {
    expect(
      resolveVaultPath({
        obsidianConfigPath: fixture("single-vault.json"),
        env: { OBSIDIAN_VAULT: "/from-env" },
      }),
    ).toBe("/path/to/only-vault")
  })

  test("[正常] obsidian.json が見つからなければ OBSIDIAN_VAULT にフォールバック", () => {
    expect(
      resolveVaultPath({
        obsidianConfigPath: NONEXISTENT_CONFIG,
        env: { OBSIDIAN_VAULT: "/from-env" },
      }),
    ).toBe("/from-env")
  })

  test("[正常] obsidian.json が空 vault でも OBSIDIAN_VAULT にフォールバック", () => {
    expect(
      resolveVaultPath({
        obsidianConfigPath: fixture("empty-vaults.json"),
        env: { OBSIDIAN_VAULT: "/from-env" },
      }),
    ).toBe("/from-env")
  })

  test("[正常] multi vault では open: true のものが採用される", () => {
    expect(
      resolveVaultPath({
        obsidianConfigPath: fixture("multi-open-one.json"),
        env: {},
      }),
    ).toBe("/path/to/personal-vault")
  })

  test("[正常] multi vault で全 closed なら ts 最大のものが採用される", () => {
    expect(
      resolveVaultPath({
        obsidianConfigPath: fixture("multi-all-closed.json"),
        env: {},
      }),
    ).toBe("/path/to/recent")
  })

  test("[異常] フラグ・obsidian.json・環境変数のいずれも無ければエラーになる", () => {
    expect(() =>
      resolveVaultPath({
        obsidianConfigPath: NONEXISTENT_CONFIG,
        env: {},
      }),
    ).toThrow(/vault not found/i)
  })

  test("[異常] エラーメッセージに対処法 (--vault / Obsidian / OBSIDIAN_VAULT) が含まれる", () => {
    try {
      resolveVaultPath({ obsidianConfigPath: NONEXISTENT_CONFIG, env: {} })
      throw new Error("should have thrown")
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      expect(msg).toMatch(/--vault/)
      expect(msg).toMatch(/Obsidian/i)
      expect(msg).toMatch(/OBSIDIAN_VAULT/)
    }
  })
})
