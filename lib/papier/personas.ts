import type { Persona } from "@/lib/papier/types"

export const PRESET_PERSONAS: Array<Pick<Persona, "name" | "description">> = [
  {
    name: "Researcher",
    description: "Interrogate claims, evidence, methods, and missing assumptions.",
  },
  {
    name: "Recruiter",
    description: "Look for signal, clarity, fit, and what would stand out in a hiring review.",
  },
  {
    name: "Senior engineer",
    description: "Stress test technical tradeoffs, correctness, maintainability, and operations.",
  },
]

export function togglePersonaSelection(activePersonaIds: string[], personaId: string, limit = 3) {
  if (activePersonaIds.includes(personaId)) {
    return activePersonaIds.filter((id) => id !== personaId)
  }

  if (activePersonaIds.length >= limit) {
    return activePersonaIds
  }

  return [...activePersonaIds, personaId]
}
