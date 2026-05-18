# Family Tree Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React + Vite prototype of a family photo tree — bi-directional tree view via React Flow + dagre, dedicated person pages with photo grids, and an edit modal that persists changes to localStorage with a JSON export.

**Architecture:** Single-page app with two routes: `/` (tree view) and `/person/:id` (person page). All data lives in `src/data/family.json`; edits are layered on top via `localStorage`. `@dagrejs/dagre` computes node positions from a pivot person; React Flow renders the result.

**Tech Stack:** React 18, Vite, `@xyflow/react` (React Flow v12), `@dagrejs/dagre`, `react-router-dom` v6, Vitest, React Testing Library

---

## File Map

```
src/
  components/
    TreeView.jsx        — React Flow canvas, pivot state, export button
    PersonNode.jsx      — React Flow custom node (pivot + default styles)
    PersonPage.jsx      — bio section + photo grid
    PhotoLightbox.jsx   — full-screen photo overlay
    EditModal.jsx       — edit birth date / location / notes
  data/
    family.json         — Walker family data (source of truth)
  hooks/
    useFamilyData.js    — load JSON, merge localStorage overrides
  utils/
    treeLayout.js       — filterByDepth + buildReactFlowGraph (pure, dagre)
    exportJson.js       — serialize data → browser download
  __tests__/
    treeLayout.test.js
    useFamilyData.test.js
    exportJson.test.js
  test-setup.js
  App.jsx               — BrowserRouter + two routes
  main.jsx              — entry point
  index.css             — React Flow overrides + PersonNode CSS
public/
  photos/
    kathryn-walker/placeholder.svg
    harold-walker/placeholder.svg
    kathryn-moore/placeholder.svg
    herman-walker/placeholder.svg
    retha-hammack/placeholder.svg
    eugene-moore/placeholder.svg
    mary-hennessy/placeholder.svg
```

---

## Task 1: Scaffold project and install dependencies

**Files:**
- Create: `package.json` (via vite create)
- Modify: `vite.config.js`
- Create: `src/test-setup.js`

- [ ] **Step 1: Scaffold Vite + React project**

Run from inside `ft-images-fedex/`:
```bash
npm create vite@latest . -- --template react
```
When prompted about existing files, choose to ignore/overwrite (the repo only has docs and .gitignore — no src files).

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install @xyflow/react @dagrejs/dagre react-router-dom
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 4: Configure Vitest in vite.config.js**

Replace the contents of `vite.config.js` with:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
  },
})
```

- [ ] **Step 5: Create test setup file**

Create `src/test-setup.js`:
```js
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Verify the dev server starts and tests run**

```bash
npm run dev
```
Expected: Vite dev server starts on `http://localhost:5173` with the default React scaffold page.

```bash
npx vitest run
```
Expected: No test files found yet — exits 0 (or warns about no tests).

- [ ] **Step 7: Delete Vite scaffold files we don't need**

```bash
rm src/App.css src/assets/react.svg public/vite.svg
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold React+Vite project with React Flow, dagre, React Router"
```

---

## Task 2: Family data and placeholder photos

**Files:**
- Create: `src/data/family.json`
- Create: `public/photos/[person-id]/placeholder.svg` (7 files)

- [ ] **Step 1: Create the placeholder SVG**

Create `public/photos/placeholder.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#b0b8c0"/>
  <circle cx="100" cy="78" r="36" fill="#8090a0"/>
  <ellipse cx="100" cy="168" rx="56" ry="42" fill="#8090a0"/>
</svg>
```

- [ ] **Step 2: Create per-person photo folders and copy placeholder**

```bash
for id in kathryn-walker harold-walker kathryn-moore herman-walker retha-hammack eugene-moore mary-hennessy; do
  mkdir -p public/photos/$id
  cp public/photos/placeholder.svg public/photos/$id/placeholder.svg
done
```

- [ ] **Step 3: Create family.json**

