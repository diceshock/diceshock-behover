## Notepad: Decisions
<!-- Append-only. Do NOT overwrite. -->

## [2026-06-18] Architecture Decisions
- D1 for 12h conversation history, R2 for archival (on-write trigger)
- Mem0 dynamic memory, max 20 entries/user, graceful degradation
- Intent routing via keyword matching (no LLM), with context continuity
- JSON multi-message output: [{type: "text"/"img"/"totp"}], max 3/response
- Agent is read-only, mutations → link guidance
- MsgId dedup in KV (TTL 30s)
- Non-text messages → polite rejection
- TOTP: async image generation via IMAGE_QUEUE
