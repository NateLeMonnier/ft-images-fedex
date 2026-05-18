import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import rawData from '../data/family.json'

function getPublicUrl(storagePath) {
  return supabase.storage.from('photos').getPublicUrl(storagePath).data.publicUrl
}

function applyOverrides(base, overrides) {
  if (!overrides || Object.keys(overrides).length === 0) return base
  return {
    ...base,
    people: base.people.map(person => {
      const override = overrides[person.id]
      if (!override) return person
      return {
        ...person,
        ...(override.primary_photo != null && { primaryPhoto: override.primary_photo }),
        ...(override.birth_date != null && { birthDate: override.birth_date }),
        ...(override.birth_location != null && { birthLocation: override.birth_location }),
        ...(override.notes != null && { notes: override.notes }),
      }
    }),
  }
}

export function useFamilyData() {
  const [personOverrides, setPersonOverrides] = useState({})
  const [photosByPerson, setPhotosByPerson] = useState({})
  const [loaded, setLoaded] = useState(false)

  async function loadPhotos() {
    const { data: links } = await supabase
      .from('photo_people')
      .select('person_id, photo_id, photos(*)')

    if (!links) return {}

    const map = {}
    for (const link of links) {
      if (!link.photos) continue
      const photo = {
        id: link.photos.id,
        filename: link.photos.filename,
        url: getPublicUrl(link.photos.storage_path),
        date: link.photos.date,
        location: link.photos.location,
        description: link.photos.description,
        width: link.photos.width,
        height: link.photos.height,
        camera_model: link.photos.camera_model,
      }
      if (!map[link.person_id]) map[link.person_id] = []
      map[link.person_id].push(photo)
    }
    return map
  }

  useEffect(() => {
    async function load() {
      const [persRes, photosMap] = await Promise.all([
        supabase.from('person_overrides').select('*'),
        loadPhotos(),
      ])

      if (persRes.data) {
        const map = {}
        for (const row of persRes.data) map[row.person_id] = row
        setPersonOverrides(map)
      }

      setPhotosByPerson(photosMap)
      setLoaded(true)
    }
    load()
  }, [])

  const data = useMemo(() => {
    const base = applyOverrides(rawData, personOverrides)
    return {
      ...base,
      people: base.people.map(person => ({
        ...person,
        photos: photosByPerson[person.id] || [],
      })),
    }
  }, [personOverrides, photosByPerson])

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

  const updatePhotoMetadata = useCallback(async (photoId, changes) => {
    await supabase.from('photos').update(changes).eq('id', photoId)

    setPhotosByPerson(prev => {
      const next = { ...prev }
      for (const personId of Object.keys(next)) {
        next[personId] = next[personId].map(p =>
          p.id === photoId ? { ...p, ...changes } : p
        )
      }
      return next
    })
  }, [])

  const tagPersonInPhoto = useCallback(async (photoId, personId) => {
    await supabase.from('photo_people').upsert({ photo_id: photoId, person_id: personId })

    setPhotosByPerson(prev => {
      const next = { ...prev }
      const existing = Object.values(next).flat().find(p => p.id === photoId)
      if (existing && !next[personId]?.some(p => p.id === photoId)) {
        next[personId] = [...(next[personId] || []), existing]
      }
      return next
    })
  }, [])

  const removePersonFromPhoto = useCallback(async (photoId, personId) => {
    await supabase.from('photo_people').delete()
      .eq('photo_id', photoId)
      .eq('person_id', personId)

    setPhotosByPerson(prev => {
      const next = { ...prev }
      if (next[personId]) {
        next[personId] = next[personId].filter(p => p.id !== photoId)
      }
      return next
    })
  }, [])

  const deletePhoto = useCallback(async (photoId, personId) => {
    // Remove this person's link to the photo
    await supabase.from('photo_people').delete()
      .eq('photo_id', photoId)
      .eq('person_id', personId)

    // Check if any other people are still linked
    const { data: remaining } = await supabase
      .from('photo_people')
      .select('person_id')
      .eq('photo_id', photoId)

    if (!remaining || remaining.length === 0) {
      // No one else linked — delete the file and row
      const { data: photo } = await supabase
        .from('photos')
        .select('storage_path')
        .eq('id', photoId)
        .single()

      if (photo) {
        await supabase.storage.from('photos').remove([photo.storage_path])
      }
      await supabase.from('photos').delete().eq('id', photoId)
    }

    setPhotosByPerson(prev => {
      const next = { ...prev }
      for (const pid of Object.keys(next)) {
        if (pid === personId || (!remaining || remaining.length === 0)) {
          next[pid] = next[pid].filter(p => p.id !== photoId)
        }
      }
      return next
    })
  }, [])

  const refreshPhotos = useCallback(async () => {
    const photosMap = await loadPhotos()
    setPhotosByPerson(photosMap)
  }, [])

  function getPeopleInPhoto(photoId) {
    const people = []
    for (const [personId, photos] of Object.entries(photosByPerson)) {
      if (photos.some(p => p.id === photoId)) {
        const person = data.people.find(p => p.id === personId)
        if (person) people.push(person)
      }
    }
    return people
  }

  return {
    data,
    updatePerson,
    getPeopleInPhoto,
    updatePhotoMetadata,
    tagPersonInPhoto,
    removePersonFromPhoto,
    deletePhoto,
    refreshPhotos,
    loaded,
  }
}
