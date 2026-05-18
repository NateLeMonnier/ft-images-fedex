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
        background: 'rgba(74,65,58,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 24,
          maxWidth: '80vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflowY: 'auto',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 16,
            background: 'none', border: 'none',
            color: '#8B8580', fontSize: 20, cursor: 'pointer', lineHeight: 1,
          }}
          aria-label="Close"
        >
          ×
        </button>

        <img
          src={src}
          alt=""
          style={{
            maxWidth: '100%',
            maxHeight: '70vh',
            objectFit: 'contain',
            display: 'block',
            boxShadow: '0 2px 12px rgba(74,65,58,0.12)',
          }}
        />

        {/* Caption block — date · location and caption text slot in here when data model supports it */}

        {taggedPeople.length > 0 && (
          <div style={{
            marginTop: 16,
            borderTop: '0.5px solid #E5E1D9',
            paddingTop: 12,
          }}>
            <span style={{
              fontFamily: 'Georgia, serif',
              fontSize: 10,
              color: '#8B8580',
              display: 'block',
              marginBottom: 4,
            }}>
              People in this photo
            </span>
            <div>
              {taggedPeople.map((person, i) => (
                <span key={person.id}>
                  <button
                    onClick={e => handlePersonClick(e, person.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'Georgia, serif',
                      fontSize: 10,
                      color: '#A43032',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    {person.name}
                  </button>
                  {i < taggedPeople.length - 1 && (
                    <span style={{ color: '#8B8580', fontSize: 10, fontFamily: 'Georgia, serif' }}>, </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
