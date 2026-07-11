# SAP L1.5 Diagnostic Console

Consultant-facing frontend for the `sap_l15_hub` neuro-san agent network. Paste
a ticket (or pick an example), watch the agent-to-agent handoff chain animate
in real time, and see a formatted diagnostic result card instead of a raw
server log.

## Run

1. Start the neuro-san server from the repo root:
   ```
   python -m neuro_san_studio run --server-only
   ```
2. In this directory:
   ```
   npm install
   npm run dev
   ```
3. Open `http://localhost:5173`.

Vite's dev server proxies `/api` to `http://localhost:8080` (see
`vite.config.ts`), so no CORS configuration is needed for local development.

For a non-proxied deployment (frontend and server on different origins), set
`AGENT_ALLOW_CORS_HEADERS=1` in the neuro-san server's environment and point
`neuroSanClient`'s base URL at the server's real origin.

## Scope

Single-ticket, single-turn diagnosis only -- no multi-turn conversation or
`chat_context` carry-forward. Purely additive and read-only against the
`sap_l15_hub` / `sap_l15_hub/fts/fts_agents` backend networks.
