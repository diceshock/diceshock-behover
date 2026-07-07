## 2026-03-30 Initial Setup
- Tailwind 4.2 + DaisyUI 5.5 + Phosphor Icons
- TanStack Router file-based routing
- Drizzle ORM + D1 (SQLite)
- tRPC: baseTRPC.ts has publicProcedure, protectedProcedure, dashProcedure
- DO pattern: class extends DurableObject<Cloudflare.Env>, WebSocketPair, ctx.acceptWebSocket
- Server util pattern: notifyXxxDO(env, code, ...) calls DO via fetch
- Client hook pattern: useSeatTimer opens WebSocket, handles reconnect, returns {state, connected, requestSync}
- Occupancy statuses: "active", "paused", "ended"
