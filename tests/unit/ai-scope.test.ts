import { describe, expect, it } from "vitest"

import { buildAiScope } from "@/lib/papier/ai-scope"

describe("buildAiScope", () => {
  const context = {
    project: { id: "project-1", name: "P", objective: "Launch" },
    document: { id: "doc-1", title: "Doc", markdown: "# Intro\nHello world" },
    sourceDocuments: [{ id: "doc-2", title: "Other", markdown: "Other text" }],
    personas: [{ id: "persona-1", name: "Researcher", description: "Checks evidence" }],
  }

  it("builds selected-text scope with the selected quote", () => {
    const scope = buildAiScope({
      ...context,
      scope: "selection",
      selection: { quote: "Hello world", prefix: "Intro", suffix: "" },
    })

    expect(scope.scope).toBe("selection")
    expect(scope.contextText).toContain("Hello world")
  })

  it("builds document scope from the active document", () => {
    const scope = buildAiScope({ ...context, scope: "document" })

    expect(scope.scope).toBe("document")
    expect(scope.contextText).toContain("# Intro")
  })

  it("builds project scope from project objective and documents", () => {
    const scope = buildAiScope({ ...context, scope: "project" })

    expect(scope.scope).toBe("project")
    expect(scope.contextText).toContain("Launch")
    expect(scope.contextText).toContain("Other text")
  })
})