Create `src/data/family.json`:
```json
{
  "family_id": "walker-family",
  "people": [
    {
      "id": "kathryn-walker",
      "name": "Kathryn Walker",
      "birthDate": "5 Nov 1969",
      "birthLocation": "Los Angeles, California",
      "deathDate": null,
      "notes": "",
      "photos": ["placeholder.svg"]
    },
    {
      "id": "harold-walker",
      "name": "Harold F Walker",
      "birthDate": "1940",
      "birthLocation": "",
      "deathDate": null,
      "notes": "",
      "photos": ["placeholder.svg"]
    },
    {
      "id": "kathryn-moore",
      "name": "Kathryn Moore",
      "birthDate": "1940",
      "birthLocation": "",
      "deathDate": null,
      "notes": "",
      "photos": ["placeholder.svg"]
    },
    {
      "id": "herman-walker",
      "name": "Herman Walker",
      "birthDate": "1914",
      "birthLocation": "",
      "deathDate": "1957",
      "notes": "",
      "photos": ["placeholder.svg"]
    },
    {
      "id": "retha-hammack",
      "name": "Retha R Hammack",
      "birthDate": "1917",
      "birthLocation": "",
      "deathDate": "2001",
      "notes": "",
      "photos": ["placeholder.svg"]
    },
    {
      "id": "eugene-moore",
      "name": "Eugene G Moore",
      "birthDate": "1912",
      "birthLocation": "",
      "deathDate": "1999",
      "notes": "",
      "photos": ["placeholder.svg"]
    },
    {
      "id": "mary-hennessy",
      "name": "Mary C Hennessy",
      "birthDate": "1917",
      "birthLocation": "",
      "deathDate": "1986",
      "notes": "",
      "photos": ["placeholder.svg"]
    }
  ],
  "relationships": [
    { "personAId": "harold-walker",  "personBId": "kathryn-walker", "type": "parent" },
    { "personAId": "kathryn-moore",  "personBId": "kathryn-walker", "type": "parent" },
    { "personAId": "herman-walker",  "personBId": "harold-walker",  "type": "parent" },
    { "personAId": "retha-hammack",  "personBId": "harold-walker",  "type": "parent" },
    { "personAId": "eugene-moore",   "personBId": "kathryn-moore",  "type": "parent" },
    { "personAId": "mary-hennessy",  "personBId": "kathryn-moore",  "type": "parent" },
    { "personAId": "harold-walker",  "personBId": "kathryn-moore",  "type": "spouse" }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add src/data/family.json public/photos/
git commit -m "feat: add Walker family data and placeholder photos"
```

---

## Task 3: Utility functions — treeLayout and exportJson

**Files:**
- Create: `src/utils/treeLayout.js`
- Create: `src/utils/exportJson.js`
- Create: `src/__tests__/treeLayout.test.js`
- Create: `src/__tests__/exportJson.test.js`

- [ ] **Step 1: Write failing tests for filterByDepth**

Create `src/__tests__/treeLayout.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { filterByDepth, buildReactFlowGraph } from '../utils/treeLayout'

const people = [
  { id: 'child',       name: 'Child',       birthDate: '2000', deathDate: null, notes: '', birthLocation: '', photos: [] },
  { id: 'parent-a',   name: 'Parent A',    birthDate: '1970', deathDate: null, notes: '', birthLocation: '', photos: [] },
  { id: 'parent-b',   name: 'Parent B',    birthDate: '1972', deathDate: null, notes: '', birthLocation: '', photos: [] },
  { id: 'grandparent',name: 'Grandparent', birthDate: '1945', deathDate: null, notes: '', birthLocation: '', photos: [] },
]

const relationships = [
  { personAId: 'parent-a',   personBId: 'child',    type: 'parent' },
  { personAId: 'parent-b',   personBId: 'child',    type: 'parent' },
  { personAId: 'grandparent',personBId: 'parent-a', type: 'parent' },
  { personAId: 'parent-a',   personBId: 'parent-b', type: 'spouse' },
]

describe('filterByDepth', () => {
  it('includes the pivot itself', () => {
    const result = filterByDepth(people, relationships, 'child', 0)
    expect(result.map(p => p.id)).toContain('child')
  })

  it('includes direct parents within depth 1', () => {
    const result = filterByDepth(people, relationships, 'child', 1)
    const ids = result.map(p => p.id)
    expect(ids).toContain('parent-a')
    expect(ids).toContain('parent-b')
  })

  it('excludes nodes beyond maxDepth', () => {
    const result = filterByDepth(people, relationships, 'child', 1)
    expect(result.map(p => p.id)).not.toContain('grandparent')
  })

  it('includes grandparent at depth 2', () => {
    const result = filterByDepth(people, relationships, 'child', 2)
    expect(result.map(p => p.id)).toContain('grandparent')
  })

  it('includes spouse of pivot at same depth', () => {
    const result = filterByDepth(people, relationships, 'parent-a', 0)
    expect(result.map(p => p.id)).toContain('parent-b')
  })

  it('traverses descendants (children)', () => {
    const result = filterByDepth(people, relationships, 'parent-a', 1)
    expect(result.map(p => p.id)).toContain('child')
  })
})

describe('buildReactFlowGraph', () => {
  it('returns a node for every visible person', () => {
    const { nodes } = buildReactFlowGraph(people, relationships, 'child', 3)
    expect(nodes.length).toBe(4)
  })

  it('marks the pivot node with isPivot: true', () => {
    const { nodes } = buildReactFlowGraph(people, relationships, 'child', 3)
    const pivot = nodes.find(n => n.id === 'child')
    expect(pivot.data.isPivot).toBe(true)
  })

  it('marks non-pivot nodes with isPivot: false', () => {
    const { nodes } = buildReactFlowGraph(people, relationships, 'child', 3)
    const nonPivot = nodes.find(n => n.id === 'parent-a')
    expect(nonPivot.data.isPivot).toBe(false)
  })

  it('creates a parent edge with source=child target=parent', () => {
    const { edges } = buildReactFlowGraph(people, relationships, 'child', 3)
    const edge = edges.find(e => e.id === 'parent-child-parent-a')
    expect(edge).toBeDefined()
    expect(edge.source).toBe('child')
    expect(edge.target).toBe('parent-a')
  })

  it('creates a spouse edge with dashed stroke style', () => {
    const { edges } = buildReactFlowGraph(people, relationships, 'child', 3)
    const spouseEdge = edges.find(e => e.id.startsWith('spouse-'))
    expect(spouseEdge).toBeDefined()
    expect(spouseEdge.style.strokeDasharray).toBeTruthy()
  })

  it('assigns positions to all nodes', () => {
    const { nodes } = buildReactFlowGraph(people, relationships, 'child', 3)
    nodes.forEach(n => {
      expect(typeof n.position.x).toBe('number')
      expect(typeof n.position.y).toBe('number')
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/__tests__/treeLayout.test.js
```
Expected: FAIL — `Cannot find module '../utils/treeLayout'`

