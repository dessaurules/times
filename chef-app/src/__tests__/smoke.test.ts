import { describe, it, expect } from 'vitest'
import { VACATION_TYPES, CONTRACT_LABELS } from '@shared/types'

describe('Shared Types', () => {
  it('VACATION_TYPES enthält U, RU, U3, SU', () => {
    expect(VACATION_TYPES).toEqual(['U', 'RU', 'U3', 'SU'])
  })

  it('CONTRACT_LABELS hat alle Vertragsarten', () => {
    expect(Object.keys(CONTRACT_LABELS)).toEqual(['vz', 'tz', 'mj', 'az'])
  })
})
