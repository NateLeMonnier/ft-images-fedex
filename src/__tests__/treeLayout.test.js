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

  it('excludes grandchildren when maxDescendantDepth is 1', () => {
    // grandparent → parent-a → child: child is 2 descendant hops from grandparent
    const result = filterByDepth(people, relationships, 'grandparent', 3, 1)
    const ids = result.map(p => p.id)
    expect(ids).toContain('parent-a')   // 1 descendant hop — included
    expect(ids).not.toContain('child')  // 2 descendant hops — excluded
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
