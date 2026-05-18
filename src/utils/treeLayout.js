import * as dagre from '@dagrejs/dagre'
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
