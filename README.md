<div align="center">
  <img src="https://assets.diceshock.com/images/diceshock.favicon.svg" alt="Diceshock Logo" width="120" height="120">
  <h1>Diceshock Behover</h1>
  <p>A full-stack monorepo built on Cloudflare Workers using Hono, React, GraphQL, and Drizzle ORM.</p>
</div>

## Project Structure

```
diceshock-behover/
├── apps/
│   ├── runespark/      # Runespark app (GraphQL + React)
│   └── diceshock/      # Diceshock app
├── libs/
│   ├── db/             # Shared database library (Drizzle ORM)
│   └── utils/          # Utility functions library
├── plugins/            # Vite plugins
└── drizzle/            # Database migrations
```

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Frontend**: React 19 + TanStack Router
- **GraphQL**: Pothos + gqty + GraphQL Workers Subscriptions
- **Database**: Drizzle ORM + D1 (SQLite)
- **Build Tools**: Vite + Nx
- **Code Quality**: Biome
- **Package Manager**: pnpm (workspaces)

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

Run applications using Nx:

```bash
# Run runespark app
pnpm x runespark:dev

# Run diceshock app
pnpm x diceshock:dev
```

### Build

```bash
pnpm x runespark:build
pnpm x diceshock:build
```

### Preview

```bash
pnpm x runespark:preview
pnpm x diceshock:preview
```

### Deploy

```bash
pnpm x runespark:deploy
pnpm x diceshock:deploy
```

## Database

### Generate Migrations

```bash
pnpm drizzle
```

### Apply Migrations

```bash
# Apply subscriptions database migrations
pnpm x runespark:migrations:subscriptions
```

## Type Generation

### Cloudflare Workers Types

Generate types based on Worker configuration:

```bash
pnpm x runespark:cf-typegen
```

Use `CloudflareBindings` type in your code:

```ts
import type { CloudflareBindings } from "./worker-configuration";

const app = new Hono<{ Bindings: CloudflareBindings }>();
```

### GraphQL Types (gqty)

Types are automatically generated in development mode when GraphQL schema changes. You can also run manually:

```bash
pnpm x runespark:exec -- gqty generate
```

## Code Quality

### Lint

```bash
pnpm lint
```

### Format

```bash
pnpm lint --write
```

## Configuration

- **Cloudflare Workers**: `apps/{app}/wrangler.toml`
- **Database**: `drizzle.config.ts`
- **TypeScript**: `tsconfig.base.json` and `apps/{app}/tsconfig.json`
