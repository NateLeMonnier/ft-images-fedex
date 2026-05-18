# Family Tree Prototype — Design Spec

**Date:** 2026-05-18
**Project:** ft-images-fedex
**Status:** Approved

---

## Overview

A React + Vite single-page prototype that displays a family photo tree. Photos are grouped by person. Each person is a node on the tree. Clicking a node navigates to a dedicated person page showing all their photos and biographical info. No backend. Data lives in Git.

---

## Tech Stack

- **Frontend:** React + Vite
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

`family.json` holds a `people` array. Each person has a stable `id` that doubles as their photo folder name and React Flow node key.

```json
{
  "people": [
    {
      "id": "jane-smith",
      "name": "Jane Smith",
      "birthDate": "5 Nov 1969",
      "birthLocation": "Los Angeles, California",
      "deathDate": null,
      "notes": "",
      "parentIds": ["harold-walker", "kathryn-moore"],
      "photos": ["01.jpg", "02.jpg"]
    }
  ]
}
```

- `parentIds` drives edge generation in React Flow. Each entry becomes a directed edge from child to parent.
- `photos` are filenames resolved to `public/photos/[id]/[filename]`.
- The first photo in the array is used as the node thumbnail.

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

- **Layout:** Left-to-right pedigree chart, 3 generations (7 nodes: 1 subject, 2 parents, 4 grandparents)
- **Background:** Teal (#4a8fa8)
- **Nodes:** React Flow custom nodes — white cards (190×64px) with a photo thumbnail on the left, name and year range on the right, and a photo count badge
- **Subject node:** Darker card (#1a2e38), wider (220px), shows full birth date and location (not just year range)
- **Connectors:** Right-angle edges — horizontal from node right edge to a midpoint, vertical joining sibling connections, horizontal to parent left edge
- **Edit icon:** Appears on node hover; opens the Edit Modal
- **Click target:** The entire node is clickable and navigates to the Person Page. The photo count badge is decorative only.
- **Export JSON button:** Top-right of the tree page
- **Dashed vertical line:** A decorative SVG element rendered as an absolute-positioned overlay below the subject node. It is not a React Flow edge — just a visual cue that the tree can extend further back.

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

Uses the Walker family from the reference image:

| ID | Name | Years | Parents |
|---|---|---|---|
| `kathryn-walker` | Kathryn Walker | 1969– | harold-walker, kathryn-moore |
| `harold-walker` | Harold F Walker | 1940– | herman-walker, retha-hammack |
| `kathryn-moore` | Kathryn Moore | 1940– | eugene-moore, mary-hennessy |
| `herman-walker` | Herman Walker | 1914–1957 | — |
| `retha-hammack` | Retha R Hammack | 1917–2001 | — |
| `eugene-moore` | Eugene G Moore | 1912–1999 | — |
| `mary-hennessy` | Mary C Hennessy | 1917–1986 | — |

---

## Out of Scope for Prototype

- Face recognition / photo-to-person matching (Phase 1)
- GEDCOM file upload (Phase 2)
- Backend or database
- Authentication
- Photo upload via UI (photos are added by dropping files into the repo folder)
- Death date display (field exists in data model but not shown in prototype UI)
