import { useState, useEffect, useCallback, useRef } from 'react'
import { ReactFlow, useNodesState, useEdgesState, Controls, useReactFlow } from '@xyflow/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import '@xyflow/react/dist/style.css'
import PersonNode from './PersonNode'
import EditModal from './EditModal'
import { buildReactFlowGraph } from '../utils/treeLayout'
import { useFamilyData } from '../hooks/useFamilyData'
import { exportJson } from '../utils/exportJson'

// Bracket edge: horizontal from source → vertical at 75% x → horizontal to target.
// Multiple edges from the same source share the horizontal run; they branch at the same x.
function BracketEdge({ id, sourceX, sourceY, targetX, targetY, style }) {
  const breakX = sourceX + (targetX - sourceX) * 0.75
  const d = `M ${sourceX},${sourceY} H ${breakX} V ${targetY} H ${targetX}`
  return <path id={id} d={d} style={{ ...style, fill: 'none' }} className="react-flow__edge-path" />
}

const nodeTypes = { personNode: PersonNode }
const edgeTypes = { bracket: BracketEdge }

const DEFAULT_PIVOT = 'laryn-david-brown'

// Two-phase pivot transition:
//   Phase 1 (pendingTransition set): pan smoothly to the clicked node's current
//     canvas position while the old tree is still rendered (~420ms).
//   At T=440ms: instant viewport reposition to the pre-computed new layout center,
//     then trigger the rebuild. The new tree appears already centered — no jump.
//   Initial mount uses pivotCenter state with a full 450ms ease-in.
function PivotFitter({ pivotCenter, pendingTransition, onTransitionComplete }) {
  const { setCenter } = useReactFlow()
  const suppressNextPivotCenter = useRef(false)

  // Phase 1 + instant reposition at the transition point
  useEffect(() => {
    if (!pendingTransition) return
    setCenter(pendingTransition.cx, pendingTransition.cy, { zoom: 1, duration: 420 })
    const timer = setTimeout(() => {
      // Pre-position viewport at the new layout's pivot center before the rebuild renders
      suppressNextPivotCenter.current = true
      setCenter(pendingTransition.newPivotCenter.x, pendingTransition.newPivotCenter.y, { zoom: 1, duration: 0 })
      onTransitionComplete(pendingTransition.nextPivotId)
    }, 440)
    return () => clearTimeout(timer)
  }, [pendingTransition, setCenter, onTransitionComplete])

  // Initial mount centering (suppressed after a transition so the instant
  // reposition above isn't overwritten by a 450ms animation)
  useEffect(() => {
    if (!pivotCenter) return
    if (suppressNextPivotCenter.current) {
      suppressNextPivotCenter.current = false
      return
    }
    requestAnimationFrame(() => {
      setCenter(pivotCenter.x, pivotCenter.y, { zoom: 1, duration: 450 })
    })
  }, [pivotCenter, setCenter])

  return null
}

export default function TreeView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data, updatePerson } = useFamilyData()
  const [pivotId, setPivotId] = useState(() => searchParams.get('pivot') ?? DEFAULT_PIVOT)
  const [pivotCenter, setPivotCenter] = useState(null)
  const [pendingTransition, setPendingTransition] = useState(null)
  const [editingPersonId, setEditingPersonId] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Rebuild graph whenever data or pivot changes
  useEffect(() => {
    const graph = buildReactFlowGraph(data.people, data.relationships, pivotId)
    setNodes(graph.nodes.map(n => ({
      ...n,
      data: { ...n.data, onEdit: setEditingPersonId },
    })))
    setEdges(graph.edges)
  }, [data, pivotId])

  // Compute pivot center for initial mount centering — only on pivot change, not data edits
  useEffect(() => {
    const graph = buildReactFlowGraph(data.people, data.relationships, pivotId)
    setPivotCenter(graph.pivotCenter)
  }, [pivotId])

  const handleNodeClick = useCallback((_, node) => {
    navigate(`/person/${node.id}`)
  }, [navigate])

  // Phase 1: pre-compute the new layout center, then slide to the node's
  // current position. At T=440ms PivotFitter will instant-reposition and rebuild.
  const handleContextMenu = useCallback((e, node) => {
    e.preventDefault()
    if (node.id === pivotId) return
    const w = node.measured?.width ?? 190
    const h = node.measured?.height ?? 64
    const newGraph = buildReactFlowGraph(data.people, data.relationships, node.id)
    setPendingTransition({
      cx: node.position.x + w / 2,
      cy: node.position.y + h / 2,
      nextPivotId: node.id,
      newPivotCenter: newGraph.pivotCenter,
    })
  }, [pivotId, data])

  const handleTransitionComplete = useCallback((nextPivotId) => {
    setPendingTransition(null)
    setPivotId(nextPivotId)
  }, [])

  const editingPerson = data.people.find(p => p.id === editingPersonId) ?? null

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Export button */}
      <div style={{
        position: 'absolute', top: 12, right: 16, zIndex: 5,
      }}>
        <button
          style={{
            background: '#fff',
            border: '0.5px solid #E5E1D9',
            color: '#4A413A', borderRadius: 16, padding: '6px 14px',
            fontSize: 11, cursor: 'pointer',
            fontFamily: 'Inter, Helvetica, Arial, sans-serif',
            boxShadow: '0 1px 4px rgba(74,65,58,0.08)',
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
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleContextMenu}
        style={{ background: '#ffffff' }}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <PivotFitter
          pivotCenter={pivotCenter}
          pendingTransition={pendingTransition}
          onTransitionComplete={handleTransitionComplete}
        />
        <Controls showInteractive={false} />
      </ReactFlow>

      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        color: '#8B8580', fontSize: 11, pointerEvents: 'none',
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
