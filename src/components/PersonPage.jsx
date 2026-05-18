import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFamilyData } from '../hooks/useFamilyData'
import PhotoLightbox from './PhotoLightbox'
import EditModal from './EditModal'

const PAGE_BG = '#1a2e38'

export default function PersonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, updatePerson, photoTags } = useFamilyData()
  const [lightboxPhoto, setLightboxPhoto] = useState(null) // { url, key }
  const [editOpen, setEditOpen] = useState(false)

  const person = data.people.find(p => p.id === id)

  if (!person) {
    return (
      <div style={{ color: '#fff', padding: 40 }}>
        No record found for this person.{' '}
        <button onClick={() => navigate('/')} style={{ color: '#4a8fa8', background: 'none', border: 'none', cursor: 'pointer' }}>
          Return to tree
        </button>
      </div>
    )
  }

  const primaryPhoto = person.photos[0]
    ? `/photos/${person.id}/${person.photos[0]}`
    : null

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, color: '#fff', fontFamily: 'inherit' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button
          onClick={() => navigate(`/?pivot=${person.id}`)}
          style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.55)', borderRadius: 6, padding: '5px 12px',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          ← Their Tree
        </button>
        <span style={{ flex: 1, fontSize: 18, fontWeight: 600 }}>{person.name}</span>
        <button
          onClick={() => setEditOpen(true)}
          style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '5px 12px',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          ✏ Preserve their story
        </button>
      </div>

      {/* Bio section */}
      <div style={{
        display: 'flex', gap: 20, padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {primaryPhoto && (
          <img
            src={primaryPhoto}
            alt={person.name}
            style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {person.birthDate && (
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Birth Date</div>
                <div style={{ fontSize: 13 }}>{person.birthDate}</div>
              </div>
            )}
            {person.birthLocation && (
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Birth Location</div>
                <div style={{ fontSize: 13 }}>{person.birthLocation}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Photos</div>
              <div style={{ fontSize: 13 }}>{person.photos.length}</div>
            </div>
          </div>
          {person.notes && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, fontStyle: 'italic' }}>
              "{person.notes}"
            </div>
          )}
        </div>
      </div>

      {/* Photo grid */}
      <div style={{ padding: '14px 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Their photographs</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{person.photos.length} photos</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, padding: '0 3px 24px',
      }}>
        {person.photos.map((filename, idx) => {
          const url = `/photos/${person.id}/${filename}`
          return (
            <div
              key={filename}
              onClick={() => setLightboxPhoto({ url, key: `${person.id}/${filename}` })}
              style={{
                aspectRatio: '1', background: '#2a3e4a', borderRadius: 4,
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
              }}
            >
              <img
                src={url}
                alt={`${person.name} photo ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {idx === 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 5,
                  fontSize: 11, color: '#f0c040',
                }}>★</span>
              )}
            </div>
          )
        })}
      </div>

      {lightboxPhoto && (() => {
        const taggedIds = photoTags[lightboxPhoto.key] ?? []
        const taggedPeople = taggedIds.map(tid => data.people.find(p => p.id === tid)).filter(Boolean)
        return (
          <PhotoLightbox
            src={lightboxPhoto.url}
            onClose={() => setLightboxPhoto(null)}
            taggedPeople={taggedPeople}
          />
        )
      })()}

      {editOpen && (
        <EditModal
          person={person}
          onSave={(changes) => {
            updatePerson(person.id, changes)
            setEditOpen(false)
          }}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  )
}
