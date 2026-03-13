# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Next.js dev server with Turbopack
npm run build      # Build for production
npm run start      # Run production server
npm run lint       # Run ESLint
npm test           # Run Vitest unit tests
npm run setup      # Install deps + generate Prisma client + run migrations
npm run db:reset   # Reset the Prisma database
```

## Environment

Requires an `.env` file with `ANTHROPIC_API_KEY`. If missing, the app falls back to static/mock code generation.

## Architecture

UIGen is an AI-powered React component generator with live preview. Users describe components in a chat interface; Claude generates/modifies code; a live iframe renders the result.

### Key Data Flow

1. User sends chat message → `POST /api/chat` with messages + serialized virtual file system
2. API uses Vercel AI SDK `streamText` with Claude (claude-haiku-4-5) + tools
3. Claude calls tools (`str_replace_editor`, `file_manager`) to manipulate files
4. Tool callbacks update the **VirtualFileSystem** (in-memory, never on disk)
5. `PreviewFrame` re-renders by transpiling JSX with Babel and loading deps from `esm.sh` CDN
6. On completion, serialized file system + messages are saved to SQLite via Prisma

### Three-Panel Layout (`src/app/main-content.tsx`)

- **Left**: Chat interface (via `ChatContext` + Vercel AI SDK `useChat`)
- **Right top/bottom tabs**: Live preview (`PreviewFrame` in iframe) or code view (file tree + Monaco editor)

### Core Abstractions

| File | Purpose |
|---|---|
| `src/lib/file-system.ts` | `VirtualFileSystem` — in-memory tree, serialize/deserialize to JSON for DB storage |
| `src/lib/provider.ts` | Language model abstraction wrapping Claude and a mock provider |
| `src/lib/transform/` | JSX→JS transpilation with Babel for the preview iframe |
| `src/lib/tools/` | AI tool definitions: `str_replace_editor` (edit files), `file_manager` (create/delete) |
| `src/lib/prompts/` | System prompt for component generation |
| `src/lib/contexts/` | React contexts: `ChatContext` (AI chat state), `FileSystemContext` (virtual FS) |
| `src/lib/auth.ts` | JWT sessions, 7-day expiry, HTTP-only cookies |
| `src/actions/` | Server actions: auth (signUp/signIn), project CRUD |
| `src/app/api/chat/route.ts` | Streaming chat endpoint; saves project on finish |

### Database (SQLite + Prisma)

Schema at `prisma/schema.prisma`. Two models:
- **User**: id, email, hashed password
- **Project**: id, name, userId FK, `messages` (JSON string), `data` (JSON string for VirtualFileSystem)

Anonymous users get a local-only session; projects are only persisted for authenticated users.

### Auth

Middleware at `src/middleware.ts` guards `/[projectId]/*` routes. The home page (`src/app/page.tsx`) redirects authenticated users to their most recent project, or renders `MainContent` for anonymous users.

### Path Alias

`@/*` maps to `src/*` (configured in `tsconfig.json`).

## Code Style

Use comments sparingly. Only comment complex code.
