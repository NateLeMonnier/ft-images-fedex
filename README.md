# ft-images-fedex

A friendly and intuitive interface for viewing and navigating family photos from large scanning projects, with photos grouped by person on a family tree.

## Project Overview

After a large scanning project, people are often given a hard drive full of photos that are difficult to navigate and consume. This tool solves that by providing a clean interface to view all family photos, automatically grouped by the people in them and displayed as nodes on a family tree.

**Phase 1:** Group photos by person (face recognition) and display each person as a node on the family tree. Photos for each person are sorted by date.

**Phase 2:** Allow users to expand the family tree by uploading a GEDCOM file to add more people.

## Decisions Needed on Development Day

These choices need to be made before or at the start of development. None have been decided yet.

### Face Recognition & Grouping
- **Service/library:** AWS Rekognition, Azure Face API, Google Vision, or a local library (e.g., Python `face_recognition`)
- **Clustering approach:** How do we determine that two faces are the same person? Threshold tuning, manual review, or fully automated?
- **Unknown people:** How do we handle faces that don't match any existing family tree node?

### Photo Date Sorting
- **Date source:** EXIF metadata, filename parsing, AI inference, or manual input?
- **Handling missing dates:** What do we show when a photo has no date — sort to top, bottom, or a separate bucket?

### Family Tree Display
- **Tree rendering library:** A graph/tree visualization library (e.g., D3.js, React Flow, vis.js) or a purpose-built genealogy component?
- **Node layout:** How do we visually structure the tree — top-down, left-right, radial?
- **Node content:** What does each person node show — name, thumbnail of best photo, photo count?

### GEDCOM Integration (Phase 2)
- **GEDCOM parsing library:** Which library to use for parsing uploaded GEDCOM files?
- **Conflict resolution:** What happens when a GEDCOM person already exists as a face-recognized node — merge or keep separate?
- **Supported GEDCOM fields:** Which fields do we actually use (name, birth date, relationships, photo links)?

### Tech Stack
- **Frontend framework:** React, Vue, or other?
- **Backend language/framework:** Python (Flask/FastAPI), Node (Express), or other?
- **Data storage:** How are face index data, GEDCOM records, and photo metadata persisted — local files, SQLite, or a hosted database?

### Infrastructure & Deployment
- **Where does it run:** Fully local (laptop), hosted web app, or something else?
- **Photo storage:** Are photos served from the local filesystem or uploaded to cloud storage?
- **API keys needed:** Depends on the face recognition service chosen above.

---

## Getting Started

_Setup and run instructions will be added once development begins._

## Contributing

_Contribution guidelines will be added once development begins._

## License

_License TBD._
