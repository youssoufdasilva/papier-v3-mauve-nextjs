import { NextResponse } from "next/server"

import { persistWorkspaceMutation } from "@/lib/server/db"
import type { QueuedMutation, WorkspaceMutation } from "@/lib/papier/types"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json()) as {
    mutation?: WorkspaceMutation
    mutations?: QueuedMutation[]
  }

  if (body.mutation) {
    const snapshot = persistWorkspaceMutation(body.mutation)
    return NextResponse.json({ snapshot, acknowledgedIds: [] })
  }

  if (body.mutations?.length) {
    let snapshot = null
    for (const mutation of body.mutations) {
      const { clientMutationId, ...workspaceMutation } = mutation
      void clientMutationId
      snapshot = persistWorkspaceMutation(workspaceMutation)
    }

    return NextResponse.json({
      snapshot,
      acknowledgedIds: body.mutations.map((mutation) => mutation.clientMutationId),
    })
  }

  return NextResponse.json({ error: "No mutation payload provided." }, { status: 400 })
}
