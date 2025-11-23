# Copilot Instructions for Rental Ops Starter

Welcome to the Rental Ops Starter codebase! This document provides essential guidance for AI coding agents to be productive in this project. Follow these instructions to understand the architecture, workflows, and conventions.

## Big Picture Architecture

This project is an AI-assisted rental operations app built with a portable architecture. Key components include:

- **Apps**: Contains the `web` (Next.js) and `worker` (Node.js) applications.
  - `web`: Frontend built with Next.js and Tailwind CSS.
  - `worker`: Backend worker for handling asynchronous jobs.
- **Database**: Managed with Prisma and Supabase. Migrations are stored in `prisma/migrations/`.
- **Packages**: Modularized adapters for AI (OpenAI), email (Gmail), storage (Supabase), and WhatsApp integrations.
- **Docs**: Documentation for architecture, Gmail OAuth setup, and other workflows.
- **Scripts**: Utility scripts like `seed.ts` for seeding the database.

### Data Flow
1. **Frontend**: User interactions trigger API calls.
2. **Backend**: APIs process requests, interact with the database, and enqueue jobs for the worker.
3. **Worker**: Processes jobs (e.g., Gmail polling) and updates the database.

### Key Decisions
- **Ports and Adapters**: Ensures modularity and testability.
- **Supabase**: Chosen for its simplicity and real-time capabilities.
- **Next.js Middleware**: Used for authentication and rate-limiting.

## Developer Workflows

### Building and Running
- **Web App**: `cd apps/web && npm run dev`
- **Worker**: `cd apps/worker && npm start`

### Testing
- Run tests with `npm test`.
- Example test file: `tests/api.v1.spec.ts`.

### Database Migrations
- Create a migration: `npx prisma migrate dev`.
- Apply migrations: `npx prisma migrate deploy`.

### Seeding the Database
- Run the seed script: `npx ts-node scripts/seed.ts`.

## Project-Specific Conventions

### File Organization
- **API Routes**: Located in `apps/web/src/api/`.
- **Components**: Shared components in `apps/web/src/components/`.
- **Adapters**: Modularized in `packages/adapters/`.

### Patterns
- **Error Handling**: Centralized in `src/api/errors.ts`.
- **Authentication**: Middleware in `src/api/middleware/auth.ts`.
- **Job Processing**: Worker jobs in `apps/worker/src/jobs/`.

### Naming Conventions
- Use `camelCase` for variables and functions.
- Use `PascalCase` for components and classes.

## Integration Points

### External Dependencies
- **OpenAI**: AI capabilities via `packages/adapters/ai/openai-adapter.ts`.
- **Gmail**: Email integration via `packages/adapters/email/gmail-adapter.ts`.
- **Supabase**: Storage and database.
- **WhatsApp**: Receive-only integration via `packages/adapters/wa/cloud-adapter.ts`.

### Cross-Component Communication
- **API to Worker**: Jobs are enqueued in the database and processed by the worker.
- **Frontend to Backend**: API calls from `apps/web` to `src/api/`.

## Examples

### Adding a New API Route
1. Create a new file in `apps/web/src/api/`.
2. Follow the pattern in `apps/web/src/api/tickets/`.

### Adding a New Worker Job
1. Create a new file in `apps/worker/src/jobs/`.
2. Follow the pattern in `apps/worker/src/jobs/gmail-poll.ts`.

---

For more details, refer to the `README.md` and documentation in the `docs/` folder.