import { describe, expect, it } from "vitest"

import { computeProjectFingerprint, isProjectFingerprintStale } from "@/lib/papier/project-fingerprint"

describe("project fingerprint", () => {
  const project = {
    id: "p1",
    objective: "Ship it",
    sourceDocumentIds: ["s1"],
    workingDocumentIds: ["w1"],
  }

  const workingDocuments = [{ id: "w1", updatedAt: "2026-03-18T00:00:00.000Z" }]

  it("stays stable for the same project state", () => {
    const a = computeProjectFingerprint(project, workingDocuments)
    const b = computeProjectFingerprint(project, workingDocuments)

    expect(a).toBe(b)
  })

  it("changes when project state changes", () => {
    const original = computeProjectFingerprint(project, workingDocuments)
    const updated = computeProjectFingerprint(
      { ...project, sourceDocumentIds: ["s1", "s2"] },
      workingDocuments
    )

    expect(updated).not.toBe(original)
    expect(isProjectFingerprintStale(original, updated)).toBe(true)
  })
})