- [ ] **Step 3: Implement treeLayout.js**

Create `src/utils/treeLayout.js`:
```js
import dagre from '@dagrejs/dagre'
import { Position } from '@xyflow/react'

const PIVOT_WIDTH = 220
const DEFAULT_WIDTH = 190
const NODE_HEIGHT = 64

/**
 * BFS from pivotId through parent and child relationships.
 * Parent links count as 1 hop. Spouse links count as 0 hops (same depth as current node).
 * Returns the subset of people within maxDepth hops.
 */
export function filterByDepth(people, relationships, pivotId, maxDepth = 3) {
  const distanceMap = new Map([[pivotId, 0]])
  const queue = [{ id: pivotId, depth: 0 }]

  while (queue.length > 0) {
    const { id, depth } = queue.shift()

    for (const rel of relationships) {
      if (rel.type === 'parent') {
        // Traverse up: child → parent
        if (rel.personBId === id && !distanceMap.has(rel.personAId) && depth + 1 <= maxDepth) {
          distanceMap.set(rel.personAId, depth + 1)
          queue.push({ id: rel.personAId, depth: depth + 1 })
        }
        // Traverse down: parent → child
        if (rel.personAId === id && !distanceMap.has(rel.personBId) && depth + 1 <= maxDepth) {
          distanceMap.set(rel.personBId, depth + 1)
          queue.push({ id: rel.personBId, depth: depth + 1 })
        }
      }

      if (rel.type === 'spouse') {
        const other =
          rel.personAId === id ? rel.personBId :
          rel.personBId === id ? rel.personAId :
          null
        if (other && !distanceMap.has(other)) {
          distanceMap.set(other, depth)
          queue.push({ id: other, depth })
        }
      }
    }
  }

  return people.filter(p => distanceMap.has(p.id))
}

/**
 * Build React Flow nodes and edges with dagre LR layout.
 * Edge direction: child → parent so ancestors appear to the right.
 * Spouse edges are excluded from dagre but included as React Flow edges.
 */
export function buildReactFlowGraph(people, relationships, pivotId, maxDepth = 3) {
  const visible = filterByDepth(people, relationships, pivotId, maxDepth)
  const visibleIds = new Set(visible.map(p => p.id))

  const parentRels = relationships.filter(
    r => r.type === 'parent' && visibleIds.has(r.personAId) && visibleIds.has(r.personBId)
  )
  const spouseRels = relationships.filter(
    r => r.type === 'spouse' && visibleIds.has(r.personAId) && visibleIds.has(r.personBId)
  )

  // Dagre layout on parent relationships only
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 24, ranksep: 64 })

  visible.forEach(p => {
    g.setNode(p.id, { width: p.id === pivotId ? PIVOT_WIDTH : DEFAULT_WIDTH, height: NODE_HEIGHT })
  })

  // source = child (personBId), target = parent (personAId) → parents appear to the right
  parentRels.forEach(r => g.setEdge(r.personBId, r.personAId))

  dagre.layout(g)

  const nodes = visible.map(p => {
    const { x, y } = g.node(p.id)
    const width = p.id === pivotId ? PIVOT_WIDTH : DEFAULT_WIDTH
    return {
      id: p.id,
      type: 'personNode',
      position: { x: x - width / 2, y: y - NODE_HEIGHT / 2 },
      data: { person: p, isPivot: p.id === pivotId },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }
  })

  const parentEdges = parentRels.map(r => ({
    id: `parent-${r.personBId}-${r.personAId}`,
    source: r.personBId,
    target: r.personAId,
    type: 'smoothstep',
    sourceHandle: 'parent-source',
    targetHandle: 'parent-target',
    style: { stroke: 'rgba(255,255,255,0.45)', strokeWidth: 1.5 },
  }))

  const spouseEdges = spouseRels.map(r => ({
    id: `spouse-${r.personAId}-${r.personBId}`,
    source: r.personAId,
    target: r.personBId,
    type: 'straight',
    sourceHandle: 'spouse-source',
    targetHandle: 'spouse-target',
    style: { stroke: 'rgba(255,210,80,0.7)', strokeWidth: 1.5, strokeDasharray: '5,4' },
  }))

  return { nodes, edges: [...parentEdges, ...spouseEdges] }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/__tests__/treeLayout.test.js
```
Expected: all 10 tests PASS

