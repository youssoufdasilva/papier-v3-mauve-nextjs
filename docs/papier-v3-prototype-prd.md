# PRD: Papier V3 prototype

## Problem Statement

Papier needs a tracer bullet prototype that tests one question fast:

Do document anchored AI lenses and provocations change how people think while reading and writing?

Current AI tools bias toward chat first workflows, broad context blobs, and auto completion. That makes work faster in some cases, but often pulls attention away from the document, weakens material engagement, and collapses critique into obedience.

Papier V3 should test a different interaction model:

1. Document first, not chat first.
2. AI as resistance and critique, not auto editing.
3. Read and write remain human acts.
4. AI interactions stay scoped, contextual, and anchored to documents.
5. The prototype must be usable enough that the user can judge whether annotations, comments, lenses, provocations, and scoped chat feel coherent in one workspace.

The prototype is single user, no accounts, SQLite only, web PWA only, and intentionally thin. It should touch import, storage, project structure, document reading, document writing, AI generation, offline behavior, export, and testing end to end.

## Solution

Build "Papier V3" as a single user document workspace with these behaviors:

1. A user uploads documents into a personal document pool.
2. On upload, each document is converted to Markdown through a swappable conversion adapter that initially uses `markdown.new/file-to-markdown`.
3. The pool stores both the original file and the converted Markdown. The pool UI lets the user inspect both side by side.
4. The user creates projects from documents in the pool and may optionally set project goals.
5. Imported documents remain read only inside projects.
6. A project may also contain working documents that are editable Markdown documents created inside the project or copied from imported documents.
7. The main workspace keeps the document centered. AI lives in the right sidebar, not as the primary surface.
8. The right sidebar has three independently manageable panels:
   1. Lenses & Provocations
   2. Chat
   3. Comments & Annotations
9. Lenses are section by section representations of a document, generated per persona.
10. Provocations are critique cards generated per persona, independent of lenses, intended to stimulate thinking rather than be accepted by default.
11. Chat is available, scoped to selected text, current document, or full project. Scope is auto selected from the activation point, but changeable.
12. Annotations and comments exist in the sidebar and are attached to selected text or the document as a whole. This is intentionally opinionated in V3 so the user can decide whether it feels right.
13. AI never auto edits documents. Ever.
14. Previously generated AI output remains readable offline. Editing, annotating, and commenting still work offline. New AI generations do not.
15. Export is Markdown only for V3.

The prototype should be implemented so a coding agent can complete it in a long running cloud environment using red green TDD, verify behavior with automated tests, inspect the UI with Rodney, and generate a `demo.md` artifact with Showboat.

## User Stories

