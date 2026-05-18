# ft-images-fedex

A friendly interface for viewing and navigating family photos, with photos grouped by person on a family tree.

## Project Overview

After a large scanning project, people are often given a hard drive full of photos that are difficult to navigate and consume. This tool solves that by providing a clean interface to view all family photos, automatically grouped by the people in them and displayed as nodes on a family tree.

Production target is Next.js + FileMaker + Cloudflare R2. This prototype uses React + Vite + Supabase.

## Tech Stack

React 18 + Vite, @xyflow/react (React Flow v12), @dagrejs/dagre, react-router-dom v6, Vitest + React Testing Library. Supabase for persistence (PostgreSQL + Storage). Client-side image compression via browser-image-compression. EXIF extraction via exifr.

## Running Locally

```bash
npm install
npm run dev
# Dev server at http://localhost:5173
```

Requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## What's Built

- **Tree view** (`/`): Bi-directional React Flow tree with dagre layout. Right-click any node to re-pivot with animated transition. 3 ancestor generations, 1 descendant generation.
- **Person page** (`/person/:id`): Bio card (birth/death dates, location), 8-column photo grid with pagination (100 per page), sortable by date (newest/oldest first), primary photo selection, photo upload from folders.
- **Photo lightbox**: Arrow-key navigation across full collection, editable date/location/description fields, person tagging and removal, profile photo selection, delete with confirmation. Navigates seamlessly across paginated pages.
- **Photo upload**: Folder picker, client-side compression (2048px max, JPEG 0.85 quality), EXIF date/camera extraction, Google Takeout sidecar JSON parsing (dates, descriptions, locations), progress bar with completion summary. Re-uploading repairs metadata from sidecars.
- **Edit modal**: Birth date, birth location, notes. Saves to Supabase person_overrides table.

## Database Schema (Supabase)

- `photos` table: id (uuid), filename (unique), storage_path, date, location, description, width, height, camera_model, uploaded_at
- `photo_people` junction table: photo_id, person_id (composite primary key)
- `person_overrides` table: person_id (primary key), primary_photo, birth_date, birth_location, notes, updated_at
- Storage bucket: `photos` (public read/write for prototype)

Base family data lives in `src/data/family.json`. Supabase overrides merge on top without clobbering unset fields.

## Key Files

```
src/
  components/
    TreeView.jsx       -- React Flow canvas, pivot state, animated transition
    PersonNode.jsx     -- Custom tree node with photo thumbnails
    PersonPage.jsx     -- Bio + paginated photo grid + upload
    PhotoLightbox.jsx  -- Full-screen photo viewer with editing
    EditModal.jsx      -- Person detail editor
  data/family.json     -- Family source of truth (people + relationships)
  hooks/useFamilyData.js   -- Loads JSON, merges Supabase overrides and photos
  utils/treeLayout.js      -- filterByDepth + buildReactFlowGraph (dagre)
  utils/uploadPhotos.js    -- Client-side upload with EXIF, compression, sidecar parsing
  lib/supabase.js          -- Supabase client init
scripts/
  supabase-schema-v2.sql   -- Database schema DDL
  migrate-photos.js        -- One-time migration from filesystem to Supabase Storage
docs/
  QA_Test_Plan.md          -- Comprehensive test plan
```

## Known Issues and Decisions

- Many scanned photos have EXIF dates reflecting the scan date rather than the actual photo date. Users can correct dates manually in the lightbox, or re-upload the Google Takeout folder to repair dates from sidecar metadata.
- Supabase free tier provides 1 GB storage. Currently using about 72 MB for 168 photos. Cloudflare R2 is the production target for lower cost.
- Sort stability across pagination is enforced by using filename as a tiebreaker for equal dates.
- Photos dated after a person's death date have their date suppressed in the lightbox (scan date filter).

## Session Log

### 2026-05-18
- Fixed pre-1970 date bug in Google Takeout sidecar parsing. Unix timestamps before the epoch (January 1, 1970) were silently discarded by a `ts > 0` check. Widened year range validation to 1800-2030.
- Added metadata repair on re-upload. When uploading a folder with photos that already exist in the database, sidecar JSON metadata (dates, descriptions, locations) now updates the existing records. Upload summary shows count of repaired dates.
- Added pagination to person gallery page. 100 photos per page with ellipsis-style page buttons. Sort order maintained across pages. Lightbox navigates across the full collection and updates the visible page when crossing boundaries.
- Fixed unstable sort across paginated pages by adding filename as a deterministic tiebreaker for photos with equal or missing dates.
- Diagnosed storage usage: 168 photos, 72 MB, well within Supabase free tier (1 GB). Discussed Cloudflare R2 as the production storage target ($0.015/GB/month, zero egress).
- Stopped dev server and committed changes.
