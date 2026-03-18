import type { AiScopePayload } from "@/lib/papier/types"

export function buildAiScope(payload: AiScopePayload) {
  const personaText = payload.personas.length
    ? payload.personas.map((persona) => `${persona.name}: ${persona.description}`).join("\n")
    : "No personas selected."

  if (payload.scope === "selection") {
    return {
      scope: payload.scope,
      contextText: [
        `Project objective: ${payload.project?.objective || "None"}`,
        `Personas:\n${personaText}`,
        `Selection: ${payload.selection?.quote || ""}`,
        `Selection prefix: ${payload.selection?.prefix || ""}`,
        `Selection suffix: ${payload.selection?.suffix || ""}`,
      ].join("\n\n"),
    }
  }

  if (payload.scope === "document") {
    return {
      scope: payload.scope,
      contextText: [
        `Project objective: ${payload.project?.objective || "None"}`,
        `Personas:\n${personaText}`,
        `Document: ${payload.document?.title || "Untitled"}`,
        payload.document?.markdown || "",
      ].join("\n\n"),
    }
  }

  return {
    scope: payload.scope,
    contextText: [
      `Project objective: ${payload.project?.objective || "None"}`,
      `Personas:\n${personaText}`,
      ...payload.sourceDocuments.map(
        (document) => `Document: ${document.title}\n${document.markdown}`
      ),
    ].join("\n\n"),
  }
}
