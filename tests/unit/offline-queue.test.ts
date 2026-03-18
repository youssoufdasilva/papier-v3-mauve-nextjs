import { describe, expect, it } from "vitest"

import { acknowledgeQueueItems, enqueueMutation } from "@/lib/papier/offline-queue"

describe("offline queue", () => {
  it("enqueues mutations in order", () => {
    const queue = enqueueMutation([], {
      clientMutationId: "1",
      type: "UPDATE_WORKING_DOCUMENT",
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

    expect(queue).toHaveLength(1)
    expect(queue[0].clientMutationId).toBe("1")
  })

  it("does not enqueue duplicate client mutation ids", () => {
    const queue = enqueueMutation(
      [
        {
          clientMutationId: "1",
          type: "UPDATE_WORKING_DOCUMENT",
          document: {
            id: "working-1",
            projectId: "project-1",
            title: "Draft",
            markdown: "# Draft",
            sourceDocumentId: null,
            createdAt: "2026-03-18T00:00:00.000Z",
            updatedAt: "2026-03-18T00:00:00.000Z",
          },
        },
      ],
      {
        clientMutationId: "1",
        type: "UPDATE_WORKING_DOCUMENT",
        document: {
          id: "working-1",
          projectId: "project-1",
          title: "Draft",
          markdown: "# Draft v2",
          sourceDocumentId: null,
          createdAt: "2026-03-18T00:00:00.000Z",
          updatedAt: "2026-03-18T01:00:00.000Z",
        },
      }
    )

    expect(queue).toHaveLength(1)
  })

  it("acknowledges applied mutations", () => {
    const queue = acknowledgeQueueItems(
      [
        {
          clientMutationId: "1",
          type: "UPDATE_WORKING_DOCUMENT",
          document: {
            id: "working-1",
            projectId: "project-1",
            title: "Draft",
            markdown: "# Draft",
            sourceDocumentId: null,
            createdAt: "2026-03-18T00:00:00.000Z",
            updatedAt: "2026-03-18T00:00:00.000Z",
          },
        },
        {
          clientMutationId: "2",
          type: "ADD_COMMENT",
          comment: {
            id: "comment-1",
            threadId: "thread-1",
            body: "Hello",
            createdAt: "2026-03-18T00:00:00.000Z",
            updatedAt: "2026-03-18T00:00:00.000Z",
          },
        },
      ],
      ["1"]
    )

    expect(queue).toEqual([
      {
        clientMutationId: "2",
        type: "ADD_COMMENT",
        comment: {
          id: "comment-1",
          threadId: "thread-1",
          body: "Hello",
          createdAt: "2026-03-18T00:00:00.000Z",
          updatedAt: "2026-03-18T00:00:00.000Z",
        },
      },
    ])
  })
})
