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
        <div className="person-node__sub">{yearRange}</div>
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
