import {mkdtempSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it, vi} from 'vitest'
import {
  normalizeVersion,
  parseVersionFileContents,
  resolveVersionSpec
} from '../src/version'

describe('normalizeVersion', () => {
  it('strips a leading v', () => {
    expect(normalizeVersion('v3.8.0')).toBe('3.8.0')
  })

  it('trims whitespace', () => {
    expect(normalizeVersion('  3.8.0\n')).toBe('3.8.0')
  })

  it('rejects empty input', () => {
    expect(() => normalizeVersion('   ')).toThrow(/empty/)
  })
})

describe('parseVersionFileContents', () => {
  it('reads the first non-comment line', () => {
    expect(parseVersionFileContents('# pin\n\nv3.8.0\n9.9.9\n')).toBe('3.8.0')
  })

  it('rejects an empty file', () => {
    expect(() => parseVersionFileContents('# only comments\n\n')).toThrow(
      /no version line/
    )
  })
})

describe('resolveVersionSpec', () => {
  it('prefers version over version-file and warns', () => {
    const warn = vi.fn()
    const workspace = mkdtempSync(join(tmpdir(), 'periphery-version-'))
    writeFileSync(join(workspace, '.periphery-version'), '3.0.0\n')

    expect(
      resolveVersionSpec({
        version: '3.8.0',
        versionFile: '.periphery-version',
        workspace,
        warn
      })
    ).toBe('3.8.0')
    expect(warn).toHaveBeenCalledOnce()
  })

  it('reads version-file when version is omitted', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'periphery-version-'))
    writeFileSync(join(workspace, '.periphery-version'), '3.8.0\n')

    expect(
      resolveVersionSpec({
        version: '',
        versionFile: '.periphery-version',
        workspace,
        warn: vi.fn()
      })
    ).toBe('3.8.0')
  })

  it('fails when version-file is missing', () => {
    expect(() =>
      resolveVersionSpec({
        version: '',
        versionFile: '.missing',
        workspace: mkdtempSync(join(tmpdir(), 'periphery-version-')),
        warn: vi.fn()
      })
    ).toThrow(/not found/)
  })

  it('defaults to latest', () => {
    expect(
      resolveVersionSpec({
        version: '',
        versionFile: '',
        workspace: mkdtempSync(join(tmpdir(), 'periphery-version-')),
        warn: vi.fn()
      })
    ).toBe('latest')
  })
})
