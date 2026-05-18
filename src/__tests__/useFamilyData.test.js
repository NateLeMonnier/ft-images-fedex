import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFamilyData } from '../hooks/useFamilyData'

beforeEach(() => localStorage.clear())

describe('useFamilyData', () => {
  it('returns the Walker family data on load', () => {
    const { result } = renderHook(() => useFamilyData())
    expect(result.current.data.family_id).toBe('walker-family')
    expect(result.current.data.people.length).toBe(7)
    expect(result.current.data.relationships.length).toBe(7)
  })

  it('merges localStorage overrides over base data on load', () => {
    localStorage.setItem('ft-overrides', JSON.stringify({
      'kathryn-walker': { notes: 'Loaded from storage' },
    }))
    const { result } = renderHook(() => useFamilyData())
    const person = result.current.data.people.find(p => p.id === 'kathryn-walker')
    expect(person.notes).toBe('Loaded from storage')
  })

  it('updatePerson saves to localStorage and updates state', () => {
    const { result } = renderHook(() => useFamilyData())
    act(() => {
      result.current.updatePerson('kathryn-walker', { birthDate: '1 Jan 1970' })
    })
    const person = result.current.data.people.find(p => p.id === 'kathryn-walker')
    expect(person.birthDate).toBe('1 Jan 1970')
    const stored = JSON.parse(localStorage.getItem('ft-overrides'))
    expect(stored['kathryn-walker'].birthDate).toBe('1 Jan 1970')
  })

  it('updatePerson preserves existing overrides for other people', () => {
    const { result } = renderHook(() => useFamilyData())
    act(() => result.current.updatePerson('harold-walker', { notes: 'Harold note' }))
    act(() => result.current.updatePerson('kathryn-walker', { notes: 'Kathryn note' }))
    const stored = JSON.parse(localStorage.getItem('ft-overrides'))
    expect(stored['harold-walker'].notes).toBe('Harold note')
    expect(stored['kathryn-walker'].notes).toBe('Kathryn note')
  })

  it('falls back to base data if localStorage is corrupt', () => {
    localStorage.setItem('ft-overrides', 'not valid json{{{')
    const { result } = renderHook(() => useFamilyData())
    expect(result.current.data.family_id).toBe('walker-family')
  })
})
