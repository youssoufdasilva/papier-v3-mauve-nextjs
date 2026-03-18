import { describe, expect, it } from "vitest"

import { createTextAnchor, rebindTextAnchor } from "@/lib/papier/text-anchor"

describe("text anchor", () => {
  it("captures quote and nearby context", () => {
    const anchor = createTextAnchor("Hello thoughtful world", 6, 16)

    expect(anchor.quote).toBe("thoughtful")
    expect(anchor.prefix).toContain("Hello")
    expect(anchor.suffix).toContain("world")
  })

  it("rebinds when the anchored quote shifts after edits", () => {
    const original = "Alpha beta gamma delta"
    const updated = "Alpha beta brave gamma delta"
    const anchor = createTextAnchor(original, 11, 16)

    const rebound = rebindTextAnchor(updated, anchor)

    expect(rebound.isStale).toBe(false)
    expect(rebound.start).toBe(updated.indexOf("gamma"))
  })

  it("marks anchors stale when the quote disappears", () => {
    const anchor = createTextAnchor("Alpha beta gamma", 6, 10)

    const rebound = rebindTextAnchor("Alpha changed entirely", anchor)

    expect(rebound.isStale).toBe(true)
  })
})
