# Visual Query Builder

A Next.js App Router project for building complex database/API filters through a recursive visual editor instead of raw query syntax.

## What it does

- Switch between multiple schema-driven data sources.
- Add, remove, and reorder rules and nested groups.
- Validate operators and values against the active schema.
- Preview SQL-like, Mongo-style, and GraphQL-style query output live.
- Simulate query execution against a mock dataset.
- Persist execution history and saved presets locally.
- Import and export query trees as JSON.
- Toggle light and dark mode.

## Architecture

- The core query model lives in [lib/query-builder.ts](lib/query-builder.ts).
- Recursive rendering and app state live in [components/query-builder-app.tsx](components/query-builder-app.tsx).
- The page entrypoint is [app/page.tsx](app/page.tsx), with shared metadata in [app/layout.tsx](app/layout.tsx).

The query tree uses stable IDs and recursive group/rule nodes so the UI can update nested branches immutably without flattening the structure.

## Recursive rendering strategy

Each group renders its own list of child nodes and then delegates back to the same recursive node component for children. That keeps nesting depth unlimited while keeping the renderer small and predictable.

Drag-and-drop reordering is scoped to sibling nodes in the same group, which keeps the interaction stable and avoids expensive cross-tree reconciliation.

## State management

- Query tree mutations use a reducer-based architecture.
- Derived preview text, validation output, and execution results are computed from the current query tree.
- History and presets are persisted locally for quick restoration.

This keeps the important behavior in pure helpers, which makes the engine easy to test and reuse.

## Query engine

The engine is schema aware:

- Fields define their type and valid operators.
- Values are validated before execution.
- Generated SQL, Mongo, and GraphQL previews are sanitized and based on the active schema.
- Mock execution filters a dataset with the same recursive tree used for preview generation.

## Performance choices

- Stable node IDs keep recursive rendering predictable.
- Query generation and validation are pure helpers.
- Derived previews and execution results are memoized from the current tree.
- The UI avoids unnecessary nested state copies by keeping tree mutations local to the affected branch.

## Testing

Vitest covers:

- query generation
- validation behavior
- JSON import sanitization
- recursive UI rendering and execution history updates

Run the suite with:

```bash
npm test
```

## Local development

```bash
npm run dev
```

Other useful checks:

```bash
npm run lint
npm run build
```

## Deployment

The app is ready for Vercel-style deployment from the repository. Connect the repo to Vercel to enable automatic preview deployments for pull requests and a stable production deployment.
