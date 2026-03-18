# AGENTS.md

## Cursor Cloud specific instructions

This is a **Next.js 16** starter template (App Router + Turbopack) using **shadcn/ui**, **Tailwind CSS 4**, **React 19**, and **TypeScript**.

### Package manager

The project uses **Bun** (`bun.lock`). Use `bun install` for dependencies and `bun run <script>` for npm scripts.

### Available scripts (defined in `package.json`)

| Command | Description |
|---|---|
| `bun run dev` | Start dev server (Turbopack, port 3000) |
| `bun run build` | Production build |
| `bun run lint` | ESLint (one known warning: unused `Geist` import in `app/layout.tsx`) |
| `bun run typecheck` | TypeScript type-checking (`tsc --noEmit`) |
| `bun run format` | Prettier formatting for `.ts`/`.tsx` files |

### Architecture notes

- Single-process frontend app — no backend, database, or external services required.
- The app uses `next-themes` for dark/light mode toggling (press `d` on the landing page).
- shadcn/ui components live in `components/ui/`; add new ones with `npx shadcn@latest add <name>`.
