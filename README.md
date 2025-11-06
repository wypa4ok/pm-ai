# Rental Ops Starter

This repo contains a portable task plan and scaffolding to build your AI-assisted rental operations app.

- `codex_tasks.json`: end-to-end tasks for VS Code/OpenAI Codex plugin
- Portable architecture (ports/adapters), Supabase, Gmail, WhatsApp (receive-only), OpenAI

## Quick start
1. Open `codex_tasks.json` and start with `T0_project_scaffold`.
2. Keep env secrets in `.env.local` (see `.env.local.example`).
3. When you're ready to wire Gmail, follow [`docs/gmail-oauth.md`](docs/gmail-oauth.md) to configure the API client and refresh token.
