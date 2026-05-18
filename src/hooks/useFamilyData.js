import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import rawData from '../data/family.json'

function applyOverrides(base, overrides) {
  if (!overrides || Object.keys(overrides).length === 0) return base
  return {
    ...base,
    people: base.people.map(person => {
      const override = overrides[person.id]
      if (!override) return person
      return {
        ...person,
        ...(override.primary_photo !== undefined && { primaryPhoto: override.primary_photo }),
        ...(override.birth_date !== undefined && { birthDate: override.birth_date }),
        ...(override.birth_location !== undefined && { birthLocation: override.birth_location }),
        ...(override.notes !== undefined && { notes: override.notes }),
      }
    }),
  }
}

export function useFamilyData() {
  const [personOverrides, setPersonOverrides] = useState({})
  const [photoMeta, setPhotoMeta] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      const [persRes, metaRes] = await Promise.all([
        supabase.from('person_overrides').select('*'),
        supabase.from('photo_metadata').select('*'),
      ])

      if (persRes.data) {
        const map = {}
        for (const row of persRes.data) map[row.person_id] = row
        setPersonOverrides(map)
      }

      if (metaRes.data) {
        const map = {}
        for (const row of metaRes.data) map[row.photo_key] = row
        setPhotoMeta(map)
      }

      setLoaded(true)
    }
    load()
  }, [])

  const data = useMemo(() => applyOverrides(rawData, personOverrides), [personOverrides])

  const updatePerson = useCallback(async (personId, changes) => {
    const dbChanges = {}
    if ('primaryPhoto' in changes) dbChanges.primary_photo = changes.primaryPhoto
    if ('birthDate' in changes) dbChanges.birth_date = changes.birthDate
    if ('birthLocation' in changes) dbChanges.birth_location = changes.birthLocation
    if ('notes' in changes) dbChanges.notes = changes.notes

    const row = { person_id: personId, ...dbChanges, updated_at: new Date().toISOString() }
    await supabase.from('person_overrides').upsert(row)

    setPersonOverrides(prev => ({
      ...prev,
      [personId]: { ...(prev[personId] || {}), ...row },
    }))
  }, [])

  const updatePhotoMetadata = useCallback(async (photoKey, changes) => {
    const row = { photo_key: photoKey, ...changes, updated_at: new Date().toISOString() }
    await supabase.from('photo_metadata').upsert(row)

    setPhotoMeta(prev => ({
      ...prev,
      [photoKey]: { ...(prev[photoKey] || {}), ...row },
    }))
  }, [])

  const photoTags = rawData.photoTags ?? {}

  function getPeopleInPhoto(personId, filename) {
    const key = `${personId}/${filename}`
    const taggedIds = photoTags[key]
    if (taggedIds && taggedIds.length > 0) {
      return taggedIds.map(id => data.people.find(p => p.id === id)).filter(Boolean)
    }
    return data.people.filter(p => p.photos.includes(filename))
  }

  return {
    data,
    updatePerson,
    getPeopleInPhoto,
    photoMeta,
    updatePhotoMetadata,
    loaded,
  }
}
