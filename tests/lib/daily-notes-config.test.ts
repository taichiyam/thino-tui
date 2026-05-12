import { describe, expect, test } from "bun:test"
import { readDailyNotesConfig } from "../../src/lib/daily-notes-config"
import { join } from "node:path"

const fixtureVault = join(import.meta.dir, "..", "fixtures", "vault")

describe("readDailyNotesConfig", () => {
  test("[正常] format と folder を fixture から読み取れる", () => {
    expect(readDailyNotesConfig(fixtureVault)).toEqual({
      folder: "",
      format: "YYYY-MM-DD",
      template: "",
    })
  })

  test("[異常] json不在時に既定値が返る", () => {
    expect(readDailyNotesConfig("/no-vault")).toEqual({
      folder: "",
      format: "YYYY-MM-DD",
      template: "",
    })
  })
})
