import { useState, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFamilyData } from '../hooks/useFamilyData'
import { uploadPhotos } from '../utils/uploadPhotos'
import PhotoLightbox from './PhotoLightbox'
import EditModal from './EditModal'

function parseLooseDate(str) {
  if (!str) return null
  const match = str.match(/(\d{4})/)
  if (!match) return null
  const year = parseInt(match[1], 10)
  const monthMatch = str.match(/(\d{1,2})\s+\w+\s+\d{4}|(\w+)\s+(\d{1,2})|\d{4}-(\d{2})-(\d{2})/)
  if (monthMatch) {
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (isoMatch) return new Date(year, parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10))
  }
  return new Date(str)
}

function isAfterDeath(photoDate, deathDate) {
  if (!photoDate || !deathDate) return false
  const photo = parseLooseDate(photoDate)
  const death = parseLooseDate(deathDate)
  if (!photo || !death || isNaN(photo.getTime()) || isNaN(death.getTime())) return false
  return photo > death
}

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

const PAGE_SIZE = 100

export default function PersonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, updatePerson, getPeopleInPhoto, updatePhotoMetadata, tagPersonInPhoto, removePersonFromPhoto, deletePhoto, refreshPhotos } = useFamilyData()
  const [lightboxPhotoId, setLightboxPhotoId] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('photoSort') || 'newest')
  const [page, setPage] = useState(0)
  const fileInputRef = useRef(null)

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

  const rawPhotos = person.photos || []

  const photos = useMemo(() => {
    const sorted = [...rawPhotos].sort((a, b) => {
      const da = parseLooseDate(a.date)
      const db = parseLooseDate(b.date)
      const ta = da && !isNaN(da.getTime()) ? da.getTime() : null
      const tb = db && !isNaN(db.getTime()) ? db.getTime() : null
      if (ta == null && tb == null) return (a.filename || '').localeCompare(b.filename || '')
      if (ta == null) return 1
      if (tb == null) return -1
      if (ta === tb) return (a.filename || '').localeCompare(b.filename || '')
      return sortOrder === 'newest' ? tb - ta : ta - tb
    })
    return sorted
  }, [rawPhotos, sortOrder])

  const totalPages = Math.ceil(photos.length / PAGE_SIZE)
  const safeePage = Math.min(page, totalPages - 1, Math.max(0, page))
  const pagePhotos = photos.slice(safeePage * PAGE_SIZE, (safeePage + 1) * PAGE_SIZE)

  const primaryPhoto = rawPhotos.find(p => p.filename === person.primaryPhoto) || rawPhotos[0]
  const primaryPhotoUrl = primaryPhoto?.url || null

  const lightboxIndex = lightboxPhotoId != null
    ? photos.findIndex(p => p.id === lightboxPhotoId)
    : -1

  function toggleSort() {
    const next = sortOrder === 'newest' ? 'oldest' : 'newest'
    setSortOrder(next)
    setPage(0)
    localStorage.setItem('photoSort', next)
  }

  function goToPage(p) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const birthYear = person.birthDate ? person.birthDate.match(/\d{4}/)?.[0] : null
  const deathYear = person.deathDate ? person.deathDate.match(/\d{4}/)?.[0] : null
  const metaLine = [
    birthYear && deathYear ? `${birthYear} – ${deathYear}` : birthYear ? `b. ${birthYear}` : null,
  ].filter(Boolean).join('')

  async function handleUpload(e) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const imageCount = Array.from(files).filter(f => /\.(jpe?g|png|gif|webp|tiff?|bmp|heic|heif)$/i.test(f.name)).length
    if (imageCount === 0) return

    setUploading(true)
    setUploadResult(null)
    setUploadProgress({ current: 0, total: imageCount, filename: '' })

    const results = await uploadPhotos(files, person.id, (progress) => {
      setUploadProgress(progress)
    })

    await refreshPhotos()
    setUploading(false)
    setUploadProgress(null)
    setUploadResult(results)
    fileInputRef.current.value = ''
  }

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={toggleSort}
            style={{
              background: 'none', border: `0.5px solid ${COLORS.border}`,
              color: COLORS.warmGray, borderRadius: 16, padding: '5px 14px',
              fontSize: 12, cursor: 'pointer', fontFamily: FONT.ui,
            }}
          >
            {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              background: 'none', border: `0.5px solid ${COLORS.border}`,
              color: uploading ? COLORS.border : COLORS.brownRed, borderRadius: 16, padding: '5px 14px',
              fontSize: 12, cursor: uploading ? 'default' : 'pointer', fontFamily: FONT.ui,
            }}
          >
            {uploading ? `Uploading ${uploadProgress?.current}/${uploadProgress?.total}...` : 'Add photos'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            webkitdirectory=""
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
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
      </div>

      {/* Header and bio card */}
      <div style={{
        position: 'relative',
        padding: '40px 24px 32px',
        borderBottom: `0.5px solid ${COLORS.borderLight}`,
      }}>
        {/* Centered portrait header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {primaryPhotoUrl ? (
            <img
              src={primaryPhotoUrl}
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
              {metaLine && photos.length > 0 && <span> &middot; </span>}
              {photos.length > 0 && (
                <span style={{ color: COLORS.olive }}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
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
          {pagePhotos.map((photo, idx) => (
            <div
              key={photo.id || photo.filename}
              onClick={() => setLightboxPhotoId(photo.id)}
              style={{
                aspectRatio: '1', background: COLORS.photoPlaceholder,
                borderRadius: 4, cursor: 'pointer', overflow: 'hidden',
              }}
            >
              <img
                src={photo.url}
                alt={`${person.name} photo ${safeePage * PAGE_SIZE + idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 4, marginTop: 24, fontFamily: FONT.ui, fontSize: 13,
          }}>
            <button
              onClick={() => goToPage(safeePage - 1)}
              disabled={safeePage === 0}
              style={{
                background: 'none', border: 'none', padding: '6px 10px',
                color: safeePage === 0 ? COLORS.border : COLORS.warmDark,
                cursor: safeePage === 0 ? 'default' : 'pointer',
                fontFamily: FONT.ui, fontSize: 13,
              }}
            >
              &larr; Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => {
              if (totalPages <= 7 || i === 0 || i === totalPages - 1 || Math.abs(i - safeePage) <= 1) {
                return (
                  <button
                    key={i}
                    onClick={() => goToPage(i)}
                    style={{
                      background: i === safeePage ? COLORS.brownRed : 'none',
                      color: i === safeePage ? '#fff' : COLORS.warmGray,
                      border: i === safeePage ? 'none' : `0.5px solid ${COLORS.border}`,
                      borderRadius: 16, padding: '5px 12px',
                      cursor: 'pointer', fontFamily: FONT.ui, fontSize: 12,
                      minWidth: 32,
                    }}
                  >
                    {i + 1}
                  </button>
                )
              }
              if (i === 1 && safeePage > 3) return <span key={i} style={{ color: COLORS.warmGray, padding: '0 4px' }}>&hellip;</span>
              if (i === totalPages - 2 && safeePage < totalPages - 4) return <span key={i} style={{ color: COLORS.warmGray, padding: '0 4px' }}>&hellip;</span>
              return null
            })}
            <button
              onClick={() => goToPage(safeePage + 1)}
              disabled={safeePage >= totalPages - 1}
              style={{
                background: 'none', border: 'none', padding: '6px 10px',
                color: safeePage >= totalPages - 1 ? COLORS.border : COLORS.warmDark,
                cursor: safeePage >= totalPages - 1 ? 'default' : 'pointer',
                fontFamily: FONT.ui, fontSize: 13,
              }}
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Upload progress overlay */}
      {(uploading || uploadResult) && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(74,65,58,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 8, padding: '32px 40px',
            width: 360, textAlign: 'center', fontFamily: FONT.body,
          }}>
            {uploading ? (
              <>
                <div style={{ fontSize: 16, color: COLORS.warmDark, marginBottom: 16 }}>
                  Uploading photos...
                </div>
                <div style={{
                  height: 6, borderRadius: 3, background: COLORS.photoPlaceholder,
                  overflow: 'hidden', marginBottom: 12,
                }}>
                  <div style={{
                    height: '100%', borderRadius: 3, background: COLORS.brownRed,
                    width: `${((uploadProgress?.current || 0) / (uploadProgress?.total || 1)) * 100}%`,
                    transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ fontSize: 13, color: COLORS.warmGray }}>
                  {uploadProgress?.current} of {uploadProgress?.total}
                </div>
                <div style={{
                  fontSize: 11, color: COLORS.warmGray, marginTop: 4,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {uploadProgress?.filename}
                </div>
              </>
            ) : uploadResult && (
              <>
                <div style={{ fontSize: 16, color: COLORS.warmDark, marginBottom: 12 }}>
                  Upload complete
                </div>
                <div style={{ fontSize: 13, color: COLORS.warmGray, lineHeight: 1.6 }}>
                  {uploadResult.uploaded > 0 && <div>{uploadResult.uploaded} photo{uploadResult.uploaded !== 1 ? 's' : ''} added</div>}
                  {uploadResult.linked > 0 && <div>{uploadResult.linked} already in library, linked to {person.name}</div>}
                  {uploadResult.repaired > 0 && <div style={{ color: COLORS.olive }}>{uploadResult.repaired} date{uploadResult.repaired !== 1 ? 's' : ''} repaired from metadata</div>}
                  {uploadResult.errors.length > 0 && (
                    <div style={{ color: '#c0392b' }}>{uploadResult.errors.length} failed</div>
                  )}
                </div>
                <button
                  onClick={() => setUploadResult(null)}
                  style={{
                    marginTop: 16, background: COLORS.brownRed, color: '#fff',
                    border: 'none', borderRadius: 16, padding: '8px 24px',
                    fontFamily: FONT.ui, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {lightboxPhotoId != null && lightboxIndex >= 0 && (() => {
        const photo = photos[lightboxIndex]
        const meta = isAfterDeath(photo.date, person.deathDate)
          ? { ...photo, date: null }
          : photo
        return (
          <PhotoLightbox
            src={photo.url}
            onClose={() => setLightboxPhotoId(null)}
            taggedPeople={getPeopleInPhoto(photo.id)}
            allPeople={data.people}
            photoId={photo.id}
            isProfile={photo.filename === (person.primaryPhoto || photos[0]?.filename)}
            onSetProfile={() => {
              updatePerson(person.id, { primaryPhoto: photo.filename })
            }}
            metadata={meta}
            photoIndex={lightboxIndex}
            photoCount={photos.length}
            onPrev={lightboxIndex > 0 ? () => {
              const newIndex = lightboxIndex - 1
              setLightboxPhotoId(photos[newIndex].id)
              setPage(Math.floor(newIndex / PAGE_SIZE))
            } : null}
            onNext={lightboxIndex < photos.length - 1 ? () => {
              const newIndex = lightboxIndex + 1
              setLightboxPhotoId(photos[newIndex].id)
              setPage(Math.floor(newIndex / PAGE_SIZE))
            } : null}
            onUpdateMetadata={(changes) => updatePhotoMetadata(photo.id, changes)}
            onTagPerson={(personId) => tagPersonInPhoto(photo.id, personId)}
            onRemovePerson={(personId) => removePersonFromPhoto(photo.id, personId)}
            onDelete={async () => {
              const nextPhoto = photos[lightboxIndex + 1] || photos[lightboxIndex - 1]
              await deletePhoto(photo.id, person.id)
              setLightboxPhotoId(nextPhoto?.id || null)
            }}
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
