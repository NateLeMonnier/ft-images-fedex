import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFamilyData } from '../hooks/useFamilyData'

beforeEach(() => localStorage.clear())

describe('useFamilyData', () => {
  it('returns the Brown family data on load', () => {
    const { result } = renderHook(() => useFamilyData())
    expect(result.current.data.family_id).toBe('brown-family')
    expect(result.current.data.people.length).toBe(33)
    expect(result.current.data.relationships.length).toBe(39)
  })

  it('merges localStorage overrides over base data on load', () => {
    localStorage.setItem('ft-overrides', JSON.stringify({
      'laryn-david-brown': { notes: 'Loaded from storage' },
    }))
    const { result } = renderHook(() => useFamilyData())
    const person = result.current.data.people.find(p => p.id === 'laryn-david-brown')
    expect(person.notes).toBe('Loaded from storage')
  })

  it('updatePerson saves to localStorage and updates state', () => {
    const { result } = renderHook(() => useFamilyData())
    act(() => {
      result.current.updatePerson('laryn-david-brown', { birthDate: '1 Jan 1967' })
    })
    const person = result.current.data.people.find(p => p.id === 'laryn-david-brown')
    expect(person.birthDate).toBe('1 Jan 1967')
    const stored = JSON.parse(localStorage.getItem('ft-overrides'))
    expect(stored['laryn-david-brown'].birthDate).toBe('1 Jan 1967')
  })

  it('updatePerson preserves existing overrides for other people', () => {
    const { result } = renderHook(() => useFamilyData())
    act(() => result.current.updatePerson('larry-fred-brown', { notes: 'Larry note' }))
    act(() => result.current.updatePerson('laryn-david-brown', { notes: 'Laryn note' }))
    const stored = JSON.parse(localStorage.getItem('ft-overrides'))
    expect(stored['larry-fred-brown'].notes).toBe('Larry note')
    expect(stored['laryn-david-brown'].notes).toBe('Laryn note')
  })

  it('falls back to base data if localStorage is corrupt', () => {
    localStorage.setItem('ft-overrides', 'not valid json{{{')
    const { result } = renderHook(() => useFamilyData())
    expect(result.current.data.family_id).toBe('brown-family')
  })
})
