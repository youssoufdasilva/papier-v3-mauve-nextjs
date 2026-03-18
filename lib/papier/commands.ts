import type {
  Annotation,
  ChatMessage,
  ChatThread,
  Comment,
  CommentThread,
  LensGeneration,
  Persona,
  Project,
  ProvocationGeneration,
  SourceDocument,
  WorkingDocument,
  WorkspaceMutation,
  WorkspaceSnapshot,
} from "@/lib/papier/types"

function upsertById<T extends { id: string }>(records: T[], nextRecord: T) {
  const existingIndex = records.findIndex((record) => record.id === nextRecord.id)
  if (existingIndex === -1) {
    return [...records, nextRecord]
  }

  const nextRecords = [...records]
  nextRecords[existingIndex] = nextRecord
  return nextRecords
}

export function createEmptySnapshot(): WorkspaceSnapshot {
  return {
    sourceDocuments: [],
    workingDocuments: [],
    projects: [],
    personas: [],
    annotations: [],
    commentThreads: [],
    comments: [],
    lensGenerations: [],
    provocationGenerations: [],
    chatThreads: [],
    chatMessages: [],
    lastSyncedAt: new Date(0).toISOString(),
  }
}

function stamp(snapshot: WorkspaceSnapshot) {
  return {
    ...snapshot,
    lastSyncedAt: new Date().toISOString(),
  }
}

function upsertProject(projects: Project[], project: Project) {
  return upsertById(projects, project)
}

function upsertWorkingDocument(
  snapshot: WorkspaceSnapshot,
  document: WorkingDocument
): WorkspaceSnapshot {
  const projects = snapshot.projects.map((project) => {
    if (project.id !== document.projectId) {
      return project
    }

    const workingDocumentIds = project.workingDocumentIds.includes(document.id)
      ? project.workingDocumentIds
      : [...project.workingDocumentIds, document.id]

    return {
      ...project,
      workingDocumentIds,
      updatedAt: document.updatedAt,
    }
  })

  return {
    ...snapshot,
    projects,
    workingDocuments: upsertById(snapshot.workingDocuments, document),
  }
}

export function applyWorkspaceMutation(snapshot: WorkspaceSnapshot, mutation: WorkspaceMutation) {
  switch (mutation.type) {
    case "CREATE_PROJECT":
    case "UPSERT_PROJECT":
      return stamp({
        ...snapshot,
        projects: upsertProject(snapshot.projects, mutation.project),
      })
    case "CREATE_SOURCE_DOCUMENT":
      return stamp({
        ...snapshot,
        sourceDocuments: upsertById(snapshot.sourceDocuments, mutation.document),
      })
    case "CREATE_WORKING_DOCUMENT":
    case "UPDATE_WORKING_DOCUMENT":
      return stamp(upsertWorkingDocument(snapshot, mutation.document))
    case "CREATE_PERSONA":
    case "UPSERT_PERSONA":
      return stamp({
        ...snapshot,
        personas: upsertById(snapshot.personas, mutation.persona),
      })
    case "CREATE_ANNOTATION":
    case "UPSERT_ANNOTATION":
      return stamp({
        ...snapshot,
        annotations: upsertById(snapshot.annotations, mutation.annotation),
      })
    case "CREATE_COMMENT_THREAD":
      return stamp({
        ...snapshot,
        commentThreads: upsertById(snapshot.commentThreads, mutation.thread),
      })
    case "ADD_COMMENT":
      return stamp({
        ...snapshot,
        comments: upsertById(snapshot.comments, mutation.comment),
      })
    case "SAVE_LENS_GENERATION":
      return stamp({
        ...snapshot,
        lensGenerations: upsertById(snapshot.lensGenerations, mutation.generation),
      })
    case "SAVE_PROVOCATION_GENERATION":
      return stamp({
        ...snapshot,
        provocationGenerations: upsertById(snapshot.provocationGenerations, mutation.generation),
      })
    case "SAVE_CHAT_THREAD": {
      const messages = mutation.messages.reduce<ChatMessage[]>((accumulator, message) => {
        return upsertById(accumulator, message)
      }, snapshot.chatMessages)

      return stamp({
        ...snapshot,
        chatThreads: upsertById(snapshot.chatThreads, mutation.thread),
        chatMessages: messages,
      })
    }
    default:
      return snapshot
  }
}

export function sortSnapshot(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  const byUpdatedAt = <T extends { updatedAt: string }>(records: T[]) =>
    [...records].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))

  const byCreatedAt = <T extends { createdAt: string }>(records: T[]) =>
    [...records].sort((left, right) => left.createdAt.localeCompare(right.createdAt))

  return {
    ...snapshot,
    sourceDocuments: byUpdatedAt<SourceDocument>(snapshot.sourceDocuments),
    workingDocuments: byUpdatedAt<WorkingDocument>(snapshot.workingDocuments),
    projects: byUpdatedAt<Project>(snapshot.projects),
    personas: byCreatedAt<Persona>(snapshot.personas),
    annotations: byCreatedAt<Annotation>(snapshot.annotations),
    commentThreads: byCreatedAt<CommentThread>(snapshot.commentThreads),
    comments: byCreatedAt<Comment>(snapshot.comments),
    lensGenerations: byUpdatedAt<LensGeneration>(snapshot.lensGenerations),
    provocationGenerations: byUpdatedAt<ProvocationGeneration>(snapshot.provocationGenerations),
    chatThreads: byUpdatedAt<ChatThread>(snapshot.chatThreads),
    chatMessages: byCreatedAt<ChatMessage>(snapshot.chatMessages),
  }
}
