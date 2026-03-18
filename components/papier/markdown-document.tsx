"use client"

import { Fragment, useEffect, useRef } from "react"

import type { Annotation } from "@/lib/papier/types"

type MarkdownDocumentProps = {
  markdown: string
  annotations: Annotation[]
  onSelectionChange?: (selection: { quote: string; prefix: string; suffix: string } | null) => void
}

type Block =
  | { type: "heading"; level: number; text: string; key: string }
  | { type: "paragraph"; text: string; key: string }
  | { type: "list"; items: string[]; key: string }

function parseMarkdownBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/)
  const blocks: Block[] = []
  let paragraph: string[] = []
  let listItems: string[] = []

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ").trim(), key: `paragraph-${blocks.length}` })
      paragraph = []
    }
  }

  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: "list", items: [...listItems], key: `list-${blocks.length}` })
      listItems = []
    }
  }

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed) {
      flushParagraph()
      flushList()
      return
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2].trim(), key: `heading-${blocks.length}` })
      return
    }

    const listMatch = trimmed.match(/^[-*]\s+(.*)$/)
    if (listMatch) {
      flushParagraph()
      listItems.push(listMatch[1].trim())
      return
    }

    flushList()
    paragraph.push(trimmed)
  })

  flushParagraph()
  flushList()
  return blocks
}

function renderHighlightedText(text: string, annotations: Annotation[]) {
  const matchingAnnotations = annotations.filter((annotation) => annotation.quote && text.includes(annotation.quote))
  if (!matchingAnnotations.length) {
    return text
  }

  const parts: Array<string | { annotationId: string; text: string }> = [text]
  for (const annotation of matchingAnnotations) {
    const nextParts: Array<string | { annotationId: string; text: string }> = []
    for (const part of parts) {
      if (typeof part !== "string") {
        nextParts.push(part)
        continue
      }
      const index = part.indexOf(annotation.quote)
      if (index === -1) {
        nextParts.push(part)
        continue
      }
      const before = part.slice(0, index)
      const after = part.slice(index + annotation.quote.length)
      if (before) nextParts.push(before)
      nextParts.push({ annotationId: annotation.id, text: annotation.quote })
      if (after) nextParts.push(after)
    }
    parts.splice(0, parts.length, ...nextParts)
  }

  return parts.map((part, index) =>
    typeof part === "string" ? (
      <Fragment key={`${part}-${index}`}>{part}</Fragment>
    ) : (
      <mark key={`${part.annotationId}-${index}`} data-annotation-id={part.annotationId} className="rounded bg-amber-200/80 px-1 text-foreground dark:bg-amber-500/30">
        {part.text}
      </mark>
    )
  )
}

export function MarkdownDocument({ markdown, annotations, onSelectionChange }: MarkdownDocumentProps) {
  const blocks = parseMarkdownBlocks(markdown)
  const articleRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!onSelectionChange || typeof window === "undefined") {
      return
    }

    const handleSelection = () => {
      const browserSelection = window.getSelection()
      const quote = browserSelection?.toString().trim() || ""
      const anchorNode = browserSelection?.anchorNode
      const withinArticle =
        anchorNode instanceof Node && articleRef.current?.contains(anchorNode)

      if (!quote || !withinArticle) {
        onSelectionChange(null)
        return
      }

      const index = markdown.indexOf(quote)
      onSelectionChange({
        quote,
        prefix: index >= 0 ? markdown.slice(Math.max(0, index - 24), index) : "",
        suffix:
          index >= 0
            ? markdown.slice(index + quote.length, index + quote.length + 24)
            : "",
      })
    }

    document.addEventListener("selectionchange", handleSelection)
    return () => document.removeEventListener("selectionchange", handleSelection)
  }, [markdown, onSelectionChange])

  return (
    <article ref={articleRef} className="prose prose-sm max-w-none dark:prose-invert">
      {blocks.map((block) => {
        if (block.type === "heading") {
          const content = renderHighlightedText(block.text, annotations)
          switch (Math.min(block.level + 1, 6)) {
            case 2:
              return <h2 key={block.key}>{content}</h2>
            case 3:
              return <h3 key={block.key}>{content}</h3>
            case 4:
              return <h4 key={block.key}>{content}</h4>
            case 5:
              return <h5 key={block.key}>{content}</h5>
            case 6:
              return <h6 key={block.key}>{content}</h6>
            default:
              return <h1 key={block.key}>{content}</h1>
          }
        }
        if (block.type === "list") {
          return (
            <ul key={block.key}>
              {block.items.map((item, index) => (
                <li key={`${block.key}-${index}`}>{renderHighlightedText(item, annotations)}</li>
              ))}
            </ul>
          )
        }
        return <p key={block.key}>{renderHighlightedText(block.text, annotations)}</p>
      })}
    </article>
  )
}
