"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  BookOpenIcon,
  BrainIcon,
  ChatCircleDotsIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  FloppyDiskBackIcon,
  GlobeIcon,
  LightningIcon,
  NotePencilIcon,
  PlusIcon,
  SidebarSimpleIcon,
  SparkleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import { MarkdownDocument } from "@/components/papier/markdown-document"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { buildAiScope } from "@/lib/papier/ai-scope"
import { applyWorkspaceMutation, sortSnapshot } from "@/lib/papier/commands"
import { acknowledgeQueueItems, enqueueMutation } from "@/lib/papier/offline-queue"
import { togglePersonaSelection } from "@/lib/papier/personas"
import {
  computeProjectFingerprint,
  isProjectFingerprintStale,
} from "@/lib/papier/project-fingerprint"
import { rebindTextAnchor } from "@/lib/papier/text-anchor"
import type {
  ChatScope,
  ChatThread,
  CommentThread,
  DocumentKind,
  Persona,
  QueuedMutation,
  SourceDocument,
  WorkingDocument,
  WorkspaceMutation,
  WorkspaceSnapshot,
} from "@/lib/papier/types"

const CACHE_KEY = "papier-v3-cache"
const QUEUE_KEY = "papier-v3-queue"
const PANELS_KEY = "papier-v3-panels"

type PanelState = {
  lenses: boolean
  chat: boolean
  comments: boolean
}

type WorkspaceAppProps = {
  initialSnapshot: WorkspaceSnapshot
}

function defaultPanels(): PanelState {
  return { lenses: true, chat: true, comments: true }
}

function saveJson(key: string, value: unknown) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value))
  }
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback
  }

  const value = window.localStorage.getItem(key)
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function createTimestamp() {
  return new Date().toISOString()
}

function commentsForThread(thread: CommentThread | null, snapshot: WorkspaceSnapshot) {
  if (!thread) {
    return []
  }

  return snapshot.comments.filter((comment) => comment.threadId === thread.id)
}

