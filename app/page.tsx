import { WorkspaceApp } from "@/components/papier/workspace-app"
import { loadWorkspaceSnapshot } from "@/lib/server/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function Page() {
  return <WorkspaceApp initialSnapshot={loadWorkspaceSnapshot()} />
}
