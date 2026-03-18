import { NextResponse } from "next/server"

import { generateLens } from "@/lib/server/ai"
import { loadWorkspaceSnapshot, persistWorkspaceMutation } from "@/lib/server/db"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json()) as {
    projectId: string
    documentId: string
    documentKind: "source" | "working"
  }

  const snapshot = loadWorkspaceSnapshot()
  const project = snapshot.projects.find((item) => item.id === body.projectId)
  const document =
    body.documentKind === "source"
      ? snapshot.sourceDocuments.find((item) => item.id === body.documentId)
      : snapshot.workingDocuments.find((item) => item.id === body.documentId)
  const personas = snapshot.personas.filter((persona) => persona.active)

  if (!project || !document) {
    return NextResponse.json({ error: "Missing project or document." }, { status: 404 })
  }

  const generation = await generateLens({ project, document, personas })
  const nextSnapshot = persistWorkspaceMutation({
    type: "SAVE_LENS_GENERATION",
    generation,
  })

  return NextResponse.json({ generation, snapshot: nextSnapshot })
}
