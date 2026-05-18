import { useState, useEffect, useCallback } from 'react'
import { ReactFlow, useNodesState, useEdgesState, Controls, useReactFlow } from '@xyflow/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import '@xyflow/react/dist/style.css'
import PersonNode from './PersonNode'
import EditModal from './EditModal'
import { buildReactFlowGraph } from '../utils/treeLayout'
import { useFamilyData } from '../hooks/useFamilyData'
import { exportJson } from '../utils/exportJson'

function BracketEdge({ id, sourceX, sourceY, targetX, targetY, style }) {
  const breakX = sourceX + (targetX - sourceX) * 0.75
  const d = `M ${sourceX},${sourceY} H ${breakX} V ${targetY} H ${targetX}`
  return <path id={id} d={d} style={{ ...style, fill: 'none' }} className="react-flow__edge-path" />
}

const nodeTypes = { personNode: PersonNode }
const edgeTypes = { bracket: BracketEdge }

const DEFAULT_PIVOT = 'laryn-david-brown'

// Smooth pan to pivotCenter whenever it changes.
function PivotFitter({ pivotCenter }) {
  const { setCenter } = useReactFlow()

  useEffect(() => {
    if (!pivotCenter) return
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
  const [editingPersonId, setEditingPersonId] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Rebuild graph only when underlying data changes, not when pivot changes.
  useEffect(() => {
    const graph = buildReactFlowGraph(data.people, data.relationships, pivotId)
    setNodes(graph.nodes.map(n => ({
      ...n,
      data: { ...n.data, onEdit: setEditingPersonId },
    })))
    setEdges(graph.edges)
    setPivotCenter(graph.pivotCenter)
  }, [data])

  // When pivot changes, update the highlight on nodes and pan — no rebuild.
  useEffect(() => {
    setNodes(prev => prev.map(n => ({
      ...n,
      data: { ...n.data, isPivot: n.id === pivotId },
    })))
  }, [pivotId])

  const handleNodeClick = useCallback((_, node) => {
    navigate(`/person/${node.id}`)
  }, [navigate])

  // Right-click: move the pivot highlight and pan to that node. Tree stays intact.
  const handleContextMenu = useCallback((e, node) => {
    e.preventDefault()
    if (node.id === pivotId) return
    const w = node.measured?.width ?? 190
    const h = node.measured?.height ?? 80
    setPivotId(node.id)
    setPivotCenter({ x: node.position.x + w / 2, y: node.position.y + h / 2 })
  }, [pivotId])

  const editingPerson = data.people.find(p => p.id === editingPersonId) ?? null

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 12, right: 16, zIndex: 5 }}>
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
        <PivotFitter pivotCenter={pivotCenter} />
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
