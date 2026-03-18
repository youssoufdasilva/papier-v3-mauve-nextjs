import { expect, test } from "@playwright/test"

async function selectText(page: import("@playwright/test").Page, target: string) {
  await page.evaluate((needle) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      const text = node.textContent || ""
      const index = text.indexOf(needle)
      if (index >= 0) {
        const range = document.createRange()
        range.setStart(node, index)
        range.setEnd(node, index + needle.length)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
        const container = node.parentElement || document.body
        container.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
        return
      }
    }
    throw new Error(`Could not find text: ${needle}`)
  }, target)
}

test("first run flow from upload to project to AI generation", async ({ page }) => {
  const suffix = Date.now()
  const sourceTitle = `Source ${suffix}`

  await page.goto("/")
  await page.locator('input[type="file"]').setInputFiles({
    name: `${sourceTitle}.md`,
    mimeType: "text/markdown",
    buffer: Buffer.from("# Intro\n\nPapier keeps the document at the center of the workspace."),
  })

  await expect(page.getByText(sourceTitle)).toBeVisible()
  await page.getByLabel(`Select ${sourceTitle} for project creation`).check()
  await page.getByPlaceholder("Project name").fill(`Project ${suffix}`)
  await page.getByPlaceholder("Optional project objective").fill("Launch a demo")
  await page.getByRole("button", { name: "Create project from selected sources" }).click()

  await expect(page.getByText(`Project ${suffix}`)).toBeVisible()
  await page.getByRole("button", { name: sourceTitle }).last().click()
  await expect(page.getByText("Original file preview")).toBeVisible()
  await expect(page.getByText("Converted Markdown")).toBeVisible()

  await page.getByRole("button", { name: "Generate lenses" }).click()
  await page.getByRole("button", { name: "Generate provocations" }).click()

  await expect(page.getByText("Objective: Launch a demo.")).toBeVisible()
  await expect(page.getByText("What would a skeptical reader push back on?")).toBeVisible()
})

test("writing flow covers annotations comments chat and export", async ({ page }) => {
  const suffix = Date.now()
  const sourceTitle = `Writer ${suffix}`

  await page.goto("/")
  await page.locator('input[type="file"]').setInputFiles({
    name: `${sourceTitle}.md`,
    mimeType: "text/markdown",
    buffer: Buffer.from("# Draft\n\nA careful candidate writes with evidence and tradeoffs."),
  })

  await page.getByLabel(`Select ${sourceTitle} for project creation`).check()
  await page.getByPlaceholder("Project name").fill(`Writing ${suffix}`)
  await page.getByRole("button", { name: "Create project from selected sources" }).click()
  await page.getByPlaceholder("New working document title").fill(`Draft ${suffix}`)
  await page.getByRole("button", { name: "Create blank working document" }).click()

  const editor = page.getByLabel("Working document editor")
  await editor.fill("# Working draft\n\nA careful candidate writes with evidence and tradeoffs.\n\nSecond paragraph.")
  await expect(page.getByText("Working document saved.")).toBeVisible()

  await selectText(page, "evidence and tradeoffs")
  await page.getByPlaceholder("Optional note for this annotation").fill("Keep this passage in view")
  await page.getByRole("button", { name: "Create annotation" }).click()
  await expect(page.getByText("Keep this passage in view")).toBeVisible()

  await page.getByPlaceholder("Store a project-scoped observation about the whole document.").fill("Overall direction is strong.")
  await page.getByRole("button", { name: "Add document comment" }).click()
  await expect(page.getByText("Overall direction is strong.")).toBeVisible()

  await page.getByPlaceholder("Ask a scoped question without turning the workspace into a chat-first tool.").fill("What is strongest here?")
  await page.getByRole("button", { name: "Send chat message" }).click()
  await expect(page.getByText("What is strongest here?")).toBeVisible()

  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Export Markdown" }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain("Draft")
})

test("offline edits queue sync and project chat goes stale after membership changes", async ({ page, context }) => {
  const suffix = Date.now()
  const firstTitle = `Offline ${suffix}`
  const secondTitle = `Added ${suffix}`

  await page.goto("/")
  await page.locator('input[type="file"]').setInputFiles({
    name: `${firstTitle}.md`,
    mimeType: "text/markdown",
    buffer: Buffer.from("# Offline\n\nCached AI output should still be readable."),
  })
  await page.getByLabel(`Select ${firstTitle} for project creation`).check()
  await page.getByPlaceholder("Project name").fill(`Offline ${suffix}`)
  await page.getByRole("button", { name: "Create project from selected sources" }).click()
  await page.getByRole("button", { name: firstTitle }).last().click()
  await page.getByRole("button", { name: "Generate lenses" }).click()
  await expect(page.getByText("Latest lens")).toBeVisible()

  await page.getByLabel("Compose scope").selectOption("project")
  await page.getByPlaceholder("Ask a scoped question without turning the workspace into a chat-first tool.").fill("What changed across the project?")
  await page.getByRole("button", { name: "Send chat message" }).click()
  await expect(page.getByText(`Project chat: Offline ${suffix}`)).toBeVisible()

  await page.getByPlaceholder("New working document title").fill(`Offline draft ${suffix}`)
  await page.getByRole("button", { name: "Create blank working document" }).click()
  const editor = page.getByLabel("Working document editor")

  await context.setOffline(true)
  await editor.fill("# Offline draft\n\nThis edit should queue locally.")
  await expect(page.getByText("1 pending sync")).toBeVisible()
  await page.getByRole("button", { name: "Generate lenses" }).click()
  await expect(page.getByText("Papier keeps previous AI output readable offline, but new AI runs are blocked until reconnect.")).toBeVisible()

  await context.setOffline(false)
  await expect(page.getByText("All changes synced")).toBeVisible({ timeout: 15000 })

  await page.locator('input[type="file"]').setInputFiles({
    name: `${secondTitle}.md`,
    mimeType: "text/markdown",
    buffer: Buffer.from("# Added\n\nSecond project document."),
  })
  await page.getByRole("button", { name: "Add" }).last().click()
  await expect(page.getByText("Stale")).toBeVisible()
})
