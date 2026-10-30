import {mkdtempSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'
import {
  bestMatchingXcode,
  normalizeXcodeVersion,
  resolveProjectPath,
  resolveXcodeVersion,
  versionSatisfies
} from '../src/xcode'

describe('resolveXcodeVersion', () => {
  it('prefers the input over .xcode-version', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'periphery-xcode-'))
    writeFileSync(join(workspace, '.xcode-version'), '16.0\n')
    expect(resolveXcodeVersion('16.4', workspace)).toBe('16.4')
  })

  it('reads .xcode-version when input is empty', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'periphery-xcode-'))
    writeFileSync(join(workspace, '.xcode-version'), '16.4\n')
    expect(resolveXcodeVersion('', workspace)).toBe('16.4')
  })

  it('fails when neither input nor file is available', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'periphery-xcode-'))
    expect(() => resolveXcodeVersion('', workspace)).toThrow(/xcode-version/)
  })

  it('fails when .xcode-version is blank', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'periphery-xcode-'))
    writeFileSync(join(workspace, '.xcode-version'), '  \n')
    expect(() => resolveXcodeVersion('', workspace)).toThrow(/empty/)
  })
})

describe('normalizeXcodeVersion', () => {
  it('coerces partial and full versions', () => {
    expect(normalizeXcodeVersion('16.4')).toBe('16.4.0')
    expect(normalizeXcodeVersion('27.0.0')).toBe('27.0.0')
  })

  it('returns null for empty or invalid input', () => {
    expect(normalizeXcodeVersion('')).toBeNull()
    expect(normalizeXcodeVersion('not-a-version')).toBeNull()
  })
})

describe('versionSatisfies', () => {
  it('matches ~ ranges', () => {
    expect(versionSatisfies('27.0.0', '~27.0.0')).toBe(true)
    expect(versionSatisfies('27.0.1', '~27.0.0')).toBe(true)
    expect(versionSatisfies('28.0.0', '~27.0.0')).toBe(false)
    expect(versionSatisfies('26.9.0', '~27.0.0')).toBe(false)
  })

  it('matches ^ ranges and exact/partial versions', () => {
    expect(versionSatisfies('16.4.0', '^16.4.0')).toBe(true)
    expect(versionSatisfies('16.5.0', '^16.4.0')).toBe(true)
    expect(versionSatisfies('17.0.0', '^16.4.0')).toBe(false)
    expect(versionSatisfies('16.4', '16.4')).toBe(true)
    expect(versionSatisfies('16.4.1', '16.4')).toBe(true)
    expect(versionSatisfies('16.4.0', '16.4.0')).toBe(true)
    expect(versionSatisfies('16.5.0', '16.4')).toBe(false)
  })

  it('rejects empty wanted specs', () => {
    expect(versionSatisfies('27.0.0', '')).toBe(false)
    expect(versionSatisfies('27.0.0', '   ')).toBe(false)
  })
})

describe('bestMatchingXcode', () => {
  it('picks the highest version that satisfies a range', () => {
    const chosen = bestMatchingXcode(
      [
        {appPath: '/Applications/Xcode_27.0.app', installed: '27.0.0'},
        {appPath: '/Applications/Xcode_27.0.1.app', installed: '27.0.1'},
        {appPath: '/Applications/Xcode_28.app', installed: '28.0.0'}
      ],
      '~27.0.0'
    )
    expect(chosen).toEqual({
      appPath: '/Applications/Xcode_27.0.1.app',
      installed: '27.0.1'
    })
  })

  it('returns null when nothing matches', () => {
    expect(
      bestMatchingXcode(
        [{appPath: '/Applications/Xcode_26.app', installed: '26.9.0'}],
        '~27.0.0'
      )
    ).toBeNull()
  })

  it('returns null for an empty wanted spec', () => {
    expect(
      bestMatchingXcode(
        [{appPath: '/Applications/Xcode_27.app', installed: '27.0.0'}],
        ''
      )
    ).toBeNull()
  })
})

describe('resolveProjectPath', () => {
  it('keeps absolute paths', () => {
    expect(resolveProjectPath('/tmp/App.xcodeproj', '/ws')).toBe(
      '/tmp/App.xcodeproj'
    )
  })

  it('joins relative paths to the workspace', () => {
    expect(resolveProjectPath('App.xcodeproj', '/ws')).toBe('/ws/App.xcodeproj')
  })
})
