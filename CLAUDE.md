# ft-images-fedex — Session Context

## What This Is

React + Vite prototype of a family photo tree (FedEx Day project). Dev server: `npm run dev` → `http://localhost:5173`. This is a one-day demo project — production target is Next.js + FileMaker + Cloudflare R2 (do not build toward that here).

## Status

Prototype complete and in active polish. 20 tests passing. 19 commits on `main`, all pushed to GitHub.

## What's Built

- **Tree view** (`/`): bi-directional React Flow tree, dagre LR layout, default pivot `kathryn-walker`. Right-click any node to re-pivot with a two-phase animated transition. Depth: 3 ancestor generations, 1 descendant generation. White smoothstep edges for parent/child, dashed golden for spouse.
- **Person page** (`/person/:id`): bio (birth date, location, notes), 4-column photo grid, primary photo star, photo lightbox (Escape to close), edit modal.
- **Edit modal**: form for birthDate, birthLocation, notes — saves to localStorage (`ft-overrides`). Export JSON button downloads merged `family.json`.
- **Placeholder photos**: `public/photos/[person-id]/placeholder.svg` — drop real photos in without code changes.

## Tech Stack

React 18 + Vite, `@xyflow/react` (React Flow v12), `@dagrejs/dagre`, `react-router-dom` v6, Vitest + React Testing Library + jsdom. No backend. Data in `src/data/family.json`. Edits in localStorage.

## Key Files

```
src/
  components/
    TreeView.jsx       — React Flow canvas, pivot state, two-phase transition, export
    PersonNode.jsx     — custom node (4 handles: parent L/R, spouse B/T)
    PersonPage.jsx     — bio + photo grid
    PhotoLightbox.jsx  — full-screen overlay, Escape key
    EditModal.jsx      — form fields, localStorage save
  data/family.json     — Walker family source of truth (7 people, 7 relationships)
  hooks/useFamilyData.js   — loads JSON, merges localStorage overrides
  utils/treeLayout.js      — filterByDepth (asymmetric BFS) + buildReactFlowGraph (dagre)
  utils/exportJson.js      — Blob download trigger
  __tests__/               — 3 test files, 20 tests
  App.jsx / index.css
public/photos/[person-id]/placeholder.svg   — 7 person folders
```

## Data Model

```json
{
  "family_id": "walker-family",
  "people": [{ "id": "kathryn-walker", "name": "Kathryn Walker", "gender": "female",
    "birthDate": "5 Nov 1969", "birthLocation": "Los Angeles, California",
    "deathDate": null, "notes": "", "photos": ["placeholder.svg"] }],
  "relationships": [
    { "personAId": "harold-walker", "personBId": "kathryn-walker", "type": "parent" },
    { "personAId": "harold-walker", "personBId": "kathryn-moore", "type": "spouse" }
  ]
}
```

`type: "parent"` — personAId is the parent, personBId is the child. `type: "spouse"` — bidirectional. `gender` — `"male"` or `"female"`, required for layout ordering.

## Walker Family (7 people)

`kathryn-walker` (female, 1969–, default pivot), `harold-walker` (male, 1940–), `kathryn-moore` (female, 1940–), `herman-walker` (male, 1914–1957), `retha-hammack` (female, 1917–2001), `eugene-moore` (male, 1912–1999), `mary-hennessy` (female, 1917–1986).

## Layout Rules (enforce in all future work)

- **Males always above females**: within each horizontal rank, male nodes must have a lower y-coordinate than female nodes. Implemented via `enforceGenderOrdering` in `treeLayout.js`, which runs after dagre layout, groups nodes by family cluster (shared-child anchor y), and sorts males first within each cluster. Never allow a female node to appear vertically above a male node.
- **Depth**: `filterByDepth(people, rels, pivotId, maxAncestorDepth=3, maxDescendantDepth=1)`. Separate ancestor/descendant counters. Downward traversal blocked from ancestor nodes to prevent aunts/uncles appearing.
- **Pivot transition**: two phases. Phase 1 — slide viewport to clicked node's current canvas position (420ms). At T=440ms — instant reposition to pre-computed new layout center, then trigger rebuild. `buildReactFlowGraph` returns `{ nodes, edges, pivotCenter }`.

## Design Decisions

- Teal theme (#4a8fa8) — prototype only, not decided for production
- Dagre import: `import { graphlib, layout } from '@dagrejs/dagre'`
- Spouse edges: `type: straight`, `strokeDasharray: '5,4'`, golden, Bottom/Top handles
- Parent edges: `type: smoothstep`, white, Right/Left handles
- `useReactFlow()` hooks must live in a child component inside `<ReactFlow>` — see `PivotFitter` in TreeView

## Copy/Tone Rules

Frame every action as preservation. Celebrate identity, not completion. Banned in UI: "bucket", "cluster", "entity". Export: "Preserve changes → Export JSON". Edit: "✏ Preserve their story". Photo grid: "Their photographs". Notes field: "Their story".

## Out of Scope (do not implement)

Face recognition, GEDCOM import, backend/auth, photo upload via UI, death date display in UI, mobile/<1024px.

## Open Questions

- **Visual direction**: prototype is teal. Partner PRD wants warm cream/terracotta/Georgia serif. Not decided. Do not restyle without explicit confirmation.
- **Default pivot**: hardcoded to `kathryn-walker`. PRD left open whether default should be self or oldest ancestor.

## Production Roadmap (do not build here — needs new spec)

Next.js on Vercel, FileMaker via serverless API, Cloudflare R2 for photos, email/password auth, photo upload UI, person editor with soft delete, GEDCOM import (Phase 2), global search, operator portal, identification flow, gamification, lightbox arrow-key nav + metadata, performance targets (<3s load, <1.5s gallery, 300-node tree).

## Docs

- Partner PRD notes: `docs/design_notes/partner_notes.md`
- Notion log: https://www.notion.so/3641e2e6bc7180c38f8ac342aed8973f
