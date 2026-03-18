import { NextResponse } from "next/server"

import { generateChat } from "@/lib/server/ai"
import { loadWorkspaceSnapshot, persistWorkspaceMutation } from "@/lib/server/db"
import type { TextAnchor } from "@/lib/papier/types"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json()) as {
    projectId: string | null
    documentId: string | null
    documentKind: "source" | "working" | null
    scope: "selection" | "document" | "project"
    prompt: string
    selection?: TextAnchor
  }

  const snapshot = loadWorkspaceSnapshot()
  const project = body.projectId ? snapshot.projects.find((item) => item.id === body.projectId) || null : null
  const document = body.documentId
    ? body.documentKind === "source"
      ? snapshot.sourceDocuments.find((item) => item.id === body.documentId) || null
      : snapshot.workingDocuments.find((item) => item.id === body.documentId) || null
    : null
  const projectDocuments = project
    ? [
        ...snapshot.sourceDocuments.filter((item) => project.sourceDocumentIds.includes(item.id)),
        ...snapshot.workingDocuments.filter((item) => project.workingDocumentIds.includes(item.id)),
      ]
    : document
      ? [document]
      : []

  const { thread, messages } = await generateChat({
    project,
    document,
    projectDocuments,
    personas: snapshot.personas.filter((persona) => persona.active),
    scope: body.scope,
    prompt: body.prompt,
    selection: body.selection,
  })

  const nextSnapshot = persistWorkspaceMutation({
    type: "SAVE_CHAT_THREAD",
    thread,
    messages,
  })

  return NextResponse.json({ thread, messages, snapshot: nextSnapshot })
}
