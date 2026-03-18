export type DocumentKind = "source" | "working"
export type ConversionStatus = "ready" | "processing" | "failed"
export type ChatScope = "selection" | "document" | "project"
export type AiProviderMode = "local" | "openrouter"

export type TextAnchor = {
  quote: string
  prefix: string
  suffix: string
  start: number
  end: number
  isStale: boolean
}

export type SourceDocument = {
  id: string
  title: string
  fileName: string
  mimeType: string
  originalPath: string
  originalTextPreview: string
  markdown: string
  conversionStatus: ConversionStatus
  conversionError?: string
  createdAt: string
  updatedAt: string
}

export type WorkingDocument = {
  id: string
  projectId: string
  title: string
  markdown: string
  sourceDocumentId: string | null
  createdAt: string
  updatedAt: string
}

export type Project = {
  id: string
  name: string
  objective: string
  sourceDocumentIds: string[]
  workingDocumentIds: string[]
  createdAt: string
  updatedAt: string
}

export type Persona = {
  id: string
  name: string
  description: string
  active: boolean
  isPreset: boolean
  createdAt: string
  updatedAt: string
}

export type Annotation = {
  id: string
  projectId: string
  documentId: string
  documentKind: DocumentKind
  note: string
  quote: string
  prefix: string
  suffix: string
  isStale: boolean
  createdAt: string
  updatedAt: string
}

export type CommentThread = {
  id: string
  projectId: string
  documentId: string
  documentKind: DocumentKind
  annotationId: string | null
  title: string
  createdAt: string
  updatedAt: string
}

export type Comment = {
  id: string
  threadId: string
  body: string
  createdAt: string
  updatedAt: string
}

export type LensSection = {
  sectionId: string
  title: string
  summary: string
  quote: string
}

export type LensGeneration = {
  id: string
  projectId: string
  documentId: string
  documentKind: DocumentKind
  personaIds: string[]
  overview: string
  sections: LensSection[]
  provider: AiProviderMode
  status: "ready" | "failed"
  error?: string
  createdAt: string
  updatedAt: string
}

export type ProvocationCard = {
  id: string
  kind: string
  title: string
  body: string
  quote: string
  applicable: boolean
}

export type ProvocationGeneration = {
  id: string
  projectId: string
  documentId: string
  documentKind: DocumentKind
  personaIds: string[]
  cards: ProvocationCard[]
  provider: AiProviderMode
  status: "ready" | "failed"
  error?: string
  createdAt: string
  updatedAt: string
}

export type ChatThread = {
  id: string
  scope: ChatScope
  title: string
  projectId: string | null
  documentId: string | null
  documentKind: DocumentKind | null
  selection?: TextAnchor
  projectFingerprint: string | null
  provider: AiProviderMode
  createdAt: string
  updatedAt: string
}

export type ChatMessage = {
  id: string
  threadId: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  updatedAt: string
}

export type WorkspaceSnapshot = {
  sourceDocuments: SourceDocument[]
  workingDocuments: WorkingDocument[]
  projects: Project[]
  personas: Persona[]
  annotations: Annotation[]
  commentThreads: CommentThread[]
  comments: Comment[]
  lensGenerations: LensGeneration[]
  provocationGenerations: ProvocationGeneration[]
  chatThreads: ChatThread[]
  chatMessages: ChatMessage[]
  lastSyncedAt: string
}

export type WorkspaceMutation =
  | { type: "CREATE_PROJECT"; project: Project }
  | { type: "UPSERT_PROJECT"; project: Project }
  | { type: "CREATE_SOURCE_DOCUMENT"; document: SourceDocument }
  | { type: "CREATE_WORKING_DOCUMENT"; document: WorkingDocument }
  | { type: "UPDATE_WORKING_DOCUMENT"; document: WorkingDocument }
  | { type: "CREATE_PERSONA"; persona: Persona }
  | { type: "UPSERT_PERSONA"; persona: Persona }
  | { type: "CREATE_ANNOTATION"; annotation: Annotation }
  | { type: "UPSERT_ANNOTATION"; annotation: Annotation }
  | { type: "CREATE_COMMENT_THREAD"; thread: CommentThread }
  | { type: "ADD_COMMENT"; comment: Comment }
  | { type: "SAVE_LENS_GENERATION"; generation: LensGeneration }
  | { type: "SAVE_PROVOCATION_GENERATION"; generation: ProvocationGeneration }
  | { type: "SAVE_CHAT_THREAD"; thread: ChatThread; messages: ChatMessage[] }

export type QueuedMutation = WorkspaceMutation & {
  clientMutationId: string
}

export type AiScopePayload = {
  scope: ChatScope
  project: Pick<Project, "id" | "name" | "objective"> | null
  document: Pick<SourceDocument | WorkingDocument, "id" | "title" | "markdown"> | null
  sourceDocuments: Pick<SourceDocument | WorkingDocument, "id" | "title" | "markdown">[]
  personas: Pick<Persona, "id" | "name" | "description">[]
  selection?: Pick<TextAnchor, "quote" | "prefix" | "suffix">
}
