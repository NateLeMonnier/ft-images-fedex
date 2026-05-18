My project partner sent over a v1.0 PRD for PhotoTree. You are already in the middle of building this project, so I do NOT want you to treat this document as a fresh spec or as instructions to start over. Treat it as context from a stakeholder.

## How to handle this PRD

1. **What you are already building takes priority.** If anything in this PRD conflicts with code, decisions, or direction already in the repo, keep what you have. Flag the conflict to me — do not silently rework existing code to match the PRD.
2. **For conflicts, note that things might change later.** When you flag a conflict, mark it as something we may revisit, not something to action now.
3. **For new ideas not yet in the codebase:** read them, make sure you understand the intent, then come back to me with two questions per item — (a) whether to implement it at all, and (b) if yes, how it should fit with what is already built. Do not start building new surfaces from this PRD on your own.
4. **For items that match what you are already building:** no action needed. You can note them as "aligned with current direction" so I can see the overlap, but skip them in your questions.

## What I want you to do right now

- Read the full PRD context below.
- Compare against the current state of the repo.
- Produce three lists for me:
  - **Aligned** — PRD items that match what you are already building.
  - **Conflicts** — PRD items that contradict existing code or decisions. For each, state what is in the repo, what the PRD says, and your recommendation for which should win. Default recommendation should be "keep current, revisit later."
  - **New ideas** — PRD items not yet represented in the repo. For each, write two short questions: should we build it, and if so how should it integrate.
- Do not modify the codebase as part of this pass. This is review and triage only.

## PRD context

**Product.** PhotoTree v1.0. Private desktop-web app for a single family to browse their photo collection through an interactive bi-directional family tree. Clicking a person on the tree opens that person's photo gallery. Single-tenant, desktop-only, no mobile, no sharing, no in-app AI.

**Decided tech stack.** Next.js on Vercel Pro (App Router). Vercel serverless functions for the API layer. FileMaker Server as the database, accessed via FileMaker Data API (REST), with token/session management handled in the API layer. Cloudflare R2 for photo files, with a `families/{family_id}/photos/` path prefix. Resend for transactional email. Email/password auth, 30-day session, password reset.

**Architecture constraints.**
- All data scoped to a `family_id` from day one even though v1.0 is single-family. This is the prerequisite for future multi-tenant SaaS.
- Frontend never talks to FileMaker directly. Everything flows through the serverless API layer so the data store can be swapped to Postgres later with no frontend changes.
- Auth supports future roles (viewer, contributor, admin) even though v1.0 only uses one role.

**Data model (FileMaker tables).**
- Person: id, family_id, first_name, last_name, birth_date, death_date, gender, profile_photo_r2_key, created_at
- Relationship: person_a_id, person_b_id, type ("parent" | "spouse"), marriage_date (optional)
- Photo: id, family_id, r2_key (original), r2_web_key (≤2048px), taken_date, location_text, lat, lng, caption, uploaded_at, bucket_id (nullable)
- PhotoPerson join: photo_id, person_id (many-to-many)
- PersonaBucket: id, family_id, upload_job_id, status ("pending" | "identified" | "skipped" | "unknown"), identified_person_id (nullable), representative_photo_id, created_at
- UploadJob: id, family_id, operator_id, status ("uploading" | "ready" | "complete"), photo_count, bucket_count, created_at
- OperatorCredential: id, family_id, email, hashed_password, expires_at, revoked_at (nullable)

**Surfaces in v1.0 scope.**
1. Auth + account setup: email/password, password reset, 30-day session, account settings.
2. Family tree view: bi-directional around a pivot (default pivot is open — see open questions), pan/zoom, nodes show profile photo + name + birth/death years, line styles distinguish parent/child vs. spouse, right-click sets new pivot, handles ≥300 nodes, collapses beyond 3 generations.
3. Person editor: manual form with name, dates, gender, profile photo, at least one relationship. Edit + soft delete. Orphaned photo links preserved.
4. GEDCOM 5.5.1 import with preview-then-commit. Re-import merge is phase 2.
5. Person gallery: responsive grid, date sort, cards show thumbnail/date/caption, date and location filters.
6. Lightbox: full-screen viewer, full-res image, all metadata, tagged people as links, arrow-key and Escape nav.
7. Photo upload (family member side): drag-and-drop or picker, JPG/PNG/HEIC/TIFF up to 50 MB, EXIF date and GPS auto-fill with user override, manual date/location/caption, typeahead person tagging, originals to R2 plus ≤2048px web variant.
8. Global search: people by name in v1.0, captions deferred to P1.
9. Operator portal at `/operator/upload`: separate auth identity, cannot see galleries/tree/settings/billing, uploads ZIPs or folders representing one persona bucket each (up to 500 photos), real-time per-file + overall progress, failures listed without aborting, confirmation preview before commit, completion email to family member on job done.
10. Tree-ready flow: family member marks tree "Ready for photos" (requires ≥2 people), webhook + email fires to operator.
11. Identification Flow: full-screen focused mode, one bucket at a time, hero photo + filmstrip of 4–6 supporting photos, click filmstrip to promote to hero, search-and-select panel of all tree people with name/year/thumbnail, inline "Add new person" form, on match all bucket photos assign instantly, Skip and "Unknown" options, save and resume after every action.
12. Gamification layer on the Identification Flow:
    - Persistent progress bar "X of Y identified" with endowed progress (~5% pre-filled).
    - Under 5 remaining shifts UI to "You're almost done!" state.
    - Streak counter on 3+ consecutive identifications, resets on skip/unknown.
    - Per-identification ~1.5s celebration animation (warm, not arcade), node fills in on a mini-map, rotating warm-tone message, skippable via keypress.
    - Mid-session exit interstitial summarizes effort.
    - Persistent home-page banner when unresolved buckets exist.
    - Resume jumps to next unresolved bucket.
    - Final-bucket full-screen completion celebration with stats and CTA to browse the tree.
    - Completion email via Resend with stats and a link back.

**Copy rules.**
- Frame every action as preservation, not a task.
- Celebrate identity, not completion.
- Never let a user exit without an effort summary.
- "Bucket," "cluster," and "entity" are banned from user-facing UI. Internal use is fine.

**Visual direction.** Warm, nostalgic, printed-album feel. Serif body and headings (Georgia or similar), sans-serif for UI chrome only. Cream/off-white backgrounds, terracotta and warm-brown accents, espresso body text. Drop shadows on photo cards. Rounded tree node cards with thin warm borders. Smooth transitions between tree and gallery.

**Performance targets.** Initial load <3s on 10 Mbps. Person gallery <1.5s for up to 200 photos. Tree renders 300 nodes without degradation.

**Out of scope for v1.0.** Mobile/<1024px, public sharing, collaborative editing, multi-family/SaaS billing, storage tiers, in-app AI/face recognition (Google Photos handles clustering externally for now), AI colorization, cross-bucket duplicate detection, "On This Day," bulk metadata editing, GEDCOM re-import with merge.

**Open questions in the PRD.**
- Default pivot: self vs. oldest known ancestor?
- HEIC conversion: client-side or server-side?
- Operator-to-family modeling: one operator account linked to many families, or per-family credentials?
- Google Photos album naming: manually labeled or auto-named ("Person 1")?

## Reminder

Do not start coding new surfaces from this. Hold any new direction until I confirm. Where the PRD lines up with what is already in the repo, leave the repo alone. Where it conflicts, surface the conflict — current code wins by default, and we will revisit later if needed.