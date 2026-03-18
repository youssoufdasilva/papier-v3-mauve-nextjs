import type { TextAnchor } from "@/lib/papier/types"

const CONTEXT_WINDOW = 24

export function createTextAnchor(text: string, start: number, end: number): TextAnchor {
  const safeStart = Math.max(0, Math.min(start, text.length))
  const safeEnd = Math.max(safeStart, Math.min(end, text.length))

  return {
    quote: text.slice(safeStart, safeEnd),
    prefix: text.slice(Math.max(0, safeStart - CONTEXT_WINDOW), safeStart),
    suffix: text.slice(safeEnd, Math.min(text.length, safeEnd + CONTEXT_WINDOW)),
    start: safeStart,
    end: safeEnd,
    isStale: false,
  }
}

export function rebindTextAnchor(text: string, anchor: TextAnchor): TextAnchor {
  const exact = text.indexOf(anchor.quote)
  if (exact >= 0) {
    return {
      ...anchor,
      start: exact,
      end: exact + anchor.quote.length,
      isStale: false,
    }
  }

  const prefixIndex = anchor.prefix ? text.indexOf(anchor.prefix) : -1
  const suffixIndex = anchor.suffix ? text.indexOf(anchor.suffix) : -1

  if (prefixIndex >= 0 && suffixIndex >= 0 && suffixIndex > prefixIndex) {
    const start = prefixIndex + anchor.prefix.length
    const end = suffixIndex
    return {
      ...anchor,
      quote: text.slice(start, end).trim() || anchor.quote,
      start,
      end,
      isStale: false,
    }
  }

  return {
    ...anchor,
    start: -1,
    end: -1,
    isStale: true,
  }
}
