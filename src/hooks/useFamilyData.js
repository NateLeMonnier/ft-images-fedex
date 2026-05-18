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

  // photoTags: { "person-id/filename": ["person-id", ...] }
  // Stored in family.json and not overridden via localStorage (partner populates the file directly)
  const photoTags = rawData.photoTags ?? {}

  return { data, updatePerson, photoTags }
}
