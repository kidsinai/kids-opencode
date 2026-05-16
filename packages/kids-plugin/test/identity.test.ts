import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { audit, readIdentityFromEnv } from "../src/index.ts"

const ORIG = process.env

beforeEach(() => {
  process.env = { ...ORIG }
})
afterEach(() => {
  process.env = ORIG
})

describe("readIdentityFromEnv", () => {
  test("returns nulls when no env vars set", () => {
    delete process.env.KIDS_FAMILY_ID
    delete process.env.KIDS_PROFILE_ID
    delete process.env.KIDS_DEVICE_ID
    delete process.env.KIDS_WORKSHOP_CLASS_ID
    const id = readIdentityFromEnv()
    expect(id.family_id).toBeNull()
    expect(id.kid_profile_id).toBeNull()
    expect(id.device_id).toBeNull()
    expect(id.workshop_class_id).toBeNull()
  })

  test("propagates all four identity fields", () => {
    process.env.KIDS_FAMILY_ID = "fam_abc"
    process.env.KIDS_PROFILE_ID = "kid_xyz"
    process.env.KIDS_DEVICE_ID = "dev_123"
    process.env.KIDS_WORKSHOP_CLASS_ID = "class_999"
    const id = readIdentityFromEnv()
    expect(id.family_id).toBe("fam_abc")
    expect(id.kid_profile_id).toBe("kid_xyz")
    expect(id.device_id).toBe("dev_123")
    expect(id.workshop_class_id).toBe("class_999")
  })

  test("treats empty string as null", () => {
    process.env.KIDS_FAMILY_ID = ""
    expect(readIdentityFromEnv().family_id).toBeNull()
  })
})

describe("audit envelope shape", () => {
  test("emits schema_version + identity block on every line", () => {
    process.env.KIDS_FAMILY_ID = "fam_t1"
    let captured = ""
    const origWrite = process.stderr.write.bind(process.stderr)
    // @ts-expect-error capture
    process.stderr.write = (s: string): boolean => {
      captured += s
      return true
    }
    try {
      audit("tool.execute.before", { tool: "read", stars_estimated: 1 })
    } finally {
      // @ts-expect-error restore
      process.stderr.write = origWrite
    }
    expect(captured.startsWith("[kids-audit] ")).toBe(true)
    const json = JSON.parse(captured.slice("[kids-audit] ".length))
    expect(json.schema_version).toBe("1")
    expect(json.identity.family_id).toBe("fam_t1")
    expect(json.tool).toBe("read")
    expect(json.stars_estimated).toBe(1)
  })
})
