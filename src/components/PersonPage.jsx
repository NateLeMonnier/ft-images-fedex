import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFamilyData } from '../hooks/useFamilyData'
import PhotoLightbox from './PhotoLightbox'
import EditModal from './EditModal'

const COLORS = {
  brownRed: '#A43032',
  olive: '#828700',
  warmDark: '#4A413A',
  warmGray: '#8B8580',
  border: '#E5E1D9',
  borderLight: '#EEEAE3',
  photoPlaceholder: '#F3F1EC',
  pageBg: '#FFFFFF',
}

const FONT = {
  heading: "'Playfair Display', Georgia, serif",
  body: "Georgia, 'Times New Roman', serif",
  ui: "Inter, Helvetica, Arial, sans-serif",
}

export default function PersonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, updatePerson, getPeopleInPhoto, photoMeta, updatePhotoMetadata } = useFamilyData()
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [editOpen, setEditOpen] = useState(false)

  const person = data.people.find(p => p.id === id)

  if (!person) {
    return (
      <div style={{ color: COLORS.warmDark, padding: 40, fontFamily: FONT.body }}>
        No record found for this person.{' '}
        <button onClick={() => navigate('/')} style={{ color: COLORS.brownRed, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT.body }}>
          Return to tree
        </button>
      </div>
    )
  }

  const primaryFilename = person.primaryPhoto || person.photos[0]
  const primaryPhoto = primaryFilename
    ? `/photos/${person.id}/${primaryFilename}`
    : null

  const birthYear = person.birthDate ? person.birthDate.match(/\d{4}/)?.[0] : null
  const deathYear = person.deathDate ? person.deathDate.match(/\d{4}/)?.[0] : null
  const metaLine = [
    birthYear && deathYear ? `${birthYear} – ${deathYear}` : birthYear ? `b. ${birthYear}` : null,
  ].filter(Boolean).join('')

  return (
    <div style={{ minHeight: '100vh', background: COLORS.pageBg, color: COLORS.warmDark, fontFamily: FONT.body }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: `0.5px solid ${COLORS.border}`,
      }}>
        <button
          onClick={() => navigate(`/?pivot=${person.id}`)}
          style={{
            background: 'none', border: 'none',
            color: COLORS.warmGray, fontSize: 13, cursor: 'pointer',
            fontFamily: FONT.ui, padding: 0,
          }}
        >
          &larr; Back to family tree
        </button>
        <button
          onClick={() => setEditOpen(true)}
          style={{
            background: 'none', border: `0.5px solid ${COLORS.border}`,
            color: COLORS.warmGray, borderRadius: 16, padding: '5px 14px',
            fontSize: 12, cursor: 'pointer', fontFamily: FONT.ui,
          }}
        >
          Edit
        </button>
      </div>

      {/* Header and bio card */}
      <div style={{
        position: 'relative',
        padding: '40px 24px 32px',
        borderBottom: `0.5px solid ${COLORS.borderLight}`,
      }}>
        {/* Centered portrait header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {primaryPhoto ? (
            <img
              src={primaryPhoto}
              alt={person.name}
              style={{
                width: 78, height: 78, borderRadius: '50%',
                objectFit: 'cover', flexShrink: 0,
              }}
            />
          ) : (
            <div style={{
              width: 78, height: 78, borderRadius: '50%',
              background: COLORS.photoPlaceholder, flexShrink: 0,
            }} />
          )}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontFamily: FONT.heading, fontWeight: 500, fontSize: 22,
              color: COLORS.brownRed, margin: 0, lineHeight: 1.3,
            }}>
              {person.name}
            </h1>
            <div style={{ fontSize: 14, color: COLORS.warmGray, marginTop: 4 }}>
              {metaLine}
              {metaLine && person.photos.length > 0 && <span> &middot; </span>}
              {person.photos.length > 0 && (
                <span style={{ color: COLORS.olive }}>{person.photos.length} photo{person.photos.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>

        {/* Bio card — top right */}
        {(person.birthDate || person.deathDate) && (
          <div style={{
            position: 'absolute', top: 40, right: 24,
            width: 200, padding: '14px 16px',
            border: `0.5px solid ${COLORS.border}`, borderRadius: 8,
            background: COLORS.pageBg, fontSize: 13,
            lineHeight: 1.6,
          }}>
            {person.birthDate && (
              <>
                <div style={{ color: COLORS.warmGray }}>Born <span style={{ color: COLORS.warmDark }}>{person.birthDate}</span></div>
                {person.birthLocation && (
                  <div style={{ color: COLORS.warmGray, paddingLeft: 16, fontSize: 12 }}>{person.birthLocation}</div>
                )}
              </>
            )}
            {person.deathDate && (
              <div style={{ color: COLORS.warmGray, marginTop: person.birthDate ? 6 : 0 }}>
                Died <span style={{ color: COLORS.warmDark }}>{person.deathDate}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Photo grid — 8 columns, dense */}
      <div style={{ padding: '24px 24px 40px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4,
        }}>
          {person.photos.map((filename, idx) => {
            const url = `/photos/${person.id}/${filename}`
            return (
              <div
                key={filename}
                onClick={() => setLightboxIndex(idx)}
                style={{
                  aspectRatio: '1', background: COLORS.photoPlaceholder,
                  borderRadius: 4, cursor: 'pointer', overflow: 'hidden',
                }}
              >
                <img
                  src={url}
                  alt={`${person.name} photo ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {lightboxIndex !== null && (() => {
        const filename = person.photos[lightboxIndex]
        const key = `${person.id}/${filename}`
        const url = `/photos/${person.id}/${filename}`
        const meta = photoMeta[key] || {}
        return (
          <PhotoLightbox
            src={url}
            onClose={() => setLightboxIndex(null)}
            taggedPeople={getPeopleInPhoto(person.id, filename)}
            isProfile={filename === primaryFilename}
            onSetProfile={() => {
              updatePerson(person.id, { primaryPhoto: filename })
            }}
            metadata={meta}
            photoIndex={lightboxIndex}
            photoCount={person.photos.length}
            onPrev={lightboxIndex > 0 ? () => setLightboxIndex(lightboxIndex - 1) : null}
            onNext={lightboxIndex < person.photos.length - 1 ? () => setLightboxIndex(lightboxIndex + 1) : null}
            onUpdateMetadata={(changes) => updatePhotoMetadata(key, changes)}
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
