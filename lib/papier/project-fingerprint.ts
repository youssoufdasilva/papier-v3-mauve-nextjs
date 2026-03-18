import type { Project, WorkingDocument } from "@/lib/papier/types"

function stableHash(input: string) {
  let hash = 5381
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index)
  }

  return (hash >>> 0).toString(16)
}

export function computeProjectFingerprint(
  project: Pick<Project, "objective" | "sourceDocumentIds" | "workingDocumentIds">,
  workingDocuments: Array<Pick<WorkingDocument, "id" | "updatedAt">>
) {
  const payload = JSON.stringify({
    objective: project.objective,
    sourceDocumentIds: [...project.sourceDocumentIds].sort(),
    workingDocuments: [...workingDocuments]
      .map((document) => ({ id: document.id, updatedAt: document.updatedAt }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  })

  return stableHash(payload)
}

export function isProjectFingerprintStale(previousFingerprint: string | null, currentFingerprint: string) {
  return Boolean(previousFingerprint) && previousFingerprint !== currentFingerprint
}