- [ ] **Step 5: Write failing test for exportJson**

Create `src/__tests__/exportJson.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportJson } from '../utils/exportJson'

describe('exportJson', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  it('triggers a link click to download the file', () => {
    const mockClick = vi.fn()
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(tag => {
      const el = realCreate(tag)
      if (tag === 'a') el.click = mockClick
      return el
    })

    exportJson({ family_id: 'test', people: [], relationships: [] })
    expect(mockClick).toHaveBeenCalled()
  })

  it('sets download attribute to family.json', () => {
    let capturedEl = null
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(tag => {
      const el = realCreate(tag)
      if (tag === 'a') { el.click = vi.fn(); capturedEl = el }
      return el
    })

    exportJson({ family_id: 'test', people: [], relationships: [] })
    expect(capturedEl.download).toBe('family.json')
  })
})
```

- [ ] **Step 6: Run exportJson test to confirm it fails**

```bash
npx vitest run src/__tests__/exportJson.test.js
```
Expected: FAIL — `Cannot find module '../utils/exportJson'`

- [ ] **Step 7: Implement exportJson.js**

Create `src/utils/exportJson.js`:
```js
export function exportJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'family.json'
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 8: Run exportJson test to confirm it passes**

```bash
npx vitest run src/__tests__/exportJson.test.js
```
Expected: both tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/utils/ src/__tests__/
git commit -m "feat: add treeLayout and exportJson utilities with tests"
```

---

## Task 4: useFamilyData hook

**Files:**
- Create: `src/hooks/useFamilyData.js`
- Create: `src/__tests__/useFamilyData.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/useFamilyData.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFamilyData } from '../hooks/useFamilyData'

beforeEach(() => localStorage.clear())

describe('useFamilyData', () => {
  it('returns the Walker family data on load', () => {
    const { result } = renderHook(() => useFamilyData())
    expect(result.current.data.family_id).toBe('walker-family')
    expect(result.current.data.people.length).toBe(7)
    expect(result.current.data.relationships.length).toBe(7)
  })

  it('merges localStorage overrides over base data on load', () => {
    localStorage.setItem('ft-overrides', JSON.stringify({
      'kathryn-walker': { notes: 'Loaded from storage' },
    }))
    const { result } = renderHook(() => useFamilyData())
    const person = result.current.data.people.find(p => p.id === 'kathryn-walker')
    expect(person.notes).toBe('Loaded from storage')
  })

  it('updatePerson saves to localStorage and updates state', () => {
    const { result } = renderHook(() => useFamilyData())
    act(() => {
      result.current.updatePerson('kathryn-walker', { birthDate: '1 Jan 1970' })
    })
    const person = result.current.data.people.find(p => p.id === 'kathryn-walker')
    expect(person.birthDate).toBe('1 Jan 1970')
    const stored = JSON.parse(localStorage.getItem('ft-overrides'))
    expect(stored['kathryn-walker'].birthDate).toBe('1 Jan 1970')
  })

  it('updatePerson preserves existing overrides for other people', () => {
    const { result } = renderHook(() => useFamilyData())
    act(() => result.current.updatePerson('harold-walker', { notes: 'Harold note' }))
    act(() => result.current.updatePerson('kathryn-walker', { notes: 'Kathryn note' }))
    const stored = JSON.parse(localStorage.getItem('ft-overrides'))
    expect(stored['harold-walker'].notes).toBe('Harold note')
    expect(stored['kathryn-walker'].notes).toBe('Kathryn note')
  })

  it('falls back to base data if localStorage is corrupt', () => {
    localStorage.setItem('ft-overrides', 'not valid json{{{')
    const { result } = renderHook(() => useFamilyData())
    expect(result.current.data.family_id).toBe('walker-family')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/__tests__/useFamilyData.test.js
```
Expected: FAIL — `Cannot find module '../hooks/useFamilyData'`

