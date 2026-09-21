import { describe, expect, it } from 'vitest'
import {
  extractApi,
  membersOf,
  namedExportsOf,
  unionMembersOf,
} from './check-api-summary.mjs'
import ts from 'typescript'

const parse = text =>
  ts.createSourceFile('fixture.ts', text, ts.ScriptTarget.Latest, true)

// The shapes that made a regex approach unsafe: a nested object literal inside a union, and a method whose parameter
// is an inline object.
const NESTED = parse(`
  export type AnalyticsConfig = {
    consent: ConsentStatus
    attribution?: boolean | { ttlDays?: number; aiSources?: AiSources }
    autocapture?: { clicks?: boolean }
  }

  export type Destination = {
    name: string
    start(context: { consent: ConsentState; identity?: Identity }): void
  }

  export type Empty = {}

  export type Codes = 'first' | 'second'
`)

describe('extracting the public API', () => {
  it('reports top-level members only, never the ones nested inside a type', () => {
    expect(membersOf(NESTED, 'AnalyticsConfig')).toEqual([
      'consent',
      'attribution',
      'autocapture',
    ])
  })

  it('reports a method, not the fields of its parameter object', () => {
    expect(membersOf(NESTED, 'Destination')).toEqual(['name', 'start'])
  })

  it('reports the values of a union', () => {
    expect(unionMembersOf(NESTED, 'Codes')).toEqual(['first', 'second'])
  })

  it('reports value and type exports together', () => {
    const source = parse(`
      export { createTrackHandler } from './server/createTrackHandler.js'
      export type { AiAgents, AiCrawlerOptions } from './server/aiCrawlers.js'
    `)

    expect(namedExportsOf(source)).toEqual([
      'createTrackHandler',
      'AiAgents',
      'AiCrawlerOptions',
    ])
  })

  describe('refuses to pass by finding nothing', () => {
    it('when a type was renamed or moved', () => {
      expect(() => membersOf(NESTED, 'Gone')).toThrow(
        /could not find type Gone/,
      )
    })

    it('when a type has no members', () => {
      expect(() => membersOf(NESTED, 'Empty')).toThrow(/has no members/)
    })

    it('when a module exports nothing by name', () => {
      expect(() => namedExportsOf(parse('const x = 1'))).toThrow(
        /exports nothing by name/,
      )
    })

    it('when a file the extractor needs is empty', () => {
      expect(() =>
        extractApi({
          'lib/core/types.ts': '',
          'lib/core/errors.ts': '',
          'lib/server.ts': '',
        }),
      ).toThrow(/could not find type AnalyticsConfig/)
    })
  })
})
