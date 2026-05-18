export default function EditModal({ personId, onClose }) {
  if (!personId) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
    }}>
      <div style={{ background: '#243844', borderRadius: 10, padding: 24, color: '#fff' }}>
        <p>Edit modal — coming in Task 10</p>
        <button onClick={onClose} style={{ marginTop: 12 }}>Close</button>
      </div>
    </div>
  )
}
