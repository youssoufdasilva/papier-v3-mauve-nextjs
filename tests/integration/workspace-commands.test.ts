import { describe, expect, it } from "vitest"

import { applyWorkspaceMutation, createEmptySnapshot } from "@/lib/papier/commands"

describe("workspace mutation reducer", () => {
  it("creates projects and working documents", () => {
    let snapshot = createEmptySnapshot()

    snapshot = applyWorkspaceMutation(snapshot, {
      type: "CREATE_PROJECT",
      project: {
        id: "project-1",
        name: "Alpha",
        objective: "Draft",
        sourceDocumentIds: [],
        workingDocumentIds: [],
        createdAt: "2026-03-18T00:00:00.000Z",
        updatedAt: "2026-03-18T00:00:00.000Z",
      },
    })

    snapshot = applyWorkspaceMutation(snapshot, {
      type: "CREATE_WORKING_DOCUMENT",
      document: {
        id: "working-1",
        projectId: "project-1",
        title: "Draft",
        markdown: "# Draft",
        sourceDocumentId: null,
        createdAt: "2026-03-18T00:00:00.000Z",
        updatedAt: "2026-03-18T00:00:00.000Z",
      },
    })

    expect(snapshot.projects[0].workingDocumentIds).toEqual(["working-1"])
    expect(snapshot.workingDocuments[0].title).toBe("Draft")
  })

  it("persists annotations and comments in project scope", () => {
    let snapshot = createEmptySnapshot()

    snapshot = applyWorkspaceMutation(snapshot, {
      type: "CREATE_ANNOTATION",
      annotation: {
        id: "annotation-1",
        projectId: "project-1",
        documentId: "source-1",
        documentKind: "source",
        note: "important",
        quote: "signal",
        prefix: "good ",
        suffix: " here",
        isStale: false,
        createdAt: "2026-03-18T00:00:00.000Z",
        updatedAt: "2026-03-18T00:00:00.000Z",
      },
    })

    snapshot = applyWorkspaceMutation(snapshot, {
      type: "CREATE_COMMENT_THREAD",
      thread: {
        id: "thread-1",
        projectId: "project-1",
        documentId: "source-1",
        documentKind: "source",
        annotationId: "annotation-1",
        title: "Thread",
        createdAt: "2026-03-18T00:00:00.000Z",
        updatedAt: "2026-03-18T00:00:00.000Z",
      },
    })

    snapshot = applyWorkspaceMutation(snapshot, {
      type: "ADD_COMMENT",
      comment: {
        id: "comment-1",
        threadId: "thread-1",
        body: "Keep pulling here",
        createdAt: "2026-03-18T00:00:00.000Z",
        updatedAt: "2026-03-18T00:00:00.000Z",
      },
    })

    expect(snapshot.annotations).toHaveLength(1)
    expect(snapshot.commentThreads[0].annotationId).toBe("annotation-1")
    expect(snapshot.comments[0].body).toContain("Keep")
  })
})
