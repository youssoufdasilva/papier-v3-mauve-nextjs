import { NextResponse } from "next/server"

import { persistSourceDocument } from "@/lib/server/db"
import { convertUploadedFile } from "@/lib/server/conversion"
import type { SourceDocument } from "@/lib/papier/types"

export const runtime = "nodejs"

function createId() {
  return crypto.randomUUID()
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 })
  }

  const id = createId()
  const now = new Date().toISOString()
  const conversion = await convertUploadedFile(id, file)
  const document: SourceDocument = {
    id,
    title: file.name.replace(/\.[^.]+$/, ""),
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    originalPath: conversion.originalPath,
    originalTextPreview: conversion.originalTextPreview,
    markdown: conversion.markdown,
    conversionStatus: conversion.status,
    conversionError: conversion.error,
    createdAt: now,
    updatedAt: now,
  }

  persistSourceDocument(document)

  return NextResponse.json({ document })
}
