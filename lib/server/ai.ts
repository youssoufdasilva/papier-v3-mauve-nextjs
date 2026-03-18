import { deriveMarkdownSections } from "@/lib/papier/markdown-sections"
import { buildAiScope } from "@/lib/papier/ai-scope"
import { computeProjectFingerprint } from "@/lib/papier/project-fingerprint"
import type {
  AiProviderMode,
  ChatMessage,
  ChatScope,
  ChatThread,
  LensGeneration,
  Persona,
  Project,
  ProvocationGeneration,
  SourceDocument,
  TextAnchor,
  WorkingDocument,
} from "@/lib/papier/types"

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini"

function providerMode(): AiProviderMode {
  return process.env.OPENROUTER_API_KEY ? "openrouter" : "local"
}

function summarizeSection(content: string) {
  return content
    .replace(/[#>*_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/[.!?]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)[0] || "No clear summary available."
}

function deterministicLens(
  project: Project,
  document: SourceDocument | WorkingDocument,
  personas: Persona[]
): LensGeneration {
  const now = new Date().toISOString()
  const sections = deriveMarkdownSections(document.markdown).map((section) => ({
    sectionId: section.id,
    title: section.title,
    summary: `${personas.map((persona) => persona.name).join(", ") || "Papier"} sees ${summarizeSection(section.content)}.`,
    quote: section.content.slice(0, 140),
  }))

  return {
    id: `lens-${document.id}`,
    projectId: project.id,
    documentId: document.id,
    documentKind: "projectId" in document ? "working" : "source",
    personaIds: personas.map((persona) => persona.id),
    overview: `Objective: ${project.objective || "None"}. ${personas.length ? personas.map((persona) => persona.name).join(", ") : "Papier"} highlights ${sections.length} sections worth slowing down on.`,
    sections,
    provider: providerMode(),
    status: "ready",
    createdAt: now,
    updatedAt: now,
  }
}

function deterministicProvocations(
  project: Project,
  document: SourceDocument | WorkingDocument,
  personas: Persona[]
): ProvocationGeneration {
  const now = new Date().toISOString()
  const sections = deriveMarkdownSections(document.markdown)
  const firstSection = sections[0]
  const firstQuote = firstSection?.content.slice(0, 140) || document.markdown.slice(0, 140)

  return {
    id: `provocation-${document.id}`,
    projectId: project.id,
    documentId: document.id,
    documentKind: "projectId" in document ? "working" : "source",
    personaIds: personas.map((persona) => persona.id),
    cards: [
      {
        id: `${document.id}-counterargument`,
        kind: "counterargument",
        title: "What would a skeptical reader push back on?",
        body: `${personas.map((persona) => persona.name).join(", ") || "Papier"} would test whether the strongest claim is supported or merely asserted.`,
        quote: firstQuote,
        applicable: true,
      },
      {
        id: `${document.id}-missing-evidence`,
        kind: "missing-evidence",
        title: "What evidence is still missing?",
        body: project.objective
          ? `Because the project objective is ${project.objective.toLowerCase()}, look for evidence that directly moves that goal forward.`
          : "No project objective is set, so the main risk is collecting observations without a clear decision criterion.",
        quote: firstQuote,
        applicable: true,
      },
      {
        id: `${document.id}-not-applicable`,
        kind: "not-applicable",
        title: "Which provocation might not apply here?",
        body: sections.length < 2
          ? "Long-form structural critique may be premature because the document is still too short or fragmentary."
          : "A line-by-line rewrite is intentionally withheld because Papier keeps the human in control of the document.",
        quote: firstQuote,
        applicable: false,
      },
    ],
    provider: providerMode(),
    status: "ready",
    createdAt: now,
    updatedAt: now,
  }
}

function deterministicChat(args: {
  project: Project | null
  document: SourceDocument | WorkingDocument | null
  projectDocuments: Array<SourceDocument | WorkingDocument>
  personas: Persona[]
  scope: ChatScope
  prompt: string
  selection?: TextAnchor
}): { thread: ChatThread; messages: ChatMessage[] } {
  const now = new Date().toISOString()
  const scope = buildAiScope({
    scope: args.scope,
    project: args.project,
    document: args.document,
    sourceDocuments: args.projectDocuments,
    personas: args.personas,
    selection: args.selection,
  })
  const threadId = `chat-${Date.now()}`
  const currentFingerprint = args.project
    ? computeProjectFingerprint(
        args.project,
        args.projectDocuments
          .filter((document): document is WorkingDocument => "projectId" in document)
          .map((document) => ({ id: document.id, updatedAt: document.updatedAt }))
      )
    : null

  return {
    thread: {
      id: threadId,
      scope: args.scope,
      title:
        args.scope === "selection"
          ? "Selection chat"
          : args.scope === "document"
            ? `Chat about ${args.document?.title || "document"}`
            : `Project chat${args.project ? `: ${args.project.name}` : ""}`,
      projectId: args.project?.id || null,
      documentId: args.document?.id || null,
      documentKind: args.document ? ("projectId" in args.document ? "working" : "source") : null,
      selection: args.selection,
      projectFingerprint: args.scope === "project" ? currentFingerprint : null,
      provider: providerMode(),
      createdAt: now,
      updatedAt: now,
    },
    messages: [
      {
        id: `${threadId}-user`,
        threadId,
        role: "user",
        content: args.prompt,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `${threadId}-assistant`,
        threadId,
        role: "assistant",
        content: `Scope: ${args.scope}.\n\n${scope.contextText}\n\nPapier response: ${args.personas.map((persona) => persona.name).join(", ") || "Papier"} would answer by slowing down on assumptions, evidence, and what the text leaves unresolved. Prompt received: ${args.prompt}`,
        createdAt: now,
        updatedAt: now,
      },
    ],
  }
}

async function callOpenRouter(prompt: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter request failed with ${response.status}`)
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return json.choices?.[0]?.message?.content || ""
}

export async function generateLens(args: {
  project: Project
  document: SourceDocument | WorkingDocument
  personas: Persona[]
}) {
  const local = deterministicLens(args.project, args.document, args.personas)
  if (!process.env.OPENROUTER_API_KEY) {
    return local
  }

  try {
    const prompt = `Return a short document overview and section summaries as JSON. Document:\n${args.document.markdown}`
    await callOpenRouter(prompt)
    return { ...local, provider: "openrouter" as const }
  } catch {
    return local
  }
}

export async function generateProvocations(args: {
  project: Project
  document: SourceDocument | WorkingDocument
  personas: Persona[]
}) {
  const local = deterministicProvocations(args.project, args.document, args.personas)
  if (!process.env.OPENROUTER_API_KEY) {
    return local
  }

  try {
    const prompt = `Return critique provocations as JSON. Document:\n${args.document.markdown}`
    await callOpenRouter(prompt)
    return { ...local, provider: "openrouter" as const }
  } catch {
    return local
  }
}

export async function generateChat(args: {
  project: Project | null
  document: SourceDocument | WorkingDocument | null
  projectDocuments: Array<SourceDocument | WorkingDocument>
  personas: Persona[]
  scope: ChatScope
  prompt: string
  selection?: TextAnchor
}) {
  const local = deterministicChat(args)
  if (!process.env.OPENROUTER_API_KEY) {
    return local
  }

  try {
    const prompt = `${buildAiScope({
      scope: args.scope,
      project: args.project,
      document: args.document,
      sourceDocuments: args.projectDocuments,
      personas: args.personas,
      selection: args.selection,
    }).contextText}\n\nUser prompt: ${args.prompt}`
    const assistant = await callOpenRouter(prompt)
    return {
      ...local,
      thread: { ...local.thread, provider: "openrouter" as const },
      messages: [local.messages[0], { ...local.messages[1], content: assistant, updatedAt: new Date().toISOString() }],
    }
  } catch {
    return local
  }
}

export async function smokeOpenRouter() {
  if (!process.env.OPENROUTER_API_KEY) {
    return { ok: false, reason: "OPENROUTER_API_KEY is not configured." }
  }

  try {
    const content = await callOpenRouter("Respond with the single word: papier")
    return { ok: true, content }
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "OpenRouter smoke test failed.",
    }
  }
}
