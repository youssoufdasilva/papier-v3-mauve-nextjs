import { describe, expect, it } from "vitest"

import { deriveMarkdownSections } from "@/lib/papier/markdown-sections"

describe("deriveMarkdownSections", () => {
  it("splits markdown by headings", () => {
    const sections = deriveMarkdownSections("# Intro\nHello\n\n## Detail\nMore")

    expect(sections).toHaveLength(2)
    expect(sections[0]).toMatchObject({ title: "Intro" })
    expect(sections[1]).toMatchObject({ title: "Detail" })
  })

  it("falls back to paragraph chunks when headings are absent", () => {
    const sections = deriveMarkdownSections(
      "One\n\nTwo\n\nThree\n\nFour\n\nFive\n\nSix",
      2
    )

    expect(sections).toHaveLength(3)
    expect(sections[0].content).toContain("One")
    expect(sections[2].content).toContain("Five")
  })
})
