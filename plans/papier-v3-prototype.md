# Plan: Papier V3 Prototype

> Source PRD: `docs/papier-v3-prototype-prd.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Product shape**: single-user web PWA, no auth, no accounts, no sharing.
- **Routes**: one persistent document-first workspace shell with URL-addressable pool, project, and active-document context.
- **Layout**: left sidebar for pool/projects/documents, center pane for the active document, right sidebar for AI and notes with independently managed panels.
- **Storage**: SQLite is the system of record; a client-side offline store caches reads and queues writes for replay.
- **Schema**: separate source documents from working documents; keep original file storage references separate from converted Markdown content.
- **Key models**: `SourceDocument`, `WorkingDocument`, `Project`, `ProjectDocumentMembership`, `Persona`, `Annotation`, `CommentThread`, `Comment`, `LensGeneration`, `ProvocationGeneration`, `ChatThread`, `ChatMessage`, `ProjectFingerprint`.
- **Document rules**: imported source documents remain reusable and read-only in project context; working documents are project-local and editable.
- **AI boundary**: use OpenRouter behind scoped prompt building; AI output is always stored beside the document, never merged into the document body.
- **Offline rule**: previously generated AI output must remain readable offline; offline editing, annotations, and comments continue to work; new AI generation is blocked while offline.
- **Export**: Markdown only for V3.

---

## Phase 1: Workspace shell and local persistence

**User stories**: 1, 2, 14, 15, 46, 47

### What to build

Establish the document-first workspace: the app opens without sign-in, renders the three-pane shell, keeps the center pane focused on the active document area, and preserves navigation and right-sidebar panel state across reloads so the workspace already feels like a durable tool.

### Acceptance criteria

- [ ] The app opens directly into a single-user workspace with no auth flow.
- [ ] The left sidebar, center pane, and right sidebar are all present and usable.
- [ ] The three right-sidebar panels can be opened, closed, and collapsed independently.
- [ ] Sidebar and panel state restore when the app is reopened.

---

## Phase 2: Document pool upload, conversion, and inspection

**User stories**: 3, 4, 5, 6, 7, 44

### What to build

Add the document pool as the user's reusable source library. A user uploads Markdown, PDF, or Word files; each upload stores the original file, attempts conversion through the swappable adapter, exposes conversion status, and allows side-by-side inspection of the original and converted Markdown.

### Acceptance criteria

- [ ] A user can upload supported source files into the document pool.
- [ ] Each upload stores both the original file reference and converted Markdown separately.
- [ ] Each document visibly reports conversion status as ready, processing, or failed.
- [ ] The pool provides a side-by-side original-versus-Markdown inspection view.
- [ ] Conversion failures are visible and recoverable rather than silent.

---

## Phase 3: Projects with source-document membership

**User stories**: 8, 9, 10, 11, 14, 45

### What to build

Introduce projects as task-focused containers over pool documents. A user can create a project from selected source documents, optionally set a project objective, adjust document membership later, and open imported documents inside the workspace as read-only project resources without affecting pool ownership.

### Acceptance criteria

- [ ] A user can create a project from one or more pool documents.
- [ ] A project can store an optional objective.
- [ ] Pool documents can be added to or removed from a project after creation.
- [ ] Imported source documents render as read-only inside a project.
- [ ] Removing a source document from a project does not remove it from the pool.

---

## Phase 4: Working documents and Markdown export

**User stories**: 12, 13, 14, 43, 46

### What to build

Add writable project-local documents so the workspace supports authoring as well as reading. A user can create a blank working document, make an editable copy from an imported source document, edit it in the center pane, reopen it later, and export the working document as Markdown.

### Acceptance criteria

- [ ] A user can create a blank working document inside a project.
- [ ] A user can create an editable copy seeded from a source document's Markdown.
- [ ] Working documents are editable in the center pane and persist across reopen.
- [ ] Imported source documents stay read-only while working documents remain editable.
- [ ] A working document can be exported as Markdown.

---

## Phase 5: Project-scoped annotations and comments

**User stories**: 16, 17, 18, 19, 20, 47

### What to build

Implement the opinionated sidebar-first notes model. A user can create text-anchored annotations from a selection, see highlighted passages in the document, add threaded comments to an annotation, create document-level comment threads, and keep all notes scoped to the current project so the same source document can support different reading goals.

### Acceptance criteria

- [ ] Selecting text in a document can create an annotation with a visible highlight.
- [ ] Each annotation appears in the sidebar and navigates back to its anchored passage.
- [ ] A user can add comments to an annotation thread.
- [ ] A user can create a document-level comment without selecting text.
- [ ] Annotations and comments remain scoped to the current project context.

---

## Phase 6: Personas and lens generation

**User stories**: 21, 22, 23, 24, 25, 37, 38

### What to build

Introduce evaluative personas and the first AI reading aid. The user can choose from preset personas, create custom personas, activate up to three at once, and generate section-linked lenses for the current document so persona-shaped interpretations remain grounded in document structure and visibly separate from the document body.

### Acceptance criteria

- [ ] Preset personas are available and custom personas can be created.
- [ ] No more than three personas can be active at one time.
- [ ] Lens generation runs for the current document using the active persona set.
- [ ] Lens output is attached to document sections derived from headings or fallback chunks.
- [ ] Lens results are stored separately from the document body and never edit it.

---

## Phase 7: Independent provocation generation

**User stories**: 26, 27, 28, 37, 38, 44

### What to build

Add provocations as a separate critique surface rather than an extension of lenses. The user can generate critique cards for the current document and persona set, inspect grounded claims against the source, and encounter explicit "not applicable" outcomes and recoverable failures without any AI action mutating the document.

### Acceptance criteria

- [ ] Provocations can be generated independently of lenses.
- [ ] Provocation results include critique cards grounded back to the source material.
- [ ] The system can return and display inapplicable provocations rather than forcing certainty.
- [ ] Provocation failures are visible and debuggable.
- [ ] Provocation output remains separate from document content.

---

## Phase 8: Scoped chat with persistence and staleness warnings

**User stories**: 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 44

### What to build

Add chat as a scoped document companion rather than the main interface. A user can launch chat from selected text, the current document, or the full project; accept or change the auto-selected scope before sending; review chat history filtered by scope; retain document-scoped chats with their source document; and see stale warnings on project-scoped chats after the project changes.

### Acceptance criteria

- [ ] Chat supports exactly three scopes: selected text, current document, and full project.
- [ ] Scope auto-selects from the invocation point and can be changed before send.
- [ ] Chat history can be filtered by scope.
- [ ] Document-scoped chats remain attached to the document if project membership changes.
- [ ] Project-scoped chats show an informational stale warning when the project fingerprint changes.
- [ ] Chat offers no apply-edit or document mutation action.

---

## Phase 9: Offline reading, queued writes, and reconnect sync

**User stories**: 39, 40, 41, 42, 46, 47

### What to build

Complete the prototype as a usable PWA. Cached documents, project state, notes, chats, lenses, and provocations remain readable offline; working-document edits and note changes can be made offline and queued; fresh AI generation is blocked with clear UI feedback while offline; and queued writes replay on reconnect so the cloud copy catches up.

### Acceptance criteria

- [ ] The app is installable as a PWA and supports offline reopening.
- [ ] Previously generated documents, notes, chats, lenses, and provocations remain readable offline.
- [ ] Offline edits to working documents, annotations, and comments are queued locally.
- [ ] New AI generation is blocked while offline with an explicit explanation.
- [ ] Queued offline edits and notes sync on reconnect using simple single-user conflict handling.
