import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportJson } from '../utils/exportJson'

describe('exportJson', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  it('triggers a link click to download the file', () => {
    const mockClick = vi.fn()
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(tag => {
      const el = realCreate(tag)
      if (tag === 'a') el.click = mockClick
      return el
    })

    exportJson({ family_id: 'test', people: [], relationships: [] })
    expect(mockClick).toHaveBeenCalled()
  })

  it('sets download attribute to family.json', () => {
    let capturedEl = null
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(tag => {
      const el = realCreate(tag)
      if (tag === 'a') { el.click = vi.fn(); capturedEl = el }
      return el
    })

    exportJson({ family_id: 'test', people: [], relationships: [] })
    expect(capturedEl.download).toBe('family.json')
  })
})
