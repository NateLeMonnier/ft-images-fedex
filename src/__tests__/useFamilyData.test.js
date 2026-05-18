import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement } from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockFrom = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    storage: {
      from: () => ({
        getPublicUrl: (path) => ({ data: { publicUrl: `https://example.com/${path}` } }),
      }),
    },
  },
}))

function makeChain(data = []) {
  return {
    select: vi.fn().mockResolvedValue({ data, error: null }),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })) })),
  }
}

import { useFamilyData } from '../hooks/useFamilyData'

function wrapper({ children }) {
  return createElement(MemoryRouter, null, children)
}

describe('useFamilyData', () => {
  let personChain, photoPeopleChain

  beforeEach(() => {
    vi.clearAllMocks()
    personChain = makeChain([])
    photoPeopleChain = makeChain([])
    mockFrom.mockImplementation((table) => {
      if (table === 'person_overrides') return personChain
      if (table === 'photo_people') return photoPeopleChain
      if (table === 'photos') return makeChain()
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
      if (table === 'photo_people') return photoPeopleChain
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
      if (table === 'photo_people') return photoPeopleChain
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

  it('loads photos from photo_people join', async () => {
    photoPeopleChain = makeChain([
      {
        person_id: 'john-gurney-brown-jr',
        photo_id: 'abc-123',
        photos: {
          id: 'abc-123',
          filename: 'test.jpg',
          storage_path: 'photos/test.jpg',
          date: '1990-01-01',
          location: 'Boston',
          description: 'Test',
          width: 800,
          height: 600,
          camera_model: 'Canon',
        },
      },
    ])
    mockFrom.mockImplementation((table) => {
      if (table === 'person_overrides') return personChain
      if (table === 'photo_people') return photoPeopleChain
      return makeChain()
    })

    const { result } = renderHook(() => useFamilyData(), { wrapper })
    await waitFor(() => expect(result.current.loaded).toBe(true))
    const person = result.current.data.people.find(p => p.id === 'john-gurney-brown-jr')
    expect(person.photos).toHaveLength(1)
    expect(person.photos[0].filename).toBe('test.jpg')
    expect(person.photos[0].url).toContain('test.jpg')
  })

  it('people without photos get empty array', async () => {
    const { result } = renderHook(() => useFamilyData(), { wrapper })
    await waitFor(() => expect(result.current.loaded).toBe(true))
    const person = result.current.data.people.find(p => p.id === 'laryn-david-brown')
    expect(person.photos).toEqual([])
  })
})
