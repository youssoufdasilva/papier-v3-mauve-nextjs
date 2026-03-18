import type { QueuedMutation } from "@/lib/papier/types"

export function enqueueMutation(queue: QueuedMutation[], mutation: QueuedMutation) {
  if (queue.some((item) => item.clientMutationId === mutation.clientMutationId)) {
    return queue
  }

  return [...queue, mutation]
}

export function acknowledgeQueueItems(queue: QueuedMutation[], acknowledgedIds: string[]) {
  return queue.filter((item) => !acknowledgedIds.includes(item.clientMutationId))
}