1. As a single user, I want to open Papier V3 without signing in, so that I can start using the prototype immediately.
2. As a user, I want a left sidebar workspace shell based on `shadcn` `sidebar-07`, so that navigation feels structured from the start.
3. As a user, I want to upload a Markdown, PDF, or Word document into my document pool, so that I can bring source material into the workspace.
4. As a user, I want each uploaded file converted to Markdown automatically, so that the workspace can operate on one editable and readable text format.
5. As a user, I want to see conversion status for each upload, so that I know whether a document is ready, still processing, or failed.
6. As a user, I want to inspect the original file and converted Markdown side by side in the pool, so that I can judge conversion quality even though HITL correction is not in scope.
7. As a user, I want uploaded documents to remain available in the pool even when they are not in a project, so that I can reuse them later.
8. As a user, I want to create a project from selected pool documents, so that I can organize work around a task.
9. As a user, I want to optionally set a project objective, so that AI generations can be grounded in my intent.
10. As a user, I want to add or remove pool documents from a project after creation, so that the project can evolve as my work changes.
11. As a user, I want imported project documents to be read only, so that shared source documents are not silently mutated.
12. As a user, I want to create a blank working document inside a project, so that I can write new material.
13. As a user, I want to create an editable copy of an imported document, so that I can revise source material without mutating the original import.
14. As a user, I want the main center pane to show the active document, so that the document stays front and centre.
15. As a user, I want the right sidebar panels to be independently openable, closable, and collapsible, so that I can control cognitive load.
16. As a user, I want to select text in a document and create an annotation, so that I can mark a passage that matters.
17. As a user, I want annotations to highlight the selected range in the document and also appear in the sidebar, so that I can navigate between my marks and my notes.
18. As a user, I want to add comments to an annotation thread, so that I can build thought around a highlighted passage.
19. As a user, I want to create a document level comment without selecting text, so that I can store general observations.
20. As a user, I want comments and annotations to be project scoped, so that the same source document can support different reading goals in different projects.
21. As a user, I want preset personas such as researcher, recruiter, and senior engineer, so that I can quickly try different evaluative frames.
22. As a user, I want to create my own persona, so that the system can reflect my specific role or lens.
23. As a user, I want to activate up to three personas at once, so that I can compare perspectives without overload.
24. As a user, I want to generate lenses for the current document, so that I can get section by section representations shaped by active personas.
25. As a user, I want lenses to be attached to document sections derived from headings or chunks, so that the output maps back to the source text.
26. As a user, I want to generate provocations for the current document, so that I can see fallacies, counterarguments, alternatives, and other critiques.
27. As a user, I want provocations to be independent from lenses, so that one can exist without the other.
28. As a user, I want provocations to be allowed to be inapplicable, so that the tool stimulates judgment instead of pretending certainty.
29. As a user, I want to launch chat from selected text, so that the AI focuses tightly on a passage.
30. As a user, I want to launch chat from the current document, so that I can ask questions about the whole document without dragging text around.
31. As a user, I want to launch chat from the full project, so that I can compare across documents and project goals.
32. As a user, I want chat scope to auto select based on where I start the chat, so that the common path is fast.
33. As a user, I want chat scope to be changeable before sending, so that I can correct the system when it guessed wrong.
34. As a user, I want chat history to be filterable by scope, so that I can separate passage level chats from document or project chats.
35. As a user, I want document scoped chats to travel with the document even if it is removed from a project, so that those conversations remain attached to their source.
36. As a user, I want project scoped chats to show a warning if the project changed after the chat was generated, so that I can judge possible staleness.
37. As a user, I want AI generated content to remain clearly separate from the document body, so that I always know what I wrote and what the model generated.
38. As a user, I want AI to never auto edit my document, so that control over the text stays with me.
39. As a user, I want to keep reading previously generated lenses, provocations, and chats while offline, so that travel or bad connectivity does not make the workspace useless.
40. As a user, I want to continue editing working documents and adding comments and annotations while offline, so that thought work can continue.
41. As a user, I want the app to prevent new AI generations while offline and explain why, so that the limitation is clear instead of confusing.
42. As a user, I want my offline edits and notes to sync when I return online, so that the cloud copy catches up.
43. As a user, I want to export a working document as Markdown, so that I can take my writing elsewhere.
44. As a user, I want conversion and AI failures to fail visibly and recoverably, so that the prototype feels debuggable instead of mysterious.
45. As a user, I want removed imported documents to remain in the pool, so that project membership and source ownership are distinct.
46. As a user, I want to reopen the app and find my projects, documents, annotations, comments, personas, and AI outputs still there, so that the workspace behaves like a tool, not a session.
47. As a user, I want the prototype to feel coherent enough to judge whether sidebar comments and annotations are the right model, so that V3 actually answers a design question instead of just shipping features.

## Implementation Decisions

1. Product shape
   1. Build a web PWA named "Papier V3".
   2. Single user only. No auth, no accounts, no sharing.
   3. Use SQLite as the only server side database.
   4. Use a client side offline store for cached reads and queued writes. This does not replace SQLite as the system database.

2. UI shell
   1. Use `shadcn` `sidebar-07` as the left navigation reference and starting block.
   2. The layout has:
      1. Left sidebar for pool, projects, and documents
      2. Center pane for active document
      3. Right sidebar for AI and notes
   3. The right sidebar has three independently managed panels:
      1. Lenses & Provocations
      2. Chat
      3. Comments & Annotations
   4. Panel open and collapse state should persist locally on the device.

3. Document model
   1. There are two document classes:
      1. Source documents in the pool
      2. Working documents inside projects
   2. Source documents store:
      1. Original uploaded file
      2. Converted Markdown
      3. Conversion status and metadata
   3. Source documents are reusable across projects.
   4. Working documents are project local and editable.
   5. "Make editable copy" creates a working document seeded from a source document's Markdown.
   6. Imported source documents remain read only inside projects.

4. Project model
   1. A project stores:
      1. Name
      2. Optional objective
      3. Membership links to source documents
      4. Project local working documents
   2. Removing a source document from a project only removes membership. It does not delete the source document from the pool.

5. Conversion module
   1. Create a swappable conversion adapter interface.
   2. The initial adapter targets `markdown.new/file-to-markdown`.
   3. The agent must verify that the target service is reachable in the build environment before relying on it.
   4. Store original file and converted Markdown separately.
   5. Store conversion attempt metadata so re conversion can be added later without schema redesign.
   6. HITL correction UI is out of scope, but data structures should not block it later.

6. Markdown rendering and editing
   1. Imported source documents render as read only Markdown in project context.
   2. Working documents render in an editable Markdown editor.
   3. Section boundaries for lenses are derived from Markdown headings. If headings are absent, chunk by paragraph groups.
   4. The prototype does not need rich layout preservation beyond Markdown.

