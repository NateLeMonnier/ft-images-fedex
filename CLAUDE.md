# ft-images-fedex — Session Context

## What This Is

A React + Vite prototype of a family photo tree (FedEx Day project). Fully implemented and running. Dev server: `npm run dev` → `http://localhost:5173`.

## Status: Prototype Complete

All 10 implementation tasks done. 19 tests passing. 12 commits on `main`.

## What's Built

- **Tree view** (`/`): bi-directional React Flow tree, dagre LR layout, default pivot `kathryn-walker`. Right-click any node to re-center. 3-generation depth filter. White smoothstep edges for parent/child, dashed golden edge for spouse.
- **Person page** (`/person/:id`): bio (birth date, location, notes), 4-column photo grid, primary photo star, photo lightbox (Escape to close), edit modal.
- **Edit modal**: controlled form for birthDate, birthLocation, notes — saves to localStorage (`ft-overrides` key).
- **Export JSON** button: merges localStorage overrides into `family.json` and triggers browser download. User commits the file to persist across machines.
- **Placeholder photos**: `public/photos/[person-id]/placeholder.svg` — drop real photos in without code changes.

## Tech Stack

- React 18 + Vite, `@xyflow/react` (React Flow v12), `@dagrejs/dagre`, `react-router-dom` v6
- Vitest + React Testing Library + jsdom
- No backend. Data in `src/data/family.json`. Edits in localStorage.

## Key Files

```
src/
  components/
    TreeView.jsx       — React Flow canvas, pivot state, export button
    PersonNode.jsx     — custom node (4 handles: parent L/R, spouse B/T)
    PersonPage.jsx     — bio + photo grid
    PhotoLightbox.jsx  — full-screen overlay, Escape key
    EditModal.jsx      — form fields, "Preserve this memory" save
  data/family.json     — Walker family source of truth (7 people, 7 relationships)
  hooks/useFamilyData.js   — loads JSON, merges localStorage overrides
  utils/treeLayout.js      — filterByDepth (BFS) + buildReactFlowGraph (dagre)
  utils/exportJson.js      — Blob download trigger
  __tests__/           — 3 test files, 19 tests
  App.jsx              — BrowserRouter, two routes
  index.css            — PersonNode CSS + React Flow overrides
public/photos/[person-id]/placeholder.svg   — 7 person folders
```

## Data Model

```json
{
  "family_id": "walker-family",
  "people": [{ "id": "kathryn-walker", "name": "Kathryn Walker", "birthDate": "5 Nov 1969",
    "birthLocation": "Los Angeles, California", "deathDate": null, "notes": "", "photos": ["placeholder.svg"] }],
  "relationships": [
    { "personAId": "harold-walker", "personBId": "kathryn-walker", "type": "parent" },
    { "personAId": "harold-walker", "personBId": "kathryn-moore", "type": "spouse" }
  ]
}
```

`type: "parent"` — personAId is the parent, personBId is the child.
`type: "spouse"` — bidirectional.

## Walker Family (7 people)

| ID | Name | Years |
|---|---|---|
| `kathryn-walker` | Kathryn Walker | 1969– (pivot) |
| `harold-walker` | Harold F Walker | 1940– |
| `kathryn-moore` | Kathryn Moore | 1940– |
| `herman-walker` | Herman Walker | 1914–1957 |
| `retha-hammack` | Retha R Hammack | 1917–2001 |
| `eugene-moore` | Eugene G Moore | 1912–1999 |
| `mary-hennessy` | Mary C Hennessy | 1917–1986 |

## Design Decisions Already Made

- Teal theme (#4a8fa8) — keep for prototype, revisit before production
- React + Vite (not Next.js) — prototype only; Next.js + FileMaker + Cloudflare R2 is the production target
- Face recognition: removed from roadmap — Google Photos handles clustering externally
- Relationship model: separate `relationships` array (not `parentIds` on person)
- Dagre import: use named imports `import { graphlib, layout } from '@dagrejs/dagre'`
- Spouse edges: `type: straight`, `strokeDasharray: '5,4'`, golden color, Bottom/Top handles
- Parent edges: `type: smoothstep`, white, Right/Left handles
- Export anchor appended to `document.body` before `.click()` for cross-browser compatibility

## Copy/Tone Rules (apply to all UI text)

- Frame every action as preservation ("Preserve this memory", not "Save")
- Celebrate identity, not task completion
- Banned in UI: "bucket", "cluster", "entity"
- Export button: "Preserve changes → Export JSON"
- Edit button on person page: "✏ Preserve their story"
- Photo grid label: "Their photographs"
- Notes field label: "Their story"

## Out of Scope (do not implement)

- Face recognition / photo-to-person matching
- GEDCOM import (Phase 2)
- Backend, database, auth
- Photo upload via UI
- Death date display in UI (field exists in data model)
- Mobile / <1024px

## Docs

- Spec: `docs/superpowers/specs/2026-05-18-family-tree-prototype-design.md`
- Plan: `docs/superpowers/plans/2026-05-18-family-tree-prototype.md`
- Partner PRD notes: `docs/design_notes/partner_notes.md`
- Notion progress log: https://www.notion.so/3641e2e6bc7180c38f8ac342aed8973f
