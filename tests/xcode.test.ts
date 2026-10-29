import {mkdtempSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'
import {resolveProjectPath, resolveXcodeVersion} from '../src/xcode'

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
