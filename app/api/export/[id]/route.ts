import { NextResponse } from "next/server"

import { getWorkingDocument } from "@/lib/server/db"

export const runtime = "nodejs"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const document = getWorkingDocument(id)

  if (!document) {
    return NextResponse.json({ error: "Working document not found." }, { status: 404 })
  }

  return new NextResponse(document.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${document.title.replace(/[^a-zA-Z0-9_-]/g, "-") || "working-document"}.md"`,
    },
  })
}
