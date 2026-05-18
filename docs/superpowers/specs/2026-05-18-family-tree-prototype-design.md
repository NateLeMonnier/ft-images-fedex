# Family Tree Prototype — Design Spec

**Date:** 2026-05-18
**Project:** ft-images-fedex
**Status:** Approved — updated after partner PRD review (2026-05-18)

---

## Overview

A React + Vite single-page prototype that displays a family photo tree. Photos are grouped by person. Each person is a node on the tree. Clicking a node navigates to a dedicated person page showing all their photos and biographical info. No backend. Data lives in Git.

---

## Tech Stack

- **Frontend:** React + Vite *(prototype only — partner PRD targets Next.js on Vercel with a serverless API layer and FileMaker DB. Migration is a production-phase decision.)*
- **Tree rendering:** React Flow (chosen over custom CSS because GEDCOM support in Phase 2 requires a data-driven, dynamically-sized tree — a hand-rolled CSS layout would need a full rewrite)
- **Routing:** React Router
- **Persistence:** `family.json` in Git as source of truth; localStorage for unsaved edits; Export JSON button to download and commit changes

---

## Project Structure

```
src/
  components/
    PersonNode.jsx       # React Flow custom node component
    PersonPage.jsx       # person detail page (bio + photo grid)
    EditModal.jsx        # edit birth date / location / notes
  data/
    family.json          # source of truth, committed to git
  hooks/
    useFamilyData.js     # loads JSON, merges localStorage overrides
  App.jsx
  main.jsx
public/
  photos/
    [person-id]/         # one folder per person
      01.jpg             # placeholder images for prototype
```

---

## Data Model

`family.json` has a top-level `family_id`, a `people` array, and a `relationships` array. The `family_id` field is added now (single-family prototype) to keep the schema aligned with the future multi-tenant production data model — no schema migration needed later.

```json
{
  "family_id": "walker-family",
  "people": [
    {
      "id": "jane-smith",
      "name": "Jane Smith",
      "birthDate": "5 Nov 1969",
      "birthLocation": "Los Angeles, California",
      "deathDate": null,
      "notes": "",
      "photos": ["01.jpg", "02.jpg"]
    }
  ],
  "relationships": [
    { "personAId": "harold-walker", "personBId": "jane-smith", "type": "parent" },
    { "personAId": "kathryn-moore", "personBId": "jane-smith", "type": "parent" },
    { "personAId": "harold-walker", "personBId": "kathryn-moore", "type": "spouse" }
  ]
}
```

- `relationships` drives all edge generation in React Flow. `type: "parent"` becomes a directed parent→child edge. `type: "spouse"` becomes a visually distinct spouse connector (dashed or different color).
- `photos` are filenames resolved to `public/photos/[id]/[filename]`.
- The first photo in the array is used as the node thumbnail.
- Photo metadata (caption, taken_date, location) is not included in the prototype. Deferred to the production data model.

---

## Persistence Model

1. On startup, `useFamilyData` loads `family.json`.
2. It checks `localStorage` for a key `ft-overrides` and deep-merges any edits on top of the loaded JSON.
3. Edits made in the UI (via the Edit Modal) are written to `localStorage` only — no file is touched.
4. The **Export JSON** button on the tree page serializes the merged state and triggers a browser download of `family.json`.
5. The user replaces `src/data/family.json` with the downloaded file and commits it to the repo.

**Important:** If birth dates, locations, or notes were edited in the UI, the exported JSON must be manually committed to the repo to persist across machines and deployments. If nothing was edited, no action is required.

---

## Tree View

