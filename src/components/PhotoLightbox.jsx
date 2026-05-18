import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PhotoLightbox({ src, onClose, taggedPeople = [] }) {
  const navigate = useNavigate()

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handlePersonClick(e, personId) {
    e.stopPropagation()
    onClose()
    navigate(`/person/${personId}`)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 20,
          background: 'none', border: 'none', color: '#fff',
          fontSize: 28, cursor: 'pointer', lineHeight: 1,
        }}
        aria-label="Close"
      >
        ×
      </button>

      <img
        src={src}
        alt=""
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: taggedPeople.length > 0 ? '78vh' : '90vh',
          objectFit: 'contain', borderRadius: 4,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
      />

      {taggedPeople.length > 0 && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            marginTop: 16,
            display: 'flex', gap: 14, alignItems: 'center',
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 10,
            maxWidth: '90vw', overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
            In this photo
          </span>
          {taggedPeople.map(person => {
            const photoUrl = person.photos[0]
              ? `/photos/${person.id}/${person.photos[0]}`
              : null
            return (
              <button
                key={person.id}
                onClick={e => handlePersonClick(e, person.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#fff', padding: 0,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  overflow: 'hidden', background: '#2a3e4a',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                }}>
                  {photoUrl && (
                    <img
                      src={photoUrl}
                      alt={person.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
                  {person.name.split(' ')[0]}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
