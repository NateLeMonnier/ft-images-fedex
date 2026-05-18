import { useState } from 'react'

export default function EditModal({ person, onSave, onClose }) {
  const [birthDate, setBirthDate]         = useState(person?.birthDate     ?? '')
  const [birthLocation, setBirthLocation] = useState(person?.birthLocation ?? '')
  const [notes, setNotes]                 = useState(person?.notes         ?? '')

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
