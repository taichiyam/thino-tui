import { describe, expect, test } from "bun:test"
import { readThinoConfig } from "../../src/lib/thino-config"
import { join } from "node:path"

const fixtureVault = join(import.meta.dir, "..", "fixtures", "vault")

describe("readThinoConfig", () => {
  test("[正常] DAILY モード設定を読み取れる", () => {
    expect(readThinoConfig(fixtureVault)).toEqual({ mode: "DAILY" })
  })

  test("[異常] data.json が無い場合に DAILY フォールバック値が返る", () => {
    expect(readThinoConfig("/no-such-vault")).toEqual({ mode: "DAILY" })
  })
})
