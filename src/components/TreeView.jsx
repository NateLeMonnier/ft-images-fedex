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
