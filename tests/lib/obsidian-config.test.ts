import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { resolveVaultPath } from "../../src/lib/obsidian-config"

describe("resolveVaultPath", () => {
  const original = process.env.OBSIDIAN_VAULT

  beforeEach(() => {
    delete process.env.OBSIDIAN_VAULT
  })
  afterEach(() => {
    if (original === undefined) delete process.env.OBSIDIAN_VAULT
    else process.env.OBSIDIAN_VAULT = original
  })

  test("[正常] --vault フラグが最優先で採用される", () => {
    process.env.OBSIDIAN_VAULT = "/from-env"
    expect(resolveVaultPath({ flag: "/from-flag" })).toBe("/from-flag")
  })

  test("[正常] フラグ未指定なら OBSIDIAN_VAULT を使う", () => {
    process.env.OBSIDIAN_VAULT = "/from-env"
    expect(resolveVaultPath({})).toBe("/from-env")
  })

  test("[異常] フラグも環境変数も無ければ throw する", () => {
    expect(() => resolveVaultPath({})).toThrow(/vault not found/i)
  })
})