7. Annotation and comment model
   1. Choose an opinionated prototype model rather than leaving this open.
   2. Annotation means a text anchored highlight on a document range with an optional short note.
   3. Comment means a threaded note stream attached either to:
      1. An annotation
      2. The document as a whole
   4. Annotations highlight text in the document and appear in the sidebar list.
   5. Comments live in sidebar threads.
   6. For working documents, text anchors should use a resilient text quote anchoring strategy with fallback rebinding after edits.
   7. If an anchor cannot be rebound after edits, mark the annotation as stale rather than silently deleting it.
   8. Annotations and comments are project scoped.
   9. Carry over of annotations and comments between projects is out of scope.

8. Persona model
   1. Ship with a preset persona library.
   2. Allow user created custom personas with name and prompt style description.
   3. Allow at most three active personas at one time.
   4. Persist personas locally and in SQLite.

9. AI provider
   1. Use OpenRouter.
   2. The OpenRouter API key must be read from environment variables provided to the cloud task. Do not hardcode it, commit it, or print it into logs or artifacts.
   3. Model choice should be configurable by environment variable or app config.
   4. The agent should verify available model ids in the environment before fixing a default.
   5. All AI prompts should be built from scoped document context, project objective when present, and selected personas when applicable.

10. Lens module
   1. Lenses are generated per document and per persona.
   2. A lens result contains:
      1. Document overview
      2. Section by section representations
   3. Lens output is stored and cached for offline reading.
   4. Lens generation is independent of provocation generation.
   5. Lens generation must never modify the document.

11. Provocation module
   1. Provocations are generated per document and per persona.
   2. A provocation result is a list of critique cards such as fallacies, counterarguments, alternatives, missing evidence, and possible opportunities.
   3. Each provocation card should include enough source grounding to let the user inspect the claim against the document, ideally via linked section or quote.
   4. Provocations are stored and cached for offline reading.
   5. Provocation generation must never modify the document.

12. Chat module
   1. Support exactly three scopes in V3:
      1. Selected text
      2. Current document
      3. Full project
   2. Scope is auto selected from the invocation point, but user changeable before send.
   3. Selected text chats are anchored to the selection and stored under the document.
   4. Document scoped chats are attached to the document and travel with it if project membership changes.
   5. Project scoped chats are attached to the project.
   6. Project scoped chats store a project fingerprint captured at generation time.
   7. If the project fingerprint no longer matches current project state, show a warning icon and explanatory tooltip.
   8. Chat history must be filterable by scope.
   9. Chat must never have an "apply edit", "replace selection", or equivalent action in V3.

13. Project fingerprint module
   1. Create a small deep module that computes a stable fingerprint from project objective plus current document membership plus working document ids and updated timestamps.
   2. Use this only for stale warning behavior on project scoped chats in V3.
   3. The warning is informational, not blocking.

14. Offline behavior
   1. Make the app installable as a PWA.
   2. Cache documents, project metadata, annotations, comments, chats, lenses, and provocations for offline reading.
   3. Allow offline editing of working documents and offline creation or editing of annotations and comments.
   4. Queue offline writes and sync them on reconnect.
   5. Block new AI requests while offline and show explicit UI state.
   6. Since the app is single user, conflict handling may use simple last write wins for V3.

15. Export
   1. Support Markdown export for working documents in V3.
   2. No PDF or Word export.

16. Data model
   1. The schema should include at minimum:
      1. Source documents
      2. Working documents
      3. Projects
      4. Project document membership
      5. Personas
      6. Annotations
      7. Comment threads
      8. Comments
      9. Lens generations
      10. Provocation generations
      11. Chat threads
      12. Chat messages
      13. Project fingerprints or stored snapshots for warning checks
      14. Sync or cache metadata needed for offline behavior
   2. Keep original file storage references separate from converted Markdown content.
   3. Store enough metadata on AI generations to reproduce scope, persona set, prompt version, and grounding references later.

17. Deep modules to isolate
   1. Conversion adapter
   2. Markdown sectioning
   3. Text quote anchor and rebind logic
   4. Persona selection rules
   5. AI scope builder
   6. Project fingerprint calculator
   7. Offline mutation queue and replay
   8. AI response persistence and retrieval

18. Assumptions chosen for fuzzy areas
   1. Comments and annotations are sidebar first, not inline rich discussion bubbles.
   2. Chat is separate from comments in V3.
   3. An annotation is not the same thing as a comment. Annotation anchors text. Comment is the conversation attached to an annotation or document.
   4. This is a deliberate prototype choice meant to be evaluated by use.

## Testing Decisions

