import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const COLORS = {
  brownRed: '#A43032',
  olive: '#828700',
  warmDark: '#4A413A',
  warmGray: '#8B8580',
  border: '#E5E1D9',
  photoPlaceholder: '#F3F1EC',
}

const FONT = {
  heading: "'Playfair Display', Georgia, serif",
  body: "Georgia, 'Times New Roman', serif",
  ui: "Inter, Helvetica, Arial, sans-serif",
}

const inputStyle = {
  fontFamily: FONT.body,
  fontSize: 12,
  color: COLORS.warmDark,
  background: COLORS.photoPlaceholder,
  border: `0.5px solid ${COLORS.border}`,
  borderRadius: 4,
  padding: '6px 8px',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  fontFamily: FONT.ui,
  fontSize: 10,
  color: COLORS.warmGray,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 3,
  display: 'block',
}

export default function PhotoLightbox({
  src,
  onClose,
  taggedPeople = [],
  onSetProfile,
  isProfile,
  metadata,
  photoIndex,
  photoCount,
  onPrev,
  onNext,
  onUpdateMetadata,
}) {
  const navigate = useNavigate()

  const [date, setDate] = useState(metadata?.date || '')
  const [location, setLocation] = useState(metadata?.location || '')
  const [description, setDescription] = useState(metadata?.description || '')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDate(metadata?.date || '')
    setLocation(metadata?.location || '')
    setDescription(metadata?.description || '')
    setSaved(false)
  }, [metadata?.date, metadata?.location, metadata?.description])

  const hasChanges =
    date !== (metadata?.date || '') ||
    location !== (metadata?.location || '') ||
    description !== (metadata?.description || '')

  function handleSave() {
    if (!onUpdateMetadata) return
    onUpdateMetadata({
      date: date || null,
      location: location || null,
      description: description || null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && onPrev) onPrev()
      if (e.key === 'ArrowRight' && onNext) onNext()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, onPrev, onNext])

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
          width: 640,
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
            color: COLORS.warmGray, fontSize: 20, cursor: 'pointer', lineHeight: 1,
          }}
          aria-label="Close"
        >
          &times;
        </button>

        <img
          src={src}
          alt=""
          style={{
            maxWidth: '100%',
            maxHeight: '55vh',
            objectFit: 'contain',
            display: 'block',
          }}
        />

        {/* Editable caption fields */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Date</label>
              <input
                type="text"
                value={date}
                onChange={e => setDate(e.target.value)}
                placeholder="e.g. 1968-08-14"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Location</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Cape Cod, Massachusetts"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is happening in this photo?"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: FONT.body }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
            <button
              onClick={handleSave}
              disabled={!hasChanges && !saved}
              style={{
                background: hasChanges ? COLORS.brownRed : 'none',
                color: hasChanges ? '#fff' : COLORS.warmGray,
                border: hasChanges ? 'none' : `0.5px solid ${COLORS.border}`,
                borderRadius: 16,
                padding: '6px 18px',
                fontFamily: FONT.ui,
                fontSize: 12,
                cursor: hasChanges ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              Save
            </button>
            {saved && (
              <span style={{ fontFamily: FONT.body, fontSize: 12, color: COLORS.olive }}>
                Saved
              </span>
            )}
          </div>
        </div>

        {/* Set as profile photo */}
        {onSetProfile && (
          <div style={{ marginTop: 12, borderTop: `0.5px solid ${COLORS.border}`, paddingTop: 12 }}>
            {isProfile ? (
              <span style={{ fontFamily: FONT.body, fontSize: 12, color: COLORS.olive }}>
                This is the profile photo
              </span>
            ) : (
              <button
                onClick={onSetProfile}
                style={{
                  background: 'none', border: `0.5px solid ${COLORS.border}`,
                  borderRadius: 16, padding: '6px 14px',
                  fontFamily: FONT.ui, fontSize: 12, color: COLORS.brownRed, cursor: 'pointer',
                }}
              >
                Set as profile photo
              </button>
            )}
          </div>
        )}

        {/* Tagged people with avatar thumbnails */}
        {taggedPeople.length > 0 && (
          <div style={{
            marginTop: 12,
            borderTop: `0.5px solid ${COLORS.border}`,
            paddingTop: 12,
          }}>
            <span style={{
              fontFamily: FONT.body,
              fontSize: 10,
              color: COLORS.warmGray,
              display: 'block',
              marginBottom: 10,
            }}>
              People in this photo
            </span>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      overflow: 'hidden', flexShrink: 0,
                      background: COLORS.photoPlaceholder,
                      border: `0.5px solid ${COLORS.border}`,
                    }}>
                      {photoUrl && (
                        <img
                          src={photoUrl}
                          alt={person.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    <span style={{
                      fontFamily: FONT.body,
                      fontSize: 10,
                      color: COLORS.brownRed,
                      whiteSpace: 'nowrap',
                    }}>
                      {person.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer navigation */}
        {photoCount > 1 && (
          <div style={{
            marginTop: 12,
            borderTop: `0.5px solid ${COLORS.border}`,
            paddingTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: FONT.body,
            fontSize: 12,
            color: COLORS.warmGray,
          }}>
            <button
              onClick={onPrev}
              disabled={!onPrev}
              style={{
                background: 'none', border: 'none', cursor: onPrev ? 'pointer' : 'default',
                fontFamily: FONT.body, fontSize: 12,
                color: onPrev ? COLORS.warmDark : COLORS.border, padding: 0,
              }}
            >
              &larr; Previous
            </button>
            <span>Photo {photoIndex + 1} of {photoCount}</span>
            <button
              onClick={onNext}
              disabled={!onNext}
              style={{
                background: 'none', border: 'none', cursor: onNext ? 'pointer' : 'default',
                fontFamily: FONT.body, fontSize: 12,
                color: onNext ? COLORS.warmDark : COLORS.border, padding: 0,
              }}
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