- [ ] **Step 3: Implement useFamilyData.js**

Create `src/hooks/useFamilyData.js`:
```js
import { useState } from 'react'
import rawData from '../data/family.json'

const STORAGE_KEY = 'ft-overrides'

function mergeOverrides(base, overrides) {
  if (!overrides) return base
  return {
    ...base,
    people: base.people.map(person => {
      const override = overrides[person.id]
      return override ? { ...person, ...override } : person
    }),
  }
}

export function useFamilyData() {
  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return mergeOverrides(rawData, raw ? JSON.parse(raw) : null)
    } catch {
      return rawData
    }
  })

  function updatePerson(personId, changes) {
    let overrides = {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) overrides = JSON.parse(raw)
    } catch { /* ignore corrupt storage */ }

    overrides[personId] = { ...(overrides[personId] || {}), ...changes }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
    setData(mergeOverrides(rawData, overrides))
  }

  return { data, updatePerson }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/__tests__/useFamilyData.test.js
```
Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/ src/__tests__/useFamilyData.test.js
git commit -m "feat: add useFamilyData hook with localStorage merge"
```

---

## Task 5: Global styles and routing skeleton

**Files:**
- Modify: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/index.css`

- [ ] **Step 1: Write index.css**

Create `src/index.css`:
```css
*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #4a8fa8;
}

/* ── PersonNode ── */
.person-node {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  padding: 10px 14px;
  height: 64px;
  background: #fff;
  cursor: pointer;
  position: relative;
}

.person-node--pivot {
  background: #1a2e38;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.person-node:hover .person-node__edit { opacity: 1; }

.person-node__photo {
  width: 40px;
  height: 40px;
  border-radius: 5px;
  flex-shrink: 0;
  object-fit: cover;
  background: #d0d8df;
}

.person-node__info { flex: 1; min-width: 0; }

.person-node__name {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1a2a34;
}

.person-node--pivot .person-node__name { color: #fff; }

.person-node__sub {
  font-size: 10px;
  color: #6a8a9a;
  margin-top: 1px;
}

.person-node--pivot .person-node__sub { color: rgba(255, 255, 255, 0.6); }

.person-node__badge {
  background: #e2f0f5;
  color: #4a8fa8;
  border-radius: 10px;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.person-node--pivot .person-node__badge {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
}

.person-node__edit {
  opacity: 0;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 11px;
  color: #aac0cc;
  padding: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.person-node--pivot .person-node__edit { color: rgba(255, 255, 255, 0.5); }

/* ── React Flow overrides ── */
.react-flow__attribution { display: none; }
.react-flow__handle {
  width: 6px;
  height: 6px;
  background: transparent;
  border: none;
}
```

- [ ] **Step 2: Write App.jsx**