export function WorkspaceApp({ initialSnapshot }: WorkspaceAppProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const saveTimeoutRef = useRef<number | null>(null)

  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(sortSnapshot(initialSnapshot))
  const [queue, setQueue] = useState<QueuedMutation[]>([])
  const [panels, setPanels] = useState<PanelState>(defaultPanels())
  const [online, setOnline] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [selection, setSelection] = useState<{
    quote: string
    prefix: string
    suffix: string
  } | null>(null)
  const [uploadPending, setUploadPending] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [projectObjective, setProjectObjective] = useState("")
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>([])
  const [customPersonaName, setCustomPersonaName] = useState("")
  const [customPersonaDescription, setCustomPersonaDescription] = useState("")
  const [documentComment, setDocumentComment] = useState("")
  const [annotationNote, setAnnotationNote] = useState("")
  const [chatPrompt, setChatPrompt] = useState("")
  const [chatScope, setChatScope] = useState<ChatScope>("document")
  const [chatFilter, setChatFilter] = useState<ChatScope | "all">("all")
  const [workingTitle, setWorkingTitle] = useState("")
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [editorValue, setEditorValue] = useState("")

  const selectedProjectId = searchParams.get("project")
  const selectedDocumentId = searchParams.get("document")
  const selectedDocumentKind = (searchParams.get("kind") as DocumentKind | null) || null

  const currentProject = useMemo(
    () => snapshot.projects.find((project) => project.id === selectedProjectId) || null,
    [snapshot.projects, selectedProjectId]
  )

  const currentDocument = useMemo(() => {
    if (!selectedDocumentId || !selectedDocumentKind) {
      return null
    }

    return selectedDocumentKind === "source"
      ? snapshot.sourceDocuments.find((document) => document.id === selectedDocumentId) || null
      : snapshot.workingDocuments.find((document) => document.id === selectedDocumentId) || null
  }, [snapshot.sourceDocuments, snapshot.workingDocuments, selectedDocumentId, selectedDocumentKind])

  const currentSourceDocument =
    currentDocument && selectedDocumentKind === "source"
      ? (currentDocument as SourceDocument)
      : null

  const currentWorkingDocument =
    currentDocument && selectedDocumentKind === "working"
      ? (currentDocument as WorkingDocument)
      : null

  useEffect(() => {
    if (currentWorkingDocument) {
      setEditorValue(currentWorkingDocument.markdown)
    }
  }, [currentWorkingDocument])

  const currentAnnotations = useMemo(() => {
    if (!currentProject || !currentDocument || !selectedDocumentKind) {
      return []
    }

    return snapshot.annotations.filter(
      (annotation) =>
        annotation.projectId === currentProject.id &&
        annotation.documentId === currentDocument.id &&
        annotation.documentKind === selectedDocumentKind
    )
  }, [snapshot.annotations, currentProject, currentDocument, selectedDocumentKind])

  const relevantThreads = useMemo(() => {
    if (!currentDocument || !selectedDocumentKind) {
      return []
    }

    return snapshot.commentThreads.filter((thread) => {
      const projectMatches = currentProject ? thread.projectId === currentProject.id : true
      return (
        projectMatches &&
        thread.documentId === currentDocument.id &&
        thread.documentKind === selectedDocumentKind
      )
    })
  }, [snapshot.commentThreads, currentProject, currentDocument, selectedDocumentKind])

  const activePersonas = useMemo(
    () => snapshot.personas.filter((persona) => persona.active),
    [snapshot.personas]
  )

  const lensGeneration = useMemo(() => {
    if (!currentProject || !currentDocument || !selectedDocumentKind) {
      return null
    }

    return (
      snapshot.lensGenerations.find(
        (generation) =>
          generation.projectId === currentProject.id &&
          generation.documentId === currentDocument.id &&
          generation.documentKind === selectedDocumentKind
      ) || null
    )
  }, [snapshot.lensGenerations, currentProject, currentDocument, selectedDocumentKind])

  const provocationGeneration = useMemo(() => {
    if (!currentProject || !currentDocument || !selectedDocumentKind) {
      return null
    }

    return (
      snapshot.provocationGenerations.find(
        (generation) =>
          generation.projectId === currentProject.id &&
          generation.documentId === currentDocument.id &&
          generation.documentKind === selectedDocumentKind
      ) || null
    )
  }, [snapshot.provocationGenerations, currentProject, currentDocument, selectedDocumentKind])

  const chatThreads = useMemo(() => {
    if (!currentProject && !currentDocument) {
      return []
    }

    return snapshot.chatThreads.filter((thread) => {
      const byDocument = currentDocument ? thread.documentId === currentDocument.id : false
      const byProject = currentProject ? thread.projectId === currentProject.id : false
      const filterMatches = chatFilter === "all" ? true : thread.scope === chatFilter
      return filterMatches && (byDocument || byProject)
    })
  }, [snapshot.chatThreads, currentDocument, currentProject, chatFilter])

  const activeChatThread = useMemo(
    () => chatThreads.find((thread) => thread.id === activeThreadId) || chatThreads[0] || null,
    [chatThreads, activeThreadId]
  )

  const currentFingerprint = useMemo(() => {
    if (!currentProject) {
      return null
    }

    return computeProjectFingerprint(
      currentProject,
      snapshot.workingDocuments.filter((document) =>
        currentProject.workingDocumentIds.includes(document.id)
      )
    )
  }, [currentProject, snapshot.workingDocuments])

  const scopePreview = useMemo(() => {
    return buildAiScope({
      scope: selection ? "selection" : currentDocument ? "document" : "project",
      project: currentProject,
      document: currentDocument,
      sourceDocuments: currentProject
        ? [
            ...snapshot.sourceDocuments.filter((document) =>
              currentProject.sourceDocumentIds.includes(document.id)
            ),
            ...snapshot.workingDocuments.filter((document) =>
              currentProject.workingDocumentIds.includes(document.id)
            ),
          ]
        : currentDocument
          ? [currentDocument]
          : [],
      personas: activePersonas,
      selection: selection || undefined,
    }).contextText
  }, [
    selection,
    currentDocument,
    currentProject,
    snapshot.sourceDocuments,
    snapshot.workingDocuments,
    activePersonas,
  ])

  const annotationThreads = useMemo(() => {
    const threadMap = new Map<string, CommentThread>()
    relevantThreads.forEach((thread) => {
      if (thread.annotationId) {
        threadMap.set(thread.annotationId, thread)
      }
    })
    return threadMap
  }, [relevantThreads])

  const updateRoute = useCallback(
    (params: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString())
      Object.entries(params).forEach(([key, value]) => {
        if (!value) {
          next.delete(key)
        } else {
          next.set(key, value)
        }
      })
      router.replace(`${pathname}?${next.toString()}`)
    },
    [pathname, router, searchParams]
  )

  const refreshSnapshot = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" })
      if (!response.ok) {
        throw new Error("Failed to refresh workspace.")
      }
      const nextSnapshot = (await response.json()) as WorkspaceSnapshot
      setSnapshot(sortSnapshot(nextSnapshot))
      saveJson(CACHE_KEY, nextSnapshot)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to refresh workspace.")
    }
  }, [])

  useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true)
    const cachedSnapshot = loadJson<WorkspaceSnapshot | null>(CACHE_KEY, null)
    const cachedQueue = loadJson<QueuedMutation[]>(QUEUE_KEY, [])
    const cachedPanels = loadJson<PanelState>(PANELS_KEY, defaultPanels())

    if (cachedSnapshot) {
      setSnapshot(sortSnapshot(cachedSnapshot))
    }
    setQueue(cachedQueue)
    setPanels(cachedPanels)

    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    if (navigator.onLine) {
      void refreshSnapshot()
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [refreshSnapshot])

  useEffect(() => {
    saveJson(CACHE_KEY, snapshot)
  }, [snapshot])

  useEffect(() => {
    saveJson(QUEUE_KEY, queue)
  }, [queue])

  useEffect(() => {
    saveJson(PANELS_KEY, panels)
  }, [panels])

  useEffect(() => {
    if (selection) {
      setChatScope("selection")
    } else if (currentProject) {
      setChatScope(currentDocument ? "document" : "project")
    }
  }, [selection, currentDocument, currentProject])

  const applyMutationsOptimistically = useCallback((mutations: WorkspaceMutation[]) => {
    setSnapshot((current) => sortSnapshot(mutations.reduce(applyWorkspaceMutation, current)))
  }, [])

  const syncQueuedMutations = useCallback(async () => {
    if (!queue.length || !online) {
      return
    }

    try {
      const response = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutations: queue }),
      })

      if (!response.ok) {
        throw new Error("Reconnect sync failed.")
      }

      const data = (await response.json()) as {
        snapshot: WorkspaceSnapshot
        acknowledgedIds: string[]
      }

      setSnapshot(sortSnapshot(data.snapshot))
      setQueue((current) => acknowledgeQueueItems(current, data.acknowledgedIds))
      setMessage("Queued offline work synced.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reconnect sync failed.")
    }
  }, [online, queue])

  useEffect(() => {
    if (online && queue.length) {
      void syncQueuedMutations()
    }
  }, [online, queue.length, syncQueuedMutations])

  const submitMutations = useCallback(
    async (mutations: WorkspaceMutation[]) => {
      applyMutationsOptimistically(mutations)
      const queuedMutations = mutations.map((mutation) => ({
        clientMutationId: crypto.randomUUID(),
        ...mutation,
      }))

      if (!online) {
        setQueue((current) => queuedMutations.reduce(enqueueMutation, current))
        setMessage("Saved offline. Changes will sync on reconnect.")
        return
      }

      try {
        const response = await fetch("/api/commands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mutations: queuedMutations }),
        })

        if (!response.ok) {
          throw new Error("Failed to save changes.")
        }

        const data = (await response.json()) as {
          snapshot: WorkspaceSnapshot
          acknowledgedIds: string[]
        }

        setSnapshot(sortSnapshot(data.snapshot))
        setQueue((current) => queuedMutations.reduce(enqueueMutation, current))
        setQueue((current) => acknowledgeQueueItems(current, data.acknowledgedIds))
      } catch (error) {
        setQueue((current) => queuedMutations.reduce(enqueueMutation, current))
        setMessage(error instanceof Error ? error.message : "Failed to save changes.")
      }
    },
    [applyMutationsOptimistically, online]
  )

  const openSourceDocument = (documentId: string, projectId?: string | null) => {
    updateRoute({ document: documentId, kind: "source", project: projectId || null })
  }

  const openWorkingDocument = (documentId: string, projectId: string) => {
    updateRoute({ document: documentId, kind: "working", project: projectId })
  }

  const uploadFile = async (file: File) => {
    setUploadPending(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const response = await fetch("/api/upload", { method: "POST", body: formData })
      if (!response.ok) {
        throw new Error("Upload failed.")
      }
      const data = (await response.json()) as { document: SourceDocument }
      setSnapshot((current) =>
        sortSnapshot(
          applyWorkspaceMutation(current, {
            type: "CREATE_SOURCE_DOCUMENT",
            document: data.document,
          })
        )
      )
      openSourceDocument(data.document.id, null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.")
    } finally {
      setUploadPending(false)
    }
  }

  const createProject = async () => {
    if (!projectName.trim()) {
      setMessage("Project name is required.")
      return
    }

    const now = createTimestamp()
    const projectId = createId("project")
    await submitMutations([
      {
        type: "CREATE_PROJECT",
        project: {
          id: projectId,
          name: projectName.trim(),
          objective: projectObjective.trim(),
          sourceDocumentIds: selectedPoolIds,
          workingDocumentIds: [],
          createdAt: now,
          updatedAt: now,
        },
      },
    ])
    setProjectName("")
    setProjectObjective("")
    setSelectedPoolIds([])
    updateRoute({ project: projectId, document: null, kind: null })
  }

  const updateProjectSources = async (sourceDocumentIds: string[]) => {
    if (!currentProject) {
      return
    }

    await submitMutations([
      {
        type: "UPSERT_PROJECT",
        project: {
          ...currentProject,
          sourceDocumentIds,
          updatedAt: createTimestamp(),
        },
      },
    ])
  }

  const togglePersona = async (persona: Persona) => {
    const activeIds = snapshot.personas.filter((item) => item.active).map((item) => item.id)
    const nextActiveIds = togglePersonaSelection(activeIds, persona.id)
    if (!persona.active && nextActiveIds.length === activeIds.length) {
      setMessage("Papier V3 only allows three active personas at once.")
      return
    }

    const now = createTimestamp()
    await submitMutations(
      snapshot.personas.map((item) => ({
        type: "UPSERT_PERSONA" as const,
        persona: {
          ...item,
          active: nextActiveIds.includes(item.id),
          updatedAt: item.id === persona.id ? now : item.updatedAt,
        },
      }))
    )
  }

  const createCustomPersona = async () => {
    if (!customPersonaName.trim() || !customPersonaDescription.trim()) {
      setMessage("Custom personas need both a name and a description.")
      return
    }

    const now = createTimestamp()
    await submitMutations([
      {
        type: "CREATE_PERSONA",
        persona: {
          id: createId("persona"),
          name: customPersonaName.trim(),
          description: customPersonaDescription.trim(),
          active: false,
          isPreset: false,
          createdAt: now,
          updatedAt: now,
        },
      },
    ])
    setCustomPersonaName("")
    setCustomPersonaDescription("")
  }

  const createBlankWorkingDocument = async () => {
    if (!currentProject || !workingTitle.trim()) {
      setMessage("Choose a project and title before creating a working document.")
      return
    }

    const now = createTimestamp()
    const documentId = createId("working")
    await submitMutations([
      {
        type: "CREATE_WORKING_DOCUMENT",
        document: {
          id: documentId,
          projectId: currentProject.id,
          title: workingTitle.trim(),
          markdown: `# ${workingTitle.trim()}\n\n`,
          sourceDocumentId: null,
          createdAt: now,
          updatedAt: now,
        },
      },
    ])
    setWorkingTitle("")
    openWorkingDocument(documentId, currentProject.id)
  }

  const createEditableCopy = async () => {
    if (!currentProject || !currentDocument || selectedDocumentKind !== "source") {
      return
    }

    const now = createTimestamp()
    const documentId = createId("working")
    await submitMutations([
      {
        type: "CREATE_WORKING_DOCUMENT",
        document: {
          id: documentId,
          projectId: currentProject.id,
          title: `${currentDocument.title} copy`,
          markdown: currentDocument.markdown,
          sourceDocumentId: currentDocument.id,
          createdAt: now,
          updatedAt: now,
        },
      },
    ])
    openWorkingDocument(documentId, currentProject.id)
  }

  const createAnnotation = async () => {
    if (!currentProject || !currentDocument || !selectedDocumentKind || !selection) {
      setMessage("Select text before creating an annotation.")
      return
    }

    const now = createTimestamp()
    await submitMutations([
      {
        type: "CREATE_ANNOTATION",
        annotation: {
          id: createId("annotation"),
          projectId: currentProject.id,
          documentId: currentDocument.id,
          documentKind: selectedDocumentKind,
          note: annotationNote.trim(),
          quote: selection.quote,
          prefix: selection.prefix,
          suffix: selection.suffix,
          isStale: false,
          createdAt: now,
          updatedAt: now,
        },
      },
    ])
    setAnnotationNote("")
    setSelection(null)
  }

  const createDocumentCommentThread = async () => {
    if (!currentProject || !currentDocument || !selectedDocumentKind || !documentComment.trim()) {
      setMessage("Choose a document and add a comment first.")
      return
    }

    const now = createTimestamp()
    const threadId = createId("thread")
    await submitMutations([
      {
        type: "CREATE_COMMENT_THREAD",
        thread: {
          id: threadId,
          projectId: currentProject.id,
          documentId: currentDocument.id,
          documentKind: selectedDocumentKind,
          annotationId: null,
          title: "Document notes",
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        type: "ADD_COMMENT",
        comment: {
          id: createId("comment"),
          threadId,
          body: documentComment.trim(),
          createdAt: now,
          updatedAt: now,
        },
      },
    ])
    setDocumentComment("")
  }

  const addCommentToThread = async (thread: CommentThread) => {
    const draft = commentDrafts[thread.id]?.trim()
    if (!draft) {
      return
    }

    const now = createTimestamp()
    await submitMutations([
      {
        type: "ADD_COMMENT",
        comment: {
          id: createId("comment"),
          threadId: thread.id,
          body: draft,
          createdAt: now,
          updatedAt: now,
        },
      },
    ])
    setCommentDrafts((current) => ({ ...current, [thread.id]: "" }))
  }

  const generateForPanel = async (kind: "lenses" | "provocations") => {
    if (!currentProject || !currentDocument || !selectedDocumentKind) {
      setMessage("Choose a project document before running AI.")
      return
    }
    if (!online) {
      setMessage(
        "Papier keeps previous AI output readable offline, but new AI runs are blocked until reconnect."
      )
      return
    }

    const endpoint = kind === "lenses" ? "/api/ai/lenses" : "/api/ai/provocations"
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: currentProject.id,
        documentId: currentDocument.id,
        documentKind: selectedDocumentKind,
      }),
    })

    if (!response.ok) {
      setMessage(`Failed to generate ${kind}.`)
      return
    }

    const data = (await response.json()) as { snapshot: WorkspaceSnapshot }
    setSnapshot(sortSnapshot(data.snapshot))
  }

  const submitChat = async () => {
    if (!chatPrompt.trim()) {
      return
    }
    if (!online) {
      setMessage("Papier blocks new AI generations while offline, including chat.")
      return
    }

    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: currentProject?.id || null,
        documentId: currentDocument?.id || null,
        documentKind: selectedDocumentKind,
        scope: chatScope,
        prompt: chatPrompt.trim(),
        selection,
      }),
    })

    if (!response.ok) {
      setMessage("Failed to send chat.")
      return
    }

    const data = (await response.json()) as {
      thread: ChatThread
      snapshot: WorkspaceSnapshot
    }
    setSnapshot(sortSnapshot(data.snapshot))
    setChatPrompt("")
    setActiveThreadId(data.thread.id)
  }

  const handleWorkingDocumentChange = useCallback(
    (nextMarkdown: string) => {
      if (!currentWorkingDocument) {
        return
      }

      setEditorValue(nextMarkdown)
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = window.setTimeout(async () => {
        const now = createTimestamp()
        const mutations: WorkspaceMutation[] = [
          {
            type: "UPDATE_WORKING_DOCUMENT",
            document: {
              ...currentWorkingDocument,
              markdown: nextMarkdown,
              updatedAt: now,
            },
          },
        ]

        currentAnnotations.forEach((annotation) => {
          const rebound = rebindTextAnchor(nextMarkdown, {
            quote: annotation.quote,
            prefix: annotation.prefix,
            suffix: annotation.suffix,
            start: 0,
            end: annotation.quote.length,
            isStale: annotation.isStale,
          })
          mutations.push({
            type: "UPSERT_ANNOTATION",
            annotation: {
              ...annotation,
              quote: rebound.quote,
              prefix: rebound.prefix,
              suffix: rebound.suffix,
              isStale: rebound.isStale,
              updatedAt: now,
            },
          })
        })

        await submitMutations(mutations)
        setMessage("Working document saved.")
      }, 700)
    },
    [currentAnnotations, currentWorkingDocument, submitMutations]
  )

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3">
            <div className="flex items-center gap-2 font-medium">
              <BookOpenIcon weight="duotone" className="size-5" />
              <span>Papier V3</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Document-first reading and writing with critique in the sidebar.
            </p>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Document pool</SidebarGroupLabel>
            <SidebarGroupContent className="space-y-3 px-2">
              <label className="block rounded-lg border border-dashed border-sidebar-border p-3 text-xs text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <PlusIcon className="size-4" />
                  Upload Markdown, PDF, or DOCX
                </div>
                <input
                  aria-label="Upload source document"
                  className="w-full text-xs"
                  disabled={uploadPending}
                  type="file"
                  accept=".md,.markdown,.txt,.pdf,.docx"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      void uploadFile(file)
                    }
                  }}
                />
              </label>
              <SidebarMenu>
                {snapshot.sourceDocuments.map((document) => (
                  <SidebarMenuItem key={document.id}>
                    <div className="flex items-center gap-2">
                      <input
                        aria-label={`Select ${document.title} for project creation`}
                        checked={selectedPoolIds.includes(document.id)}
                        type="checkbox"
                        onChange={() =>
                          setSelectedPoolIds((current) =>
                            current.includes(document.id)
                              ? current.filter((id) => id !== document.id)
                              : [...current, document.id]
                          )
                        }
                      />
                      <SidebarMenuButton
                        isActive={
                          selectedDocumentId === document.id &&
                          selectedDocumentKind === "source" &&
                          !currentProject
                        }
                        onClick={() => openSourceDocument(document.id, null)}
                      >
                        <span>{document.title}</span>
                        <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                          {document.conversionStatus}
                        </span>
                      </SidebarMenuButton>
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Create project</SidebarGroupLabel>
            <SidebarGroupContent className="space-y-2 px-2">
              <Input
                placeholder="Project name"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
              <textarea
                className="min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm"
                placeholder="Optional project objective"
                value={projectObjective}
                onChange={(event) => setProjectObjective(event.target.value)}
              />
              <Button className="w-full" onClick={() => void createProject()}>
                Create project from selected sources
              </Button>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {snapshot.projects.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      isActive={project.id === selectedProjectId}
                      onClick={() => updateRoute({ project: project.id })}
                    >
                      <span>{project.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {currentProject ? (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Project sources</SidebarGroupLabel>
                <SidebarGroupContent className="space-y-3 px-2">
                  <SidebarMenu>
                    {snapshot.sourceDocuments
                      .filter((document) => currentProject.sourceDocumentIds.includes(document.id))
                      .map((document) => (
                        <SidebarMenuItem key={document.id}>
                          <div className="flex items-center gap-2">
                            <SidebarMenuButton
                              isActive={
                                document.id === selectedDocumentId &&
                                selectedDocumentKind === "source"
                              }
                              onClick={() => openSourceDocument(document.id, currentProject.id)}
                            >
                              <span>{document.title}</span>
                            </SidebarMenuButton>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                void updateProjectSources(
                                  currentProject.sourceDocumentIds.filter(
                                    (id) => id !== document.id
                                  )
                                )
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        </SidebarMenuItem>
                      ))}
                  </SidebarMenu>
                  <div className="rounded-lg border border-border p-3">
                    <div className="mb-2 text-xs font-medium text-muted-foreground">
                      Add more source documents
                    </div>
                    <div className="space-y-2">
                      {snapshot.sourceDocuments
                        .filter((document) => !currentProject.sourceDocumentIds.includes(document.id))
                        .map((document) => (
                          <div key={document.id} className="flex items-center justify-between gap-2">
                            <span className="text-xs">{document.title}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void updateProjectSources([
                                  ...currentProject.sourceDocumentIds,
                                  document.id,
                                ])
                              }
                            >
                              Add
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Working docs</SidebarGroupLabel>
                <SidebarGroupContent className="space-y-2 px-2">
                  <Input
                    placeholder="New working document title"
                    value={workingTitle}
                    onChange={(event) => setWorkingTitle(event.target.value)}
                  />
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => void createBlankWorkingDocument()}
                  >
                    Create blank working document
                  </Button>
                  <SidebarMenu>
                    {snapshot.workingDocuments
                      .filter((document) => currentProject.workingDocumentIds.includes(document.id))
                      .map((document) => (
                        <SidebarMenuItem key={document.id}>
                          <SidebarMenuButton
                            isActive={
                              document.id === selectedDocumentId &&
                              selectedDocumentKind === "working"
                            }
                            onClick={() => openWorkingDocument(document.id, currentProject.id)}
                          >
                            <span>{document.title}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          ) : null}
        </SidebarContent>
        <SidebarFooter>
          <div className="rounded-xl border border-sidebar-border p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              {online ? (
                <GlobeIcon className="size-4" />
              ) : (
                <WarningCircleIcon className="size-4" />
              )}
              {online ? "Online" : "Offline"}
            </div>
            <p className="mt-1">
              {queue.length
                ? `${queue.length} queued mutation${queue.length === 1 ? "" : "s"}`
                : "Everything synced."}
            </p>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div>
                <h1 className="font-medium">{currentProject ? currentProject.name : "Workspace"}</h1>
                <p className="text-sm text-muted-foreground">
                  {currentProject?.objective ||
                    "Upload sources, create a project, then work document-first."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`rounded-full px-3 py-1 ${
                  online
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                }`}
              >
                {online ? "Online" : "Offline cache mode"}
              </span>
              <span className="rounded-full bg-muted px-3 py-1">
                {queue.length ? `${queue.length} pending sync` : "All changes synced"}
              </span>
            </div>
          </div>
        </header>
        <div className="flex min-h-[calc(100svh-73px)] flex-col lg:flex-row">
          <section className="flex-1 overflow-auto border-r border-border">
            <div className="space-y-6 p-6">
              {message ? (
                <div className="rounded-xl border border-border bg-card p-4 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircleIcon className="size-4" />
                    Workspace status
                  </div>
                  <p className="mt-1 text-muted-foreground">{message}</p>
                </div>
              ) : null}
              {currentDocument ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <SparkleIcon className="size-4" />
                        {selectedDocumentKind === "source"
                          ? "Read-only source document"
                          : "Editable project working document"}
                      </div>
                      <h2 className="mt-1 text-xl font-semibold">{currentDocument.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedDocumentKind === "source"
                          ? "Source documents stay immutable. Use an editable copy to write."
                          : "Working documents autosave and keep annotations rebound when possible."}
                      </p>
                      {selectedDocumentKind === "source" ? (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full bg-muted px-2 py-1 uppercase">
                            {currentSourceDocument?.conversionStatus || "ready"}
                          </span>
                          {currentSourceDocument?.conversionError ? (
                            <span>{currentSourceDocument.conversionError}</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedDocumentKind === "source" && currentProject ? (
                        <Button variant="secondary" onClick={() => void createEditableCopy()}>
                          Make editable copy
                        </Button>
                      ) : null}
                      {selectedDocumentKind === "working" ? (
                        <a href={`/api/export/${currentDocument.id}`}>
                          <Button variant="secondary">Export Markdown</Button>
                        </a>
                      ) : null}
                      <Button variant="outline" onClick={() => setChatScope("document")}>
                        Chat about document
                      </Button>
                      {currentProject ? (
                        <Button variant="outline" onClick={() => setChatScope("project")}>
                          Chat about project
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {selection ? (
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <NotePencilIcon className="size-4" />
                        Selected passage
                      </div>
                      <blockquote className="mt-2 border-l-2 border-primary pl-4 text-sm italic">
                        {selection.quote}
                      </blockquote>
                      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                        <textarea
                          className="min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm"
                          placeholder="Optional note for this annotation"
                          value={annotationNote}
                          onChange={(event) => setAnnotationNote(event.target.value)}
                        />
                        <Button onClick={() => void createAnnotation()}>Create annotation</Button>
                        <Button variant="secondary" onClick={() => setChatScope("selection")}>
                          Send to scoped chat
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {selectedDocumentKind === "source" ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-xl border border-border bg-card p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                          <ClockCounterClockwiseIcon className="size-4" />
                          Original file preview
                        </div>
                        <pre className="max-h-[60svh] overflow-auto whitespace-pre-wrap text-sm text-muted-foreground">
                          {currentSourceDocument?.originalTextPreview ||
                            "No original preview was available for this upload."}
                        </pre>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                          <BookOpenIcon className="size-4" />
                          Converted Markdown
                        </div>
                        <MarkdownDocument
                          markdown={currentSourceDocument?.markdown || ""}
                          annotations={currentAnnotations}
                          onSelectionChange={setSelection}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                      <div className="rounded-xl border border-border bg-card p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <FloppyDiskBackIcon className="size-4" />
                            Working document editor
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Autosaves after a short pause
                          </span>
                        </div>
                        <textarea
                          aria-label="Working document editor"
                          className="min-h-[60svh] w-full rounded-lg border border-input bg-background p-4 font-mono text-sm"
                          value={editorValue}
                          onChange={(event) => handleWorkingDocumentChange(event.target.value)}
                        />
                      </div>
                      <div className="rounded-xl border border-border bg-card p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                          <BookOpenIcon className="size-4" />
                          Markdown preview
                        </div>
                        <MarkdownDocument
                          markdown={editorValue}
                          annotations={currentAnnotations}
                          onSelectionChange={setSelection}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
                  <BrainIcon className="mx-auto size-10 text-muted-foreground" />
                  <h2 className="mt-4 text-xl font-semibold">Start with a source document</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Upload Markdown, PDF, or DOCX files into the pool, create a project from
                    selected sources, and keep the document centered while AI stays in the right
                    sidebar.
                  </p>
                </div>
              )}
            </div>
          </section>
          <aside className="w-full max-w-full overflow-auto bg-muted/20 lg:w-[28rem] lg:max-w-[28rem]">
            <div className="space-y-4 p-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setPanels((current) => ({ ...current, lenses: !current.lenses }))}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <LightningIcon className="size-4" />
                    Lenses & provocations
                  </div>
                  <SidebarSimpleIcon
                    className={`size-4 transition-transform ${panels.lenses ? "rotate-90" : ""}`}
                  />
                </button>
                {panels.lenses ? (
                  <div className="mt-4 space-y-4 text-sm">
                    <div>
                      <div className="mb-2 font-medium">Active personas</div>
                      <div className="space-y-2">
                        {snapshot.personas.map((persona) => (
                          <label
                            key={persona.id}
                            className="flex items-start gap-2 rounded-lg border border-border p-2"
                          >
                            <input
                              checked={persona.active}
                              type="checkbox"
                              onChange={() => void togglePersona(persona)}
                            />
                            <span>
                              <span className="font-medium">{persona.name}</span>
                              <span className="block text-xs text-muted-foreground">
                                {persona.description}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 rounded-lg border border-border p-3">
                      <div className="font-medium">Create custom persona</div>
                      <Input
                        placeholder="Persona name"
                        value={customPersonaName}
                        onChange={(event) => setCustomPersonaName(event.target.value)}
                      />
                      <textarea
                        className="min-h-20 w-full rounded-lg border border-input bg-background p-3"
                        placeholder="What should this persona pay attention to?"
                        value={customPersonaDescription}
                        onChange={(event) => setCustomPersonaDescription(event.target.value)}
                      />
                      <Button
                        className="w-full"
                        variant="secondary"
                        onClick={() => void createCustomPersona()}
                      >
                        Save persona
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => void generateForPanel("lenses")}>
                        Generate lenses
                      </Button>
                      <Button
                        className="flex-1"
                        variant="secondary"
                        onClick={() => void generateForPanel("provocations")}
                      >
                        Generate provocations
                      </Button>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <div className="font-medium">Current AI scope preview</div>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                        {scopePreview || "Choose a document or project to build AI scope."}
                      </pre>
                    </div>
                    <div>
                      <div className="font-medium">Latest lens</div>
                      {lensGeneration ? (
                        <div className="mt-2 space-y-3 rounded-lg border border-border p-3">
                          <p className="text-sm text-muted-foreground">{lensGeneration.overview}</p>
                          {lensGeneration.sections.map((section) => (
                            <div key={section.sectionId} className="rounded-lg bg-muted/40 p-3">
                              <div className="font-medium">{section.title}</div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {section.summary}
                              </p>
                              <blockquote className="mt-2 border-l-2 border-primary pl-3 text-xs italic">
                                {section.quote}
                              </blockquote>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          No lens generated yet for this document.
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">Latest provocations</div>
                      {provocationGeneration ? (
                        <div className="mt-2 space-y-2 rounded-lg border border-border p-3">
                          {provocationGeneration.cards.map((card) => (
                            <div key={card.id} className="rounded-lg bg-muted/40 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-medium">{card.title}</div>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs ${
                                    card.applicable
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                  }`}
                                >
                                  {card.applicable ? "Applicable" : "Not applicable"}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{card.body}</p>
                              <blockquote className="mt-2 border-l-2 border-primary pl-3 text-xs italic">
                                {card.quote}
                              </blockquote>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          No provocations generated yet for this document.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setPanels((current) => ({ ...current, chat: !current.chat }))}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <ChatCircleDotsIcon className="size-4" />
                    Chat
                  </div>
                  <SidebarSimpleIcon
                    className={`size-4 transition-transform ${panels.chat ? "rotate-90" : ""}`}
                  />
                </button>
                {panels.chat ? (
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Compose scope
                        <select
                          className="mt-1 w-full rounded-lg border border-input bg-background p-2"
                          value={chatScope}
                          onChange={(event) => setChatScope(event.target.value as ChatScope)}
                        >
                          <option value="selection">Selected text</option>
                          <option value="document">Current document</option>
                          <option value="project">Full project</option>
                        </select>
                      </label>
                      <label className="text-xs font-medium text-muted-foreground">
                        History filter
                        <select
                          className="mt-1 w-full rounded-lg border border-input bg-background p-2"
                          value={chatFilter}
                          onChange={(event) =>
                            setChatFilter(event.target.value as ChatScope | "all")
                          }
                        >
                          <option value="all">All scopes</option>
                          <option value="selection">Selected text</option>
                          <option value="document">Document</option>
                          <option value="project">Project</option>
                        </select>
                      </label>
                    </div>
                    <textarea
                      className="min-h-24 w-full rounded-lg border border-input bg-background p-3"
                      placeholder="Ask a scoped question without turning the workspace into a chat-first tool."
                      value={chatPrompt}
                      onChange={(event) => setChatPrompt(event.target.value)}
                    />
                    <Button className="w-full" onClick={() => void submitChat()}>
                      Send chat message
                    </Button>
                    <div className="space-y-2">
                      {chatThreads.map((thread) => {
                        const stale =
                          thread.scope === "project" &&
                          isProjectFingerprintStale(
                            thread.projectFingerprint,
                            currentFingerprint || ""
                          )
                        return (
                          <button
                            key={thread.id}
                            className={`w-full rounded-lg border p-3 text-left ${
                              activeChatThread?.id === thread.id
                                ? "border-primary bg-primary/5"
                                : "border-border bg-muted/30"
                            }`}
                            onClick={() => setActiveThreadId(thread.id)}
                          >
                            <div className="flex items-center justify-between gap-2 font-medium">
                              <span>{thread.title}</span>
                              {stale ? (
                                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-300">
                                  <WarningCircleIcon className="size-4 text-amber-500" />
                                  Stale
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Scope: {thread.scope}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                    {activeChatThread ? (
                      <div className="space-y-2 rounded-lg border border-border p-3">
                        {snapshot.chatMessages
                          .filter((chatMessage) => chatMessage.threadId === activeChatThread.id)
                          .map((chatMessage) => (
                            <div
                              key={chatMessage.id}
                              className={`rounded-lg p-3 ${
                                chatMessage.role === "assistant"
                                  ? "bg-muted/40"
                                  : "bg-primary/10"
                              }`}
                            >
                              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {chatMessage.role}
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-sm">
                                {chatMessage.content}
                              </p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No chat thread selected yet.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() =>
                    setPanels((current) => ({ ...current, comments: !current.comments }))
                  }
                >
                  <div className="flex items-center gap-2 font-medium">
                    <NotePencilIcon className="size-4" />
                    Comments & annotations
                  </div>
                  <SidebarSimpleIcon
                    className={`size-4 transition-transform ${panels.comments ? "rotate-90" : ""}`}
                  />
                </button>
                {panels.comments ? (
                  <div className="mt-4 space-y-4 text-sm">
                    <div className="rounded-lg border border-border p-3">
                      <div className="font-medium">Document-level comment</div>
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background p-3"
                        placeholder="Store a project-scoped observation about the whole document."
                        value={documentComment}
                        onChange={(event) => setDocumentComment(event.target.value)}
                      />
                      <Button
                        className="mt-2 w-full"
                        variant="secondary"
                        onClick={() => void createDocumentCommentThread()}
                      >
                        Add document comment
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <div className="font-medium">Annotations</div>
                      {currentAnnotations.length ? (
                        currentAnnotations.map((annotation) => {
                          const thread = annotationThreads.get(annotation.id) || null
                          return (
                            <div
                              key={annotation.id}
                              className="rounded-lg border border-border p-3"
                            >
                              <button
                                className="w-full text-left"
                                onClick={() =>
                                  document
                                    .querySelector(
                                      `[data-annotation-id=\"${annotation.id}\"]`
                                    )
                                    ?.scrollIntoView({
                                      behavior: "smooth",
                                      block: "center",
                                    })
                                }
                              >
                                <div className="flex items-center justify-between gap-2 font-medium">
                                  <span>{annotation.quote}</span>
                                  {annotation.isStale ? (
                                    <WarningCircleIcon className="size-4 text-amber-500" />
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {annotation.note || "No note yet."}
                                </p>
                              </button>
                              {commentsForThread(thread, snapshot).length ? (
                                <div className="mt-3 space-y-2">
                                  {commentsForThread(thread, snapshot).map((comment) => (
                                    <div
                                      key={comment.id}
                                      className="rounded-lg bg-muted/40 p-2 text-xs"
                                    >
                                      {comment.body}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                              <textarea
                                className="mt-3 min-h-20 w-full rounded-lg border border-input bg-background p-3 text-xs"
                                placeholder="Add a threaded comment to this annotation"
                                value={commentDrafts[annotation.id] || ""}
                                onChange={(event) =>
                                  setCommentDrafts((current) => ({
                                    ...current,
                                    [annotation.id]: event.target.value,
                                  }))
                                }
                              />
                              <Button
                                className="mt-2 w-full"
                                variant="outline"
                                onClick={async () => {
                                  const draft = commentDrafts[annotation.id]?.trim()
                                  if (!draft || !currentProject || !currentDocument || !selectedDocumentKind) {
                                    return
                                  }
                                  const now = createTimestamp()
                                  const existingThread = annotationThreads.get(annotation.id)
                                  const threadId = existingThread?.id || createId("thread")
                                  const mutations: WorkspaceMutation[] = []
                                  if (!existingThread) {
                                    mutations.push({
                                      type: "CREATE_COMMENT_THREAD",
                                      thread: {
                                        id: threadId,
                                        projectId: currentProject.id,
                                        documentId: currentDocument.id,
                                        documentKind: selectedDocumentKind,
                                        annotationId: annotation.id,
                                        title: `Discussion for ${annotation.quote.slice(0, 32)}`,
                                        createdAt: now,
                                        updatedAt: now,
                                      },
                                    })
                                  }
                                  mutations.push({
                                    type: "ADD_COMMENT",
                                    comment: {
                                      id: createId("comment"),
                                      threadId,
                                      body: draft,
                                      createdAt: now,
                                      updatedAt: now,
                                    },
                                  })
                                  await submitMutations(mutations)
                                  setCommentDrafts((current) => ({
                                    ...current,
                                    [annotation.id]: "",
                                  }))
                                }}
                              >
                                Add annotation comment
                              </Button>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No annotations yet. Select text in the document to create one.
                        </p>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="font-medium">Document threads</div>
                      {relevantThreads
                        .filter((thread) => !thread.annotationId)
                        .map((thread) => (
                          <div key={thread.id} className="rounded-lg border border-border p-3">
                            <div className="font-medium">{thread.title}</div>
                            <div className="mt-2 space-y-2">
                              {commentsForThread(thread, snapshot).map((comment) => (
                                <div
                                  key={comment.id}
                                  className="rounded-lg bg-muted/40 p-2 text-xs"
                                >
                                  {comment.body}
                                </div>
                              ))}
                            </div>
                            <textarea
                              className="mt-3 min-h-20 w-full rounded-lg border border-input bg-background p-3 text-xs"
                              placeholder="Reply to this document thread"
                              value={commentDrafts[thread.id] || ""}
                              onChange={(event) =>
                                setCommentDrafts((current) => ({
                                  ...current,
                                  [thread.id]: event.target.value,
                                }))
                              }
                            />
                            <Button
                              className="mt-2 w-full"
                              variant="outline"
                              onClick={() => void addCommentToThread(thread)}
                            >
                              Add reply
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
