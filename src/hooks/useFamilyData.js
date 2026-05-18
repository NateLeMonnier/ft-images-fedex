import { useState } from 'react'
import rawData from '../data/family.json'

const STORAGE_KEY = 'ft-overrides'

function mergeOverrides(base, overrides) {
  if (!overrides) return base
  return {
    ...base,
    people: base.people.map(person => {
      const override = overrides[person.id]
      return override ? { ...person, ...override } : person
    }),
  }
}

export function useFamilyData() {
  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return mergeOverrides(rawData, raw ? JSON.parse(raw) : null)
    } catch {
      return rawData
    }
  })

  function updatePerson(personId, changes) {
    let overrides = {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) overrides = JSON.parse(raw)
    } catch { /* ignore corrupt storage */ }

    overrides[personId] = { ...(overrides[personId] || {}), ...changes }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
    setData(mergeOverrides(rawData, overrides))
  }

  const photoTags = rawData.photoTags ?? {}

  // Returns every person who appears in a given photo.
  // If photoTags has an explicit entry for the key, that wins.
  // Otherwise scans all people's photos arrays for the same filename.
  function getPeopleInPhoto(personId, filename) {
    const key = `${personId}/${filename}`
    const taggedIds = photoTags[key]
    if (taggedIds && taggedIds.length > 0) {
      return taggedIds.map(id => data.people.find(p => p.id === id)).filter(Boolean)
    }
    return data.people.filter(p => p.photos.includes(filename))
  }

  return { data, updatePerson, getPeopleInPhoto }
}
