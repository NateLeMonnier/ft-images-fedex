import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement } from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockFrom = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
  },
}))

function makeChain(data = []) {
  return {
    select: vi.fn().mockResolvedValue({ data, error: null }),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
}

import { useFamilyData } from '../hooks/useFamilyData'

function wrapper({ children }) {
  return createElement(MemoryRouter, null, children)
}

describe('useFamilyData', () => {
  let personChain, metaChain

  beforeEach(() => {
    vi.clearAllMocks()
    personChain = makeChain([])
    metaChain = makeChain([])
    mockFrom.mockImplementation((table) => {
      if (table === 'person_overrides') return personChain
      if (table === 'photo_metadata') return metaChain
      return makeChain()
    })
  })

  it('returns the Brown family data on load', async () => {
    const { result } = renderHook(() => useFamilyData(), { wrapper })
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.data.family_id).toBe('brown-family')
    expect(result.current.data.people.length).toBeGreaterThanOrEqual(32)
    expect(result.current.data.relationships.length).toBe(39)
  })

  it('merges Supabase person overrides over base data', async () => {
    personChain = makeChain([
      { person_id: 'laryn-david-brown', notes: 'Loaded from Supabase' },
    ])
    mockFrom.mockImplementation((table) => {
      if (table === 'person_overrides') return personChain
      if (table === 'photo_metadata') return metaChain
      return makeChain()
    })

    const { result } = renderHook(() => useFamilyData(), { wrapper })
    await waitFor(() => expect(result.current.loaded).toBe(true))
    const person = result.current.data.people.find(p => p.id === 'laryn-david-brown')
    expect(person.notes).toBe('Loaded from Supabase')
  })

  it('updatePerson calls Supabase upsert and updates state', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null })
    personChain = { ...makeChain([]), upsert: upsertMock }
    mockFrom.mockImplementation((table) => {
      if (table === 'person_overrides') return personChain
      if (table === 'photo_metadata') return metaChain
      return makeChain()
    })

    const { result } = renderHook(() => useFamilyData(), { wrapper })
    await waitFor(() => expect(result.current.loaded).toBe(true))

    await act(async () => {
      await result.current.updatePerson('laryn-david-brown', { birthDate: '1 Jan 1967' })
    })

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        person_id: 'laryn-david-brown',
        birth_date: '1 Jan 1967',
      })
    )
    const person = result.current.data.people.find(p => p.id === 'laryn-david-brown')
    expect(person.birthDate).toBe('1 Jan 1967')
  })

  it('updatePhotoMetadata calls Supabase upsert', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null })
    metaChain = { ...makeChain([]), upsert: upsertMock }
    mockFrom.mockImplementation((table) => {
      if (table === 'person_overrides') return personChain
      if (table === 'photo_metadata') return metaChain
      return makeChain()
    })

    const { result } = renderHook(() => useFamilyData(), { wrapper })
    await waitFor(() => expect(result.current.loaded).toBe(true))

    await result.current.updatePhotoMetadata('john-gurney-brown-jr/photo.jpg', {
      date: '1967-03-27',
      location: 'Cape Cod',
      description: 'Beach day',
    })

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        photo_key: 'john-gurney-brown-jr/photo.jpg',
        date: '1967-03-27',
        location: 'Cape Cod',
        description: 'Beach day',
      })
    )
  })

  it('loads photo metadata from Supabase', async () => {
    metaChain = makeChain([
      { photo_key: 'john/test.jpg', date: '1990-01-01', location: 'Boston', description: 'Test' },
    ])
    mockFrom.mockImplementation((table) => {
      if (table === 'person_overrides') return personChain
      if (table === 'photo_metadata') return metaChain
      return makeChain()
    })

    const { result } = renderHook(() => useFamilyData(), { wrapper })
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.photoMeta['john/test.jpg']).toEqual(
      expect.objectContaining({ date: '1990-01-01', location: 'Boston' })
    )
  })
})