- **Layout:** Bi-directional tree centered on a pivot person, rendered left-to-right using dagre auto-layout (`@dagrejs/dagre` + `dagre-d3`). Ancestors expand to the right; descendants to the left. Default pivot is the subject (Kathryn Walker).
- **Depth limit:** Nodes beyond 3 generations from the pivot are filtered out. The filtering mechanism is implemented; explicit expand/collapse buttons are deferred — the demo dataset only has 3 generations so there is nothing to expand.
- **Background:** Teal (#4a8fa8)
- **Nodes:** React Flow custom nodes — white cards with a photo thumbnail on the left, name and year range on the right, and a photo count badge
- **Pivot node:** Darker card (#1a2e38), wider, shows full birth date and location
- **Parent/child connectors:** Right-angle edges in white/light
- **Spouse connectors:** Visually distinct — dashed line or warm accent color to distinguish from parent/child edges
- **Right-click a node:** Sets that person as the new pivot; tree re-renders bi-directionally from the new pivot
- **Edit icon:** Appears on node hover; opens the Edit Modal
- **Click target:** The entire node navigates to the Person Page
- **Export JSON button:** Top-right of the tree page

> **Implementation note:** Bi-directional layout with dagre is the most complex piece of the prototype. It requires `@dagrejs/dagre` as an additional dependency and a pivot-aware graph computation step before React Flow renders. Budget extra time here.

---

## Person Page

Navigated to by clicking any tree node. Back button returns to the tree.

**Top bar:** Back button, person name, Edit Info button

**Bio section:**
- Primary photo thumbnail (first in `photos` array)
- Birth date
- Birth location
- Photo count
- Notes / bio blurb

**Photo grid:**
- 4-column grid, all photos for the person
- Sorted by date (derived from EXIF or filename — TBD in Phase 1)
- First photo marked with a star (★) as the primary/thumbnail photo
- Clicking a photo opens it full size: a full-screen overlay with the image centered, dark backdrop, and a close button (×). No library needed — a simple conditional render.

---

## Edit Modal

Triggered by the Edit Info button on the Person Page or the hover edit icon on tree nodes.

**Fields:**
- Birth Date (text input)
- Birth Location (text input)
- Notes (textarea)

**Save behavior:** Writes to `localStorage` only. Modal displays a note:
> "Changes save locally in your browser. To make them permanent, click Export JSON on the tree page and commit the downloaded file to the repo."

**Cancel:** Discards changes, closes modal.

---

## Placeholder Photo Structure

For the prototype, each person gets a folder under `public/photos/[person-id]/` containing one grey placeholder image (`placeholder.jpg`). The folder structure is committed to the repo so real photos can be dropped in later without any code changes.

---

## Prototype Family Data

Uses the Walker family from the reference image. `family_id: "walker-family"`.

**People:**

| ID | Name | Years |
|---|---|---|
| `kathryn-walker` | Kathryn Walker | 1969– |
| `harold-walker` | Harold F Walker | 1940– |
| `kathryn-moore` | Kathryn Moore | 1940– |
| `herman-walker` | Herman Walker | 1914–1957 |
| `retha-hammack` | Retha R Hammack | 1917–2001 |
| `eugene-moore` | Eugene G Moore | 1912–1999 |
| `mary-hennessy` | Mary C Hennessy | 1917–1986 |

**Relationships:**

| personAId | personBId | type |
|---|---|---|
| `harold-walker` | `kathryn-walker` | parent |
| `kathryn-moore` | `kathryn-walker` | parent |
| `herman-walker` | `harold-walker` | parent |
| `retha-hammack` | `harold-walker` | parent |
| `eugene-moore` | `kathryn-moore` | parent |
| `mary-hennessy` | `kathryn-moore` | parent |
| `harold-walker` | `kathryn-moore` | spouse |

---

## Copy and Tone Rules

Applied to all user-facing UI text (button labels, empty states, headings, modal copy).

- Frame every action as preservation, not a task. ("Preserve this memory" not "Save changes.")
- Celebrate identity and history, not task completion.
- Never let a user exit without an effort summary (e.g. edit modal confirms what was saved before closing).
- Banned in UI-facing text: "bucket," "cluster," "entity." Internal code/variable names are fine.

---

## PRD Conflict Notes

These conflicts were reviewed on 2026-05-18. Decisions documented for future reference.

| # | Topic | Repo decision | PRD position | Resolution |
|---|---|---|---|---|
| 1 | Visual theme | Teal (#4a8fa8), modern | Warm cream/terracotta, nostalgic | Keep teal for prototype. Revisit visual direction before production. |
| 2 | Tech stack | React + Vite | Next.js on Vercel, FileMaker, Cloudflare R2 | Keep React + Vite for prototype. Production migration is a separate decision. |
| 3 | Face recognition | Listed as Phase 1 feature | Out of scope for v1.0 — Google Photos handles external clustering | **Switched to PRD.** In-app face recognition is removed from the roadmap. Photo-to-person assignment will be handled externally (Google Photos) and imported. |
| 4 | Relationship model | `parentIds` array on person | Separate `Relationship` entity with `type: "parent" \| "spouse"` | **Switched to PRD.** Data model updated to use a top-level `relationships` array. Enables spouse links and aligns with future production schema. |

---

## Out of Scope for Prototype

- Face recognition / photo-to-person matching *(removed from roadmap — see PRD conflict note 3)*
- GEDCOM file upload (Phase 2)
- Backend or database
- Authentication
- Photo upload via UI (photos are added by dropping files into the repo folder)
- Death date display (field exists in data model but not shown in prototype UI)
