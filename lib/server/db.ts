import fs from "node:fs"
import path from "node:path"

import Database from "better-sqlite3"

import { applyWorkspaceMutation, createEmptySnapshot, sortSnapshot } from "@/lib/papier/commands"
import { PRESET_PERSONAS } from "@/lib/papier/personas"
import type {
  LensGeneration,
  Persona,
  ProvocationGeneration,
  SourceDocument,
  WorkspaceMutation,
  WorkspaceSnapshot,
} from "@/lib/papier/types"

const dataDirectory = path.join(process.cwd(), ".papier")
const uploadsDirectory = path.join(dataDirectory, "uploads")
const databasePath = path.join(dataDirectory, "papier-v3.sqlite")

const tableMap = {
  sourceDocuments: "source_documents",
  workingDocuments: "working_documents",
  projects: "projects",
  personas: "personas",
  annotations: "annotations",
  commentThreads: "comment_threads",
  comments: "comments",
  lensGenerations: "lens_generations",
  provocationGenerations: "provocation_generations",
  chatThreads: "chat_threads",
  chatMessages: "chat_messages",
} as const

type CollectionKey = keyof typeof tableMap

let database: Database.Database | null = null

function getDb() {
  if (database) {
    return database
  }

  fs.mkdirSync(dataDirectory, { recursive: true })
  fs.mkdirSync(uploadsDirectory, { recursive: true })

  database = new Database(databasePath)
  for (const table of Object.values(tableMap)) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
  }

  seedPresetPersonas(database)

  return database
}

function seedPresetPersonas(db: Database.Database) {
  const existingCount = db.prepare("SELECT COUNT(*) as count FROM personas").get() as { count: number }
  if (existingCount.count > 0) {
    return
  }

  const now = new Date().toISOString()
  const insert = db.prepare(
    "INSERT INTO personas (id, data, updated_at) VALUES (@id, @data, @updatedAt)"
  )

  PRESET_PERSONAS.forEach((persona, index) => {
    const record: Persona = {
      id: `preset-persona-${index + 1}`,
      name: persona.name,
      description: persona.description,
      active: index === 0,
      isPreset: true,
      createdAt: now,
      updatedAt: now,
    }

    insert.run({ id: record.id, data: JSON.stringify(record), updatedAt: record.updatedAt })
  })
}

function readCollection<T>(collectionKey: CollectionKey) {
  const db = getDb()
  const table = tableMap[collectionKey]
  const rows = db.prepare(`SELECT data FROM ${table}`).all() as Array<{ data: string }>
  return rows.map((row) => JSON.parse(row.data) as T)
}

function writeRecord<T extends { id: string; updatedAt: string }>(
  collectionKey: CollectionKey,
  record: T
) {
  const db = getDb()
  const table = tableMap[collectionKey]
  db.prepare(
    `INSERT INTO ${table} (id, data, updated_at) VALUES (@id, @data, @updatedAt)
     ON CONFLICT(id) DO UPDATE SET data=@data, updated_at=@updatedAt`
  ).run({ id: record.id, data: JSON.stringify(record), updatedAt: record.updatedAt })
}

export function getUploadsDirectory() {
  getDb()
  return uploadsDirectory
}

export function loadWorkspaceSnapshot(): WorkspaceSnapshot {
  const snapshot = createEmptySnapshot()
  snapshot.sourceDocuments = readCollection("sourceDocuments")
  snapshot.workingDocuments = readCollection("workingDocuments")
  snapshot.projects = readCollection("projects")
  snapshot.personas = readCollection("personas")
  snapshot.annotations = readCollection("annotations")
  snapshot.commentThreads = readCollection("commentThreads")
  snapshot.comments = readCollection("comments")
  snapshot.lensGenerations = readCollection("lensGenerations")
  snapshot.provocationGenerations = readCollection("provocationGenerations")
  snapshot.chatThreads = readCollection("chatThreads")
  snapshot.chatMessages = readCollection("chatMessages")
  snapshot.lastSyncedAt = new Date().toISOString()

  return sortSnapshot(snapshot)
}

export function persistWorkspaceMutation(mutation: WorkspaceMutation) {
  const snapshot = applyWorkspaceMutation(loadWorkspaceSnapshot(), mutation)

  switch (mutation.type) {
    case "CREATE_PROJECT":
    case "UPSERT_PROJECT":
      writeRecord("projects", mutation.project)
      break
    case "CREATE_SOURCE_DOCUMENT":
      writeRecord("sourceDocuments", mutation.document)
      break
    case "CREATE_WORKING_DOCUMENT":
    case "UPDATE_WORKING_DOCUMENT":
      writeRecord("workingDocuments", mutation.document)
      writeRecord(
        "projects",
        snapshot.projects.find((project) => project.id === mutation.document.projectId)!
      )
      break
    case "CREATE_PERSONA":
    case "UPSERT_PERSONA":
      writeRecord("personas", mutation.persona)
      break
    case "CREATE_ANNOTATION":
    case "UPSERT_ANNOTATION":
      writeRecord("annotations", mutation.annotation)
      break
    case "CREATE_COMMENT_THREAD":
      writeRecord("commentThreads", mutation.thread)
      break
    case "ADD_COMMENT":
      writeRecord("comments", mutation.comment)
      break
    case "SAVE_LENS_GENERATION":
      writeRecord("lensGenerations", mutation.generation)
      break
    case "SAVE_PROVOCATION_GENERATION":
      writeRecord("provocationGenerations", mutation.generation)
      break
    case "SAVE_CHAT_THREAD":
      writeRecord("chatThreads", mutation.thread)
      mutation.messages.forEach((message) => writeRecord("chatMessages", message))
      break
    default:
      break
  }

  return loadWorkspaceSnapshot()
}

export function persistSourceDocument(document: SourceDocument) {
  writeRecord("sourceDocuments", document)
  return loadWorkspaceSnapshot()
}

export function persistLensGeneration(generation: LensGeneration) {
  writeRecord("lensGenerations", generation)
  return generation
}

export function persistProvocationGeneration(generation: ProvocationGeneration) {
  writeRecord("provocationGenerations", generation)
  return generation
}

export function getSourceDocument(sourceDocumentId: string) {
  return loadWorkspaceSnapshot().sourceDocuments.find((document) => document.id === sourceDocumentId) || null
}

export function getWorkingDocument(workingDocumentId: string) {
  return loadWorkspaceSnapshot().workingDocuments.find((document) => document.id === workingDocumentId) || null
}
