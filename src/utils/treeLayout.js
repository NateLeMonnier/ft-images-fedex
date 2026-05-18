import { Position } from '@xyflow/react'

const DEFAULT_WIDTH = 190
const NODE_HEIGHT = 80
const HALF_COUPLE = 48     // vertical offset: male above center, female below
const SLOT_HEIGHT = 220    // vertical space per leaf couple — must exceed 2*HALF_COUPLE + NODE_HEIGHT
const COL_WIDTH = 300
const CHILD_X_OFFSET = -300
const CHILD_SPACING = 100
const PIVOT_SPOUSE_GAP = 88

// ─── Bloodline helpers ─────────────────────────────────────────────────────

function buildBloodline(people, relationships, pivotId, maxDepth) {
  const gen = new Map([[pivotId, 0]])
  const queue = [{ id: pivotId, g: 0 }]
  while (queue.length) {
    const { id, g } = queue.shift()
    if (g >= maxDepth) continue
    for (const r of relationships) {
      if (r.type === 'parent' && r.personBId === id && !gen.has(r.personAId)) {
        gen.set(r.personAId, g + 1)
        queue.push({ id: r.personAId, g: g + 1 })
      }
    }
  }
  return gen
}

function getPivotChildren(relationships, pivotId) {
  return relationships
    .filter(r => r.type === 'parent' && r.personAId === pivotId)
    .map(r => r.personBId)
}

function getPivotSpouses(relationships, pivotId, childIds) {
  const childParents = new Set()
  for (const childId of childIds) {
    for (const r of relationships) {
      if (r.type === 'parent' && r.personBId === childId && r.personAId !== pivotId) {
        childParents.add(r.personAId)
      }
    }
  }
  const spouses = []
  for (const r of relationships) {
    if (r.type !== 'spouse') continue
    const other = r.personAId === pivotId ? r.personBId
      : r.personBId === pivotId ? r.personAId : null
    if (other) spouses.push(other)
  }
  // First spouse = current; keep exes only if they are a bloodline parent of a child
  return spouses.filter((id, i) => i === 0 || childParents.has(id))
}

// ─── Couple-unit layout ────────────────────────────────────────────────────
// Each bloodline generation is divided into "couple units": a male+female pair
// connected by a spouse relationship, both in the bloodline.
// Couple centers are computed bottom-up (leaves get sequential slots; inner
// nodes center over their children's couples).

function buildCoupleUnits(bloodlineGen, relationships, peopleById) {
  const paired = new Set()
  const couples = []

  for (const r of relationships) {
    if (r.type !== 'spouse') continue
    const { personAId: aId, personBId: bId } = r
    if (!bloodlineGen.has(aId) || !bloodlineGen.has(bId)) continue
    if (paired.has(aId) || paired.has(bId)) continue

    const a = peopleById.get(aId)
    const b = peopleById.get(bId)
    if (!a || !b) continue

    const isBMale = b.gender === 'male'
    const male = isBMale ? bId : aId
    const female = isBMale ? aId : bId
    const g = bloodlineGen.get(aId)
    couples.push({ male, female, gen: g })
    paired.add(aId)
    paired.add(bId)
  }

  // Solo bloodline nodes (no bloodline spouse)
  for (const [id, g] of bloodlineGen) {
    if (paired.has(id)) continue
    const p = peopleById.get(id)
    couples.push({
      male: p?.gender !== 'female' ? id : null,
      female: p?.gender === 'female' ? id : null,
      gen: g,
    })
    paired.add(id)
  }

  return couples
}

// For a given couple, find the parent couples (at gen+1)
function parentCouplesOf(couple, allCouples, relationships, bloodlineGen) {
  const found = new Set()
  for (const memberId of [couple.male, couple.female].filter(Boolean)) {
    for (const r of relationships) {
      if (r.type !== 'parent' || r.personBId !== memberId) continue
      const parentId = r.personAId
      if (!bloodlineGen.has(parentId)) continue
      const pc = allCouples.find(c => c.male === parentId || c.female === parentId)
      if (pc) found.add(pc)
    }
  }
  return [...found]
}

function assignCoupleCenters(couples, relationships, bloodlineGen, pivotId) {
  const centerMap = new Map()
  let nextSlot = 0

  function center(couple) {
    if (centerMap.has(couple)) return centerMap.get(couple)
    const parents = parentCouplesOf(couple, couples, relationships, bloodlineGen)
    if (parents.length === 0) {
      const c = nextSlot++ * SLOT_HEIGHT
      centerMap.set(couple, c)
      return c
    }
    const c = parents.map(center).reduce((a, b) => a + b, 0) / parents.length
    centerMap.set(couple, c)
    return c
  }

  // Process deepest generation first to assign leaf slots before computing inner nodes
  const sorted = [...couples]
    .filter(c => c.male !== pivotId && c.female !== pivotId)
    .sort((a, b) => b.gen - a.gen)
  for (const c of sorted) center(c)

  return centerMap
}

