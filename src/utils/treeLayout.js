import { graphlib, layout } from '@dagrejs/dagre'
import { Position } from '@xyflow/react'

const PIVOT_WIDTH = 220
const DEFAULT_WIDTH = 190
const NODE_HEIGHT = 64

/**
 * BFS from pivotId through parent and child relationships.
 * Ancestor hops (up) and descendant hops (down) are counted separately.
 * Spouse links carry the same hop counts as the node they connect to.
 * Downward traversal is blocked once we've gone up into ancestor territory.
 */
export function filterByDepth(people, relationships, pivotId, maxAncestorDepth = 3, maxDescendantDepth = 1) {
  const visited = new Map([[pivotId, { aHops: 0, dHops: 0 }]])
  const queue = [{ id: pivotId, aHops: 0, dHops: 0 }]

  while (queue.length > 0) {
    const { id, aHops, dHops } = queue.shift()

    for (const rel of relationships) {
      if (rel.type === 'parent') {
        // Traverse up: child → parent (ancestor direction)
        if (rel.personBId === id) {
          const next = { aHops: aHops + 1, dHops }
          if (!visited.has(rel.personAId) && next.aHops <= maxAncestorDepth) {
            visited.set(rel.personAId, next)
            queue.push({ id: rel.personAId, ...next })
          }
        }
        // Traverse down: parent → child (descendant direction)
        // Blocked from ancestor nodes to avoid showing aunts/uncles/cousins
        if (rel.personAId === id && aHops === 0) {
          const next = { aHops: 0, dHops: dHops + 1 }
          if (!visited.has(rel.personBId) && next.dHops <= maxDescendantDepth) {
            visited.set(rel.personBId, next)
            queue.push({ id: rel.personBId, ...next })
          }
        }
      }

      if (rel.type === 'spouse') {
        const other =
          rel.personAId === id ? rel.personBId :
          rel.personBId === id ? rel.personAId :
          null
        if (other && !visited.has(other)) {
          visited.set(other, { aHops, dHops })
          queue.push({ id: other, aHops, dHops })
        }
      }
    }
  }

  return people.filter(p => visited.has(p.id))
}

// Post-process dagre positions so males always appear above females in the same rank.
// Groups nodes by their family cluster (shared child) before sorting to avoid edge crossings.
function enforceGenderOrdering(g, visible, relationships) {
  const visibleIds = new Set(visible.map(p => p.id))

  // Group visible nodes by x-rank (same column in LR layout)
  const rankMap = new Map()
  visible.forEach(p => {
    const rx = Math.round(g.node(p.id).x)
    if (!rankMap.has(rx)) rankMap.set(rx, [])
    rankMap.get(rx).push(p)
  })

  rankMap.forEach(group => {
    if (group.length <= 1) return

    // Anchor each node to the average y of its visible children.
    // Nodes sharing the same anchor are in the same family cluster.
    const anchorY = new Map(group.map(p => {
      const childYs = relationships
        .filter(r => r.type === 'parent' && r.personAId === p.id && visibleIds.has(r.personBId))
        .map(r => g.node(r.personBId).y)
      const anchor = childYs.length > 0
        ? childYs.reduce((a, b) => a + b, 0) / childYs.length
        : g.node(p.id).y
      return [p.id, anchor]
    }))

    // Collect current y-values sorted ascending
    const sortedYs = group.map(p => g.node(p.id).y).sort((a, b) => a - b)

    // Sort group: primary by family anchor y (keeps parent clusters together),
    // secondary by gender (male = lower y, female = higher y)
    const genderRank = g => g === 'male' ? 0 : 1
    group.sort((a, b) => {
      const anchorDiff = anchorY.get(a.id) - anchorY.get(b.id)
      if (Math.abs(anchorDiff) > 1) return anchorDiff
      return genderRank(a.gender) - genderRank(b.gender)
    })

    // Assign sorted y-values back
    group.forEach((p, i) => {
      const n = g.node(p.id)
      g.setNode(p.id, { ...n, y: sortedYs[i] })
    })
  })
}

/**
 * Build React Flow nodes and edges with dagre LR layout.
 * Edge direction: child → parent so ancestors appear to the right.
 * Spouse edges are excluded from dagre but included as React Flow edges.
 * Returns { nodes, edges, pivotCenter } where pivotCenter is the pivot node's
 * center in React Flow coordinate space (used for viewport centering).
 */
export function buildReactFlowGraph(people, relationships, pivotId, maxAncestorDepth = 3, maxDescendantDepth = 1) {
  const visible = filterByDepth(people, relationships, pivotId, maxAncestorDepth, maxDescendantDepth)
  const visibleIds = new Set(visible.map(p => p.id))

  const parentRels = relationships.filter(
    r => r.type === 'parent' && visibleIds.has(r.personAId) && visibleIds.has(r.personBId)
  )
  const spouseRels = relationships.filter(
    r => r.type === 'spouse' && visibleIds.has(r.personAId) && visibleIds.has(r.personBId)
  )

  const g = new graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 24, ranksep: 64 })

  visible.forEach(p => {
    g.setNode(p.id, { width: p.id === pivotId ? PIVOT_WIDTH : DEFAULT_WIDTH, height: NODE_HEIGHT })
  })

  // source = child (personBId), target = parent (personAId) → parents appear to the right
  parentRels.forEach(r => g.setEdge(r.personBId, r.personAId))

  layout(g)

  // Enforce: males always appear above females within each family cluster
  enforceGenderOrdering(g, visible, relationships)

  const { x: pivotDagreX, y: pivotDagreY } = g.node(pivotId)

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

  return {
    nodes,
    edges: [...parentEdges, ...spouseEdges],
    pivotCenter: { x: pivotDagreX, y: pivotDagreY },
  }
}
