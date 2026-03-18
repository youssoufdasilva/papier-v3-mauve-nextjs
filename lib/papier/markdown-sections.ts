export type DerivedSection = {
  id: string
  title: string
  content: string
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function deriveMarkdownSections(markdown: string, paragraphChunkSize = 3): DerivedSection[] {
  const headingPattern = /^(#{1,6})\s+(.+)$/gm
  const matches = [...markdown.matchAll(headingPattern)]

  if (matches.length > 0) {
    return matches.map((match, index) => {
      const start = match.index ?? 0
      const end = matches[index + 1]?.index ?? markdown.length
      const content = markdown.slice(start, end).trim()
      const title = match[2].trim()

      return {
        id: slugify(title) || `section-${index + 1}`,
        title,
        content,
      }
    })
  }

  const paragraphs = markdown
    .split(/\n\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) {
    return [
      {
        id: "section-1",
        title: "Untitled section",
        content: markdown.trim(),
      },
    ]
  }

  const sections: DerivedSection[] = []
  for (let index = 0; index < paragraphs.length; index += paragraphChunkSize) {
    const chunk = paragraphs.slice(index, index + paragraphChunkSize)
    sections.push({
      id: `section-${sections.length + 1}`,
      title: `Chunk ${sections.length + 1}`,
      content: chunk.join("\n\n"),
    })
  }

  return sections
}
