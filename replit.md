# Desde el Pogo - Automated Short-Form Video System

## Overview

This is a fully automated system for generating, editing, validating, and publishing short-form vertical videos (YouTube Shorts / Instagram Reels / TikTok) focused on concert culture under the brand "Desde el Pogo." The system uses an agent-based architecture where multiple AI agents handle different stages of the video creation pipeline: text generation, visual curation (stock video sourcing), video editing (FFmpeg overlay), compliance checking, and publishing.

The application has a dashboard UI for monitoring the pipeline, viewing generated videos, and reading system logs. It is not meant to require daily human intervention — the pipeline runs autonomously.

**Critical legal constraint:** Content must never reference specific artists, bands, genres, songs, or use copyrighted material. The system focuses exclusively on the collective live concert experience (crowds, energy, rituals).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight client-side router)
- **State Management:** TanStack React Query for server state with auto-refetch intervals for live monitoring
- **UI Components:** shadcn/ui (new-york style) built on Radix UI primitives
- **Styling:** Tailwind CSS with CSS variables for theming, dark mode by default
- **Animations:** Framer Motion
- **Charts:** Recharts (for dashboard analytics)
- **Build Tool:** Vite with HMR in development
- **Path aliases:** `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Framework:** Express.js on Node.js with TypeScript
- **Runtime:** tsx for development, esbuild for production builds
- **API Pattern:** REST API under `/api/` prefix. Route definitions are shared between client and server via `shared/routes.ts` using Zod schemas for validation
- **Authentication:** Replit Auth via OpenID Connect (passport + express-session with PostgreSQL session store)
- **Video Pipeline (Agent Architecture):**
  - **Text Agent:** Uses OpenAI API (via Replit AI Integrations) to generate concert-culture text prompts
  - **Visual Curation Agent:** Fetches stock video from Pexels API based on generated text
  - **Editing Agent:** Uses FFmpeg to create text overlays on stock video
  - **Compliance Agent:** Validates content against copyright rules
  - **Publishing Agent:** Handles distribution to platforms

### Shared Code (`shared/`)
- `schema.ts` — Drizzle ORM table definitions (videos, logs) plus re-exports of auth and chat models
- `routes.ts` — API route definitions with Zod schemas, shared between frontend and backend
- `models/auth.ts` — Users and sessions tables (required for Replit Auth)
- `models/chat.ts` — Conversations and messages tables (for AI chat integration)

### Database
- **Database:** PostgreSQL (required, connected via `DATABASE_URL` environment variable)
- **ORM:** Drizzle ORM with PostgreSQL dialect
- **Schema Push:** `npm run db:push` uses drizzle-kit to push schema changes
- **Migrations:** Output to `./migrations` directory
- **Session Storage:** PostgreSQL via `connect-pg-simple`
- **Key Tables:**
  - `users` — Replit Auth user profiles
  - `sessions` — Express session storage
  - `videos` — Generated video records with status tracking (pending → generating_text → curating_visuals → editing → compliance_check → publishing → published/failed)
  - `logs` — Agent activity logs with level, message, agent source, and metadata
  - `conversations` / `messages` — AI chat integration tables

### Build & Development
- **Dev:** `npm run dev` — runs Express server with Vite middleware for HMR
- **Build:** `npm run build` — Vite builds the client to `dist/public`, esbuild bundles the server to `dist/index.cjs`
- **Production:** `npm start` — serves the built app from `dist/`
- **Type Check:** `npm run check`

### Key Pages
- **Landing** (`/`) — Public landing page, redirects to dashboard if authenticated
- **Dashboard** (`/dashboard`) — Overview stats, recent videos, recent logs, daily generation trigger
- **Videos** (`/videos`) — Video library with status tracking and manual generation trigger
- **Logs** (`/logs`) — Live system log viewer with filtering by agent and level

## External Dependencies

- **PostgreSQL** — Primary database (provisioned via Replit, `DATABASE_URL` env var required)
- **OpenAI API** (via Replit AI Integrations) — Text generation (GPT), image generation (gpt-image-1), speech-to-text, text-to-speech. Configured via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables
- **Pexels API** — Stock video sourcing for the visual curation agent (requires `PEXELS_API_KEY`)
- **FFmpeg** — System-level dependency for video processing (text overlay on stock footage)
- **Replit Auth** — OpenID Connect authentication (requires `REPL_ID`, `ISSUER_URL`, `SESSION_SECRET` environment variables)
- **Required Environment Variables:**
  - `DATABASE_URL` — PostgreSQL connection string
  - `SESSION_SECRET` — Express session secret
  - `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI API key
  - `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI base URL
  - `PEXELS_API_KEY` — Pexels stock video API key