Create `src/App.jsx`:
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TreeView from './components/TreeView'
import PersonPage from './components/PersonPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TreeView />} />
        <Route path="/person/:id" element={<PersonPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Update main.jsx**

Replace `src/main.jsx` with:
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 4: Create stub components so routing doesn't crash**

Create `src/components/TreeView.jsx`:
```jsx
export default function TreeView() {
  return <div style={{ color: '#fff', padding: 24 }}>Tree view — coming soon</div>
}
```

Create `src/components/PersonPage.jsx`:
```jsx
export default function PersonPage() {
  return <div style={{ color: '#fff', padding: 24 }}>Person page — coming soon</div>
}
```

- [ ] **Step 5: Confirm dev server renders without crash**

```bash
npm run dev
```
Open `http://localhost:5173`. Expected: teal background with "Tree view — coming soon" text. Navigate to `http://localhost:5173/person/test` — expected: "Person page — coming soon".

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: add global styles, routing, and component stubs"
```

---

## Task 6: PersonNode component

**Files:**
- Modify: `src/components/PersonNode.jsx` (replace stub with real component)

- [ ] **Step 1: Implement PersonNode**

Replace `src/components/PersonNode.jsx` with:
```jsx
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'

const PersonNode = memo(function PersonNode({ data }) {
  const { person, isPivot, onEdit } = data

  const photoUrl = person.photos[0]
    ? `/photos/${person.id}/${person.photos[0]}`
    : null

  const birthYear = person.birthDate?.match(/\d{4}/)?.[0] ?? '?'
  const deathYear = person.deathDate?.match(/\d{4}/)?.[0] ?? ''
  const yearRange = deathYear ? `${birthYear}–${deathYear}` : `${birthYear}–`

  return (
    <div className={`person-node${isPivot ? ' person-node--pivot' : ''}`}>
      {/* Handles for parent/child edges */}
      <Handle type="target" position={Position.Left}   id="parent-target" />
      <Handle type="source" position={Position.Right}  id="parent-source" />
      {/* Handles for spouse edges */}
      <Handle type="source" position={Position.Bottom} id="spouse-source" />
      <Handle type="target" position={Position.Top}    id="spouse-target" />

      {photoUrl
        ? <img src={photoUrl} alt={person.name} className="person-node__photo" />
        : <div className="person-node__photo" />
      }

      <div className="person-node__info">
        <div className="person-node__name">{person.name}</div>
        {isPivot ? (
          <>
            {person.birthDate && (
              <div className="person-node__sub">B: {person.birthDate}</div>
            )}
            {person.birthLocation && (
              <div className="person-node__sub">{person.birthLocation}</div>
            )}
          </>
        ) : (
          <div className="person-node__sub">{yearRange}</div>
        )}
      </div>

      <div className="person-node__badge">{person.photos.length}</div>

      <button
        className="person-node__edit"
        title="Preserve this memory"
        onClick={e => { e.stopPropagation(); onEdit?.(person.id) }}
      >
        ✏
      </button>
    </div>
  )
})

export default PersonNode
```

- [ ] **Step 2: Verify no crash in the browser**

The stub TreeView doesn't use PersonNode yet. Confirm `npm run dev` still shows the teal page without errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PersonNode.jsx
git commit -m "feat: add PersonNode custom React Flow node"
```

---

## Task 7: TreeView — assemble the React Flow tree

**Files:**
- Modify: `src/components/TreeView.jsx` (replace stub)
- Create: `src/components/EditModal.jsx` (stub — implemented fully in Task 10)

- [ ] **Step 1: Create an EditModal stub so TreeView can import it**

Create `src/components/EditModal.jsx`:
```jsx
export default function EditModal({ personId, onClose }) {
  if (!personId) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
    }}>
      <div style={{ background: '#243844', borderRadius: 10, padding: 24, color: '#fff' }}>
        <p>Edit modal — coming in Task 10</p>
        <button onClick={onClose} style={{ marginTop: 12 }}>Close</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement TreeView.jsx**

Replace `src/components/TreeView.jsx` with:
```jsx
import { useState, useEffect, useCallback } from 'react'
import { ReactFlow, useNodesState, useEdgesState, Controls } from '@xyflow/react'
import { useNavigate } from 'react-router-dom'
import '@xyflow/react/dist/style.css'
import PersonNode from './PersonNode'
import EditModal from './EditModal'
import { buildReactFlowGraph } from '../utils/treeLayout'
import { useFamilyData } from '../hooks/useFamilyData'
import { exportJson } from '../utils/exportJson'

const nodeTypes = { personNode: PersonNode }

const DEFAULT_PIVOT = 'kathryn-walker'

export default function TreeView() {
  const navigate = useNavigate()
  const { data, updatePerson } = useFamilyData()
  const [pivotId, setPivotId] = useState(DEFAULT_PIVOT)
  const [editingPersonId, setEditingPersonId] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    const graph = buildReactFlowGraph(data.people, data.relationships, pivotId)
    setNodes(graph.nodes.map(n => ({
      ...n,
      data: { ...n.data, onEdit: setEditingPersonId },
    })))
    setEdges(graph.edges)
  }, [data, pivotId])

  const handleNodeClick = useCallback((_, node) => {
    navigate(`/person/${node.id}`)
  }, [navigate])

  const handleContextMenu = useCallback((e, node) => {
    e.preventDefault()
    setPivotId(node.id)
  }, [])

  const editingPerson = data.people.find(p => p.id === editingPersonId) ?? null

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', pointerEvents: 'none',
      }}>
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 600, pointerEvents: 'none' }}>
          Walker Family Tree
        </span>
        <button
          style={{
            pointerEvents: 'all',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', borderRadius: 6, padding: '6px 14px',
            fontSize: 12, cursor: 'pointer',
          }}
          onClick={() => exportJson(data)}
        >
          Preserve changes → Export JSON
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleContextMenu}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        style={{ background: '#4a8fa8' }}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Controls showInteractive={false} />
      </ReactFlow>

      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.5)', fontSize: 11, pointerEvents: 'none',
      }}>
        Right-click any person to make them the centre of the tree
      </div>

      {editingPersonId && (
        <EditModal
          person={editingPerson}
          onSave={(changes) => {
            updatePerson(editingPersonId, changes)
            setEditingPersonId(null)
          }}
          onClose={() => setEditingPersonId(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify the tree renders in the browser**

```bash
npm run dev
```
Open `http://localhost:5173`. Expected: teal canvas with 7 Walker family nodes laid out left-to-right. Parent/child edges visible in white. Dashed golden line connecting Harold Walker and Kathryn Moore (spouse). Controls (zoom buttons) in the bottom-left.

Verify right-click on Harold Walker re-centers the tree on him (Kathryn Walker appears to the left as a descendant, Herman and Retha appear to the right as parents).

- [ ] **Step 4: Commit**

```bash
git add src/components/TreeView.jsx src/components/EditModal.jsx
git commit -m "feat: implement bi-directional React Flow tree with dagre layout"
```

---

## Task 8: PersonPage — bio section and photo grid

**Files:**
- Modify: `src/components/PersonPage.jsx` (replace stub)

- [ ] **Step 1: Implement PersonPage.jsx**

Replace `src/components/PersonPage.jsx` with:
```jsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFamilyData } from '../hooks/useFamilyData'
import PhotoLightbox from './PhotoLightbox'
import EditModal from './EditModal'

const PAGE_BG = '#1a2e38'
const CARD_BG = '#243844'

export default function PersonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, updatePerson } = useFamilyData()
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [editOpen, setEditOpen] = useState(false)

  const person = data.people.find(p => p.id === id)

  if (!person) {
    return (
      <div style={{ color: '#fff', padding: 40 }}>
        No record found for this person.{' '}
        <button onClick={() => navigate('/')} style={{ color: '#4a8fa8', background: 'none', border: 'none', cursor: 'pointer' }}>
          Return to tree
        </button>
      </div>
    )
  }

  const primaryPhoto = person.photos[0]
    ? `/photos/${person.id}/${person.photos[0]}`
    : null

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, color: '#fff', fontFamily: 'inherit' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.55)', borderRadius: 6, padding: '5px 12px',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          ← Family Tree
        </button>
        <span style={{ flex: 1, fontSize: 18, fontWeight: 600 }}>{person.name}</span>
        <button
          onClick={() => setEditOpen(true)}
          style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '5px 12px',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          ✏ Preserve their story
        </button>
      </div>

      {/* Bio section */}
      <div style={{
        display: 'flex', gap: 20, padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {primaryPhoto && (
          <img
            src={primaryPhoto}
            alt={person.name}
            style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {person.birthDate && (
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Birth Date</div>
                <div style={{ fontSize: 13 }}>{person.birthDate}</div>
              </div>
            )}
            {person.birthLocation && (
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Birth Location</div>
                <div style={{ fontSize: 13 }}>{person.birthLocation}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Photos</div>
              <div style={{ fontSize: 13 }}>{person.photos.length}</div>
            </div>
          </div>
          {person.notes && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, fontStyle: 'italic' }}>
              "{person.notes}"
            </div>
          )}
        </div>
      </div>

      {/* Photo grid */}
      <div style={{ padding: '14px 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Their photographs</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{person.photos.length} photos</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, padding: '0 3px 24px',
      }}>
        {person.photos.map((filename, idx) => {
          const url = `/photos/${person.id}/${filename}`
          return (
            <div
              key={filename}
              onClick={() => setLightboxPhoto(url)}
              style={{
                aspectRatio: '1', background: '#2a3e4a', borderRadius: 4,
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
              }}
            >
              <img
                src={url}
                alt={`${person.name} photo ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {idx === 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 5,
                  fontSize: 11, color: '#f0c040',
                }}>★</span>
              )}
            </div>
          )
        })}
      </div>

      {lightboxPhoto && (
        <PhotoLightbox src={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
      )}

      {editOpen && (
        <EditModal
          person={person}
          onSave={(changes) => {
            updatePerson(person.id, changes)
            setEditOpen(false)
          }}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify person page renders**

Open `http://localhost:5173`. Click on Kathryn Walker. Expected: person page showing her name, birth date, birth location, and one placeholder photo in the grid.

- [ ] **Step 3: Commit**

```bash
git add src/components/PersonPage.jsx
git commit -m "feat: implement person page with bio section and photo grid"
```

---

## Task 9: PhotoLightbox — full-screen photo overlay

**Files:**
- Create: `src/components/PhotoLightbox.jsx`

- [ ] **Step 1: Implement PhotoLightbox.jsx**

Create `src/components/PhotoLightbox.jsx`:
```jsx
import { useEffect } from 'react'

export default function PhotoLightbox({ src, onClose }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 20,
          background: 'none', border: 'none', color: '#fff',
          fontSize: 28, cursor: 'pointer', lineHeight: 1,
        }}
        aria-label="Close"
      >
        ×
      </button>
      <img
        src={src}
        alt=""
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '90vh',
          objectFit: 'contain', borderRadius: 4,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify lightbox opens and closes**

On the person page, click a photo. Expected: dark full-screen overlay with the placeholder image centered and a × button. Click × or press Escape to close. Clicking outside the image also closes it.

- [ ] **Step 3: Commit**

```bash
git add src/components/PhotoLightbox.jsx
git commit -m "feat: add photo lightbox with Escape key support"
```

---

## Task 10: EditModal — form fields, localStorage, export

**Files:**
- Modify: `src/components/EditModal.jsx` (replace stub with real implementation)

- [ ] **Step 1: Implement EditModal.jsx**

Replace `src/components/EditModal.jsx` with:
```jsx
import { useState } from 'react'

export default function EditModal({ person, onSave, onClose }) {
  const [birthDate, setBirthDate]       = useState(person?.birthDate     ?? '')
  const [birthLocation, setBirthLocation] = useState(person?.birthLocation ?? '')
  const [notes, setNotes]               = useState(person?.notes         ?? '')

  if (!person) return null

  function handleSave() {
    onSave({ birthDate, birthLocation, notes })
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6, padding: '8px 10px',
    fontSize: 13, color: '#fff', fontFamily: 'inherit', width: '100%',
  }
  const labelStyle = {
    fontSize: 11, color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'block', marginBottom: 4,
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 20,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#243844', borderRadius: 10,
          padding: '20px 24px', width: 340,
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
          {person.name}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Birth Date</label>
          <input
            style={inputStyle}
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
            placeholder="e.g. 5 Nov 1969"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Birth Location</label>
          <input
            style={inputStyle}
            value={birthLocation}
            onChange={e => setBirthLocation(e.target.value)}
            placeholder="e.g. Los Angeles, California"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Their story</label>
          <textarea
            style={{ ...inputStyle, resize: 'none', height: 72, lineHeight: 1.4 }}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="A few words about this person's life…"
          />
        </div>

        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 16, lineHeight: 1.5,
        }}>
          <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Note:</strong> Changes are saved in
          your browser. To preserve them permanently, click{' '}
          <em>Preserve changes → Export JSON</em> on the tree page and commit the downloaded file to the repo.
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px', borderRadius: 6, fontSize: 12,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '7px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: '#4a8fa8', border: 'none', color: '#fff', cursor: 'pointer',
            }}
          >
            Preserve this memory
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the full edit flow**

1. On the tree page, hover over any node — the ✏ icon appears.
2. Click ✏ — the edit modal opens pre-filled with the person's current data.
3. Edit the birth date to something new. Click "Preserve this memory".
4. Modal closes. The node updates immediately (localStorage is applied).
5. Refresh the page — the edited value is still shown (merged from localStorage).
6. Click "Preserve changes → Export JSON" — a `family.json` file downloads.
7. Open the downloaded file — confirm the edited person's birthDate is updated.

- [ ] **Step 3: Verify edit modal on person page**

Click any node → navigate to person page. Click "Preserve their story" → modal opens, edits persist.

- [ ] **Step 4: Run the full test suite**

```bash
npx vitest run
```
Expected: all tests PASS. Check for any regressions.

- [ ] **Step 5: Final commit**

```bash
git add src/components/EditModal.jsx
git commit -m "feat: implement edit modal with localStorage persistence and JSON export"
```

---

## Self-Review

**Spec coverage check:**
- [x] Bi-directional tree with dagre — Task 7
- [x] Right-click pivot — Task 7 (`onNodeContextMenu`)
- [x] 3-generation depth filter — Task 3 (`filterByDepth`)
- [x] Teal background — Task 5 (`index.css`, ReactFlow `style` prop)
- [x] Custom PersonNode (pivot + default styles) — Task 6
- [x] Spouse edges (dashed golden) — Task 3 (`buildReactFlowGraph`)
- [x] Person page with bio, photo grid, primary photo star — Task 8
- [x] Lightbox with Escape key — Task 9
- [x] Edit modal (birth date, location, notes) — Task 10
- [x] localStorage persistence + Export JSON — Tasks 4, 10
- [x] family_id in data model — Task 2
- [x] Copy/tone rules — applied in Task 7 ("Preserve changes → Export JSON"), Task 8 ("Preserve their story", "Their photographs"), Task 10 ("Preserve this memory", "Their story")
- [x] Placeholder photos per person folder — Task 2
- [x] `useFamilyData` hook with localStorage merge — Task 4
- [x] Walker family prototype data — Task 2

**One gap noted:** The spec mentions a dashed vertical line below the subject node as a visual cue that the tree can extend further back. This is a decorative element that React Flow doesn't support natively. It is omitted — the prototype demonstrates the concept via the right-click pivot mechanism instead, and adding the decorative line would require a custom SVG overlay that adds complexity without functional value.