// ─── Public API ───────────────────────────────────────────────────────────

export function filterByDepth(people, relationships, pivotId, maxAncestorDepth = 3, maxDescendantDepth = 1) {
  const bloodlineGen = buildBloodline(people, relationships, pivotId, maxAncestorDepth)
  const childIds = getPivotChildren(relationships, pivotId)
  const pivotSpouses = getPivotSpouses(relationships, pivotId, childIds)
  const visibleIds = new Set([...bloodlineGen.keys(), ...childIds, ...pivotSpouses])
  return people.filter(p => visibleIds.has(p.id))
}

export function buildReactFlowGraph(people, relationships, pivotId, maxAncestorDepth = 3, maxDescendantDepth = 1) {
  const peopleById = new Map(people.map(p => [p.id, p]))

  const bloodlineGen = buildBloodline(people, relationships, pivotId, maxAncestorDepth)
  const childIds = getPivotChildren(relationships, pivotId)
  const pivotSpouses = getPivotSpouses(relationships, pivotId, childIds)

  const couples = buildCoupleUnits(bloodlineGen, relationships, peopleById)
  const centerMap = assignCoupleCenters(couples, relationships, bloodlineGen, pivotId)

  // Build id→y from couple centers
  const yById = new Map()
  for (const couple of couples) {
    if (couple.male === pivotId || couple.female === pivotId) continue
    const c = centerMap.get(couple) ?? 0
    if (couple.male) yById.set(couple.male, c - HALF_COUPLE)
    if (couple.female) yById.set(couple.female, c + HALF_COUPLE)
  }

  // Pivot y: center of gen-1 couple (if exists), else 0
  const gen1Couple = couples.find(c => c.gen === 1)
  const pivotY = gen1Couple ? (centerMap.get(gen1Couple) ?? 0) : 0
  yById.set(pivotId, pivotY)

  const nodes = []
  const edges = []

  function addNode(id, x, y, isPivot = false) {
    const person = peopleById.get(id)
    if (!person) return
    const width = DEFAULT_WIDTH
    nodes.push({
      id,
      type: 'personNode',
      position: { x: x - width / 2, y: y - NODE_HEIGHT / 2 },
      data: { person, isPivot },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    })
  }

  // Pivot
  addNode(pivotId, 0, pivotY, true)

  // Pivot spouses stacked below
  pivotSpouses.forEach((spouseId, i) => {
    const y = pivotY + PIVOT_SPOUSE_GAP * (i + 1)
    addNode(spouseId, 0, y)
    edges.push({
      id: `pivot-spouse-${spouseId}`,
      source: pivotId,
      target: spouseId,
      type: 'straight',
      sourceHandle: 'spouse-source',
      targetHandle: 'spouse-target',
      style: {
        stroke: '#A43032',
        strokeWidth: 1.5,
      },
    })
  })

  // Bloodline ancestor nodes
  for (const couple of couples) {
    if (couple.male === pivotId || couple.female === pivotId) continue
    const c = centerMap.get(couple) ?? 0
    const x = couple.gen * COL_WIDTH
    if (couple.male) addNode(couple.male, x, c - HALF_COUPLE)
    if (couple.female) addNode(couple.female, x, c + HALF_COUPLE)

    if (couple.male && couple.female) {
      edges.push({
        id: `spouse-${couple.male}-${couple.female}`,
        source: couple.male,
        target: couple.female,
        type: 'straight',
        sourceHandle: 'spouse-source',
        targetHandle: 'spouse-target',
        style: { stroke: '#A43032', strokeWidth: 1.5 },
      })
    }
  }

  // Children stacked to the left of pivot
  const totalH = (childIds.length - 1) * CHILD_SPACING
  childIds.forEach((childId, i) => {
    const y = pivotY - totalH / 2 + i * CHILD_SPACING
    addNode(childId, CHILD_X_OFFSET, y)
  })

  // Parent edges (child → parent, right handle → left handle)
  const nodeIds = new Set(nodes.map(n => n.id))
  const edgeIds = new Set()
  for (const r of relationships) {
    if (r.type !== 'parent') continue
    const src = r.personBId  // child
    const tgt = r.personAId  // parent
    if (!nodeIds.has(src) || !nodeIds.has(tgt)) continue
    const eid = `parent-${src}-${tgt}`
    if (edgeIds.has(eid)) continue
    edgeIds.add(eid)
    edges.push({
      id: eid,
      source: src,
      target: tgt,
      type: 'bracket',
      sourceHandle: 'parent-source',
      targetHandle: 'parent-target',
      style: { stroke: '#C9C2B5', strokeWidth: 0.5 },
    })
  }

  const pivotNode = nodes.find(n => n.id === pivotId)
  const pivotCenter = pivotNode
    ? { x: pivotNode.position.x + DEFAULT_WIDTH / 2, y: pivotNode.position.y + NODE_HEIGHT / 2 }
    : { x: 0, y: 0 }

  return { nodes, edges, pivotCenter }
}
