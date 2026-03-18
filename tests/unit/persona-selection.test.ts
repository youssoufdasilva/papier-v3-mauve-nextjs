import { describe, expect, it } from "vitest"

import { togglePersonaSelection } from "@/lib/papier/personas"

describe("togglePersonaSelection", () => {
  it("activates a persona when under the limit", () => {
    expect(togglePersonaSelection(["a"], "b")).toEqual(["a", "b"])
  })

  it("deactivates an active persona", () => {
    expect(togglePersonaSelection(["a", "b"], "a")).toEqual(["b"])
  })

  it("refuses to exceed three active personas", () => {
    expect(togglePersonaSelection(["a", "b", "c"], "d")).toEqual(["a", "b", "c"])
  })
})
