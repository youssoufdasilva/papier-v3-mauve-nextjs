import fs from "node:fs/promises"
import path from "node:path"

import mammoth from "mammoth"
import { PDFParse } from "pdf-parse"

import { getUploadsDirectory } from "@/lib/server/db"

export type ConversionResult = {
  originalPath: string
  originalTextPreview: string
  markdown: string
  status: "ready" | "failed"
  error?: string
}

function normalizeMarkdown(text: string) {
  return text.replace(/\r\n/g, "\n").trim()
}

function textToMarkdown(text: string) {
  return normalizeMarkdown(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join("\n\n")
}

export async function convertUploadedFile(id: string, file: File): Promise<ConversionResult> {
  const uploadsDirectory = getUploadsDirectory()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
  const filePath = path.join(uploadsDirectory, `${id}-${safeName}`)
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, buffer)

  try {
    const mimeType = file.type || "application/octet-stream"
    if (
      mimeType.includes("markdown") ||
      mimeType.startsWith("text/") ||
      file.name.toLowerCase().endsWith(".md")
    ) {
      const text = await file.text()
      return {
        originalPath: filePath,
        originalTextPreview: text,
        markdown: textToMarkdown(text),
        status: "ready",
      }
    }

    if (
      mimeType.includes("wordprocessingml") ||
      file.name.toLowerCase().endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer })
      return {
        originalPath: filePath,
        originalTextPreview: result.value,
        markdown: textToMarkdown(result.value),
        status: "ready",
      }
    }

    if (mimeType.includes("pdf") || file.name.toLowerCase().endsWith(".pdf")) {
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      await parser.destroy()
      return {
        originalPath: filePath,
        originalTextPreview: result.text,
        markdown: textToMarkdown(result.text),
        status: "ready",
      }
    }

    return {
      originalPath: filePath,
      originalTextPreview: "",
      markdown: "",
      status: "failed",
      error: "Unsupported file type. Upload Markdown, PDF, or DOCX.",
    }
  } catch (error) {
    return {
      originalPath: filePath,
      originalTextPreview: "",
      markdown: "",
      status: "failed",
      error: error instanceof Error ? error.message : "Conversion failed.",
    }
  }
}
