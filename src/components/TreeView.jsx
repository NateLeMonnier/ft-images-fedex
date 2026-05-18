import { useState, useEffect, useCallback, useRef } from 'react'
import { ReactFlow, useNodesState, useEdgesState, Controls, useReactFlow } from '@xyflow/react'
import { useNavigate } from 'react-router-dom'
import '@xyflow/react/dist/style.css'
import PersonNode from './PersonNode'
import EditModal from './EditModal'
import { buildReactFlowGraph } from '../utils/treeLayout'
import { useFamilyData } from '../hooks/useFamilyData'
import { exportJson } from '../utils/exportJson'

const nodeTypes = { personNode: PersonNode }

const DEFAULT_PIVOT = 'kathryn-walker'

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
  const { data, updatePerson } = useFamilyData()
  const [pivotId, setPivotId] = useState(DEFAULT_PIVOT)
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
        style={{ background: '#4a8fa8' }}
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