1. Definition of good test
   1. Test external behavior and stable contracts.
   2. Prefer user visible outcomes over implementation details.
   3. Use small unit tests for deep logic modules.
   4. Use integration tests for workflows that cross storage, AI orchestration, and UI state.
   5. Use end to end tests for core journeys only.
   6. Avoid brittle tests that only snapshot markup without validating behavior.

2. Required test layers
   1. Unit tests
      1. Markdown section derivation
      2. Text anchor creation and rebind behavior
      3. Persona activation limit of three
      4. AI scope builder for selected text, document, and project
      5. Project fingerprint calculation and stale warning decision
      6. Offline queue enqueue and replay behavior
   2. Integration tests
      1. Upload file, convert, store original and Markdown, show status
      2. Create project from pool docs and optional objective
      3. Create blank working doc and editable copy from import
      4. Add annotation and comment, then reopen and verify persistence
      5. Generate lens and provocation, persist results, and reopen offline
      6. Start chat from selection, document, and project scopes
      7. Remove document from project and verify document scoped chats still appear with the document
      8. Change project and verify old project scoped chat shows warning
      9. Export working doc as Markdown
   3. End to end tests
      1. First run to uploaded document to project to lens generation
      2. Reading flow with annotation and comment creation
      3. Writing flow with blank working doc, comments, and export
      4. Offline flow for reading cached AI outputs and editing working docs
      5. Reconnect flow that syncs queued edits and notes

3. Live dependency testing
   1. Most AI tests should use deterministic fakes or recorded fixtures.
   2. At least one smoke test should exercise the OpenRouter integration in the cloud environment using the provided environment variable key.
   3. Conversion adapter tests should primarily use mocks or contract tests. If the external conversion service is reachable, add one smoke path. If not reachable, fail gracefully and document the limitation.

4. UI testing tools
   1. The coding agent must run:
      ```bash
      uvx rodney --help
      ```
   2. The agent must use Rodney to inspect and validate the UI as work progresses.
   3. The coding agent must run:
      ```bash
      uvx showboat --help
      ```
   4. The agent must use Showboat to create a `demo.md` artifact describing the implemented feature set and demonstrated flows.

5. TDD process requirement
   1. The coding agent should implement using red green TDD.
   2. For each deep module and major workflow, write a failing test first, make it pass, then refactor.
   3. The task is not complete until the full test suite relevant to the feature passes in the cloud environment.

6. Prior art
   1. If the repo already contains test patterns, the agent should follow existing conventions first.
   2. If no prior art exists, establish a minimal standard stack for:
      1. Unit and integration tests
      2. Browser end to end tests
      3. PWA offline scenario tests
   3. Use the same testing style for new modules to keep the prototype coherent.

## Out of Scope

1. Accounts, auth, and multi user support.
2. Human human collaboration.
3. Mobile specific UI.
4. Desktop wrapper.
5. HITL conversion verification and correction UI.
6. Re conversion workflows exposed in UI.
7. Annotation or comment carry over between projects.
8. Document duplication or moving between projects beyond "make editable copy".
9. Canonical rich document format design beyond Markdown plus metadata.
10. Rich layout preservation, tables, formulas, or complex document fidelity.
11. Word export.
12. PDF export.
13. AI model selection UI.
14. AI reasoning effort toggles.
15. Inline AI auto completion or auto editing.
16. Apply to document, replace selection, rewrite in place, or any other direct AI text mutation.
17. Advanced conflict resolution beyond simple single user sync.
18. Search, ranking, or semantic retrieval beyond direct scope building.
19. Billing, quotas, usage metering, or production hardening.
20. Any feature that turns the primary UX into a chat first interface.

## Further Notes

1. This PRD is intended to be sufficient for a coding agent to execute without additional product context.
2. The agent should align naming and implementation details to the existing repo once it inspects the codebase.
3. Required setup validation commands:
   ```bash
   npx shadcn@latest add sidebar-07
   ```
   ```bash
   uvx rodney --help
   ```
   ```bash
   uvx showboat --help
   ```
4. The agent should verify external dependencies are actually reachable in the cloud environment before binding the implementation to them.
5. The OpenRouter API key provided in task input should be injected as an environment variable and redacted from logs, commits, screenshots, and `demo.md`.
6. The most important acceptance question is not polish. It is whether the combined model of:
   1. document first workspace,
   2. sidebar annotations and comments,
   3. section lenses,
   4. critique provocations,
   5. scoped chat,
   feels coherent and useful enough to evaluate with real use.
7. Non negotiable product rule: AI never auto edits the document.

If you want, I can do one more pass and convert this into a tighter "agent task issue" format with explicit acceptance criteria and checklists.
