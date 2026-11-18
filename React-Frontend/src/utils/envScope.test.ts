import { describe, expect, it } from 'vitest'
import type { EnvId } from '@/types'
import { envsOfFix, envsOfPattern, inScopeAny } from './envScope'

const signals = new Map<string, { envId: EnvId }>([
  ['s1', { envId: 'dub' }],
  ['s2', { envId: 'dub' }],
  ['s3', { envId: 'ast' }],
])
const patterns = new Map([
  ['p-dub', { signalIds: ['s1', 's2'] }],
  ['p-mixed', { signalIds: ['s2', 's3'] }],
  ['p-unknown', { signalIds: ['x'] }],
])

describe('environments of a record (decided 18 Nov: the switch narrows everything)', () => {
  it('a pattern takes the environments of its signals', () => {
    expect(envsOfPattern(patterns.get('p-dub'), signals)).toEqual(['dub'])
    expect(envsOfPattern(patterns.get('p-mixed'), signals).sort()).toEqual(['ast', 'dub'])
    expect(envsOfPattern(undefined, signals)).toEqual([])
  })

  it('a fix takes its own environment, else its pattern\'s, else is everywhere', () => {
    expect(envsOfFix({ envId: 'auh', patternId: 'p-dub' }, patterns, signals)).toEqual(['auh'])
    expect(envsOfFix({ patternId: 'p-dub' }, patterns, signals)).toEqual(['dub'])
    expect(envsOfFix({ patternId: 'p-unknown' }, patterns, signals)).toBeNull()
    expect(envsOfFix({ patternId: 'gone' }, patterns, signals)).toBeNull()
    expect(envsOfFix({}, patterns, signals)).toBeNull()
  })

  it('shows a record under the selected scope, and a record with no known environment under every scope', () => {
    expect(inScopeAny('all', ['dub'])).toBe(true)
    expect(inScopeAny('dub', ['dub'])).toBe(true)
    expect(inScopeAny('ast', ['dub'])).toBe(false)
    expect(inScopeAny('ast', ['dub', 'ast'])).toBe(true)
    expect(inScopeAny('auh', null)).toBe(true)
  })
})
