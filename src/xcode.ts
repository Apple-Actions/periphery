import {info} from '@actions/core'
import {exec} from '@actions/exec'
import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {isAbsolute, join} from 'node:path'

const APPLICATIONS = '/Applications'

/**
 * Resolve the Xcode version from the `xcode-version` input or `.xcode-version`
 * at the workspace root.
 */
export function resolveXcodeVersion(input: string, workspace: string): string {
  if (input.trim()) {
    return input.trim()
  }

  const path = join(workspace, '.xcode-version')
  if (!existsSync(path)) {
    throw new Error(
      'Pass xcode-version or add .xcode-version at the repo root.'
    )
  }

  const version = readFileSync(path, 'utf8').trim()
  if (!version) {
    throw new Error('Xcode version is empty.')
  }
  return version
}

function developerDir(appPath: string): string {
  return join(appPath, 'Contents', 'Developer')
}

function versionMatches(installed: string, wanted: string): boolean {
  return installed === wanted || installed.startsWith(`${wanted}.`)
}

/**
 * Read `xcodebuild -version` for an Xcode.app bundle. Returns null when the
 * app is not a usable Xcode install.
 */
async function readXcodeAppVersion(appPath: string): Promise<string | null> {
  const xcodebuild = join(developerDir(appPath), 'usr', 'bin', 'xcodebuild')
  if (!existsSync(xcodebuild)) {
    return null
  }

  let stdout = ''
  const code = await exec(xcodebuild, ['-version'], {
    silent: true,
    ignoreReturnCode: true,
    listeners: {
      stdout: (data: Buffer) => {
        stdout += data.toString()
      }
    }
  })
  if (code !== 0) {
    return null
  }

  const match = /^Xcode\s+(\S+)/m.exec(stdout)
  return match ? match[1] : null
}

function preferredAppPath(version: string): string | null {
  const candidates = [
    join(APPLICATIONS, `Xcode_${version}.app`),
    join(APPLICATIONS, `Xcode${version}.app`)
  ]
  for (const candidate of candidates) {
    if (existsSync(developerDir(candidate))) {
      return candidate
    }
  }
  return null
}

function listXcodeApps(): string[] {
  if (!existsSync(APPLICATIONS)) {
    return []
  }
  return readdirSync(APPLICATIONS)
    .filter(name => /^Xcode.*\.app$/i.test(name))
    .map(name => join(APPLICATIONS, name))
    .filter(appPath => existsSync(developerDir(appPath)))
}

/**
 * Select an installed Xcode that matches `version` via `xcode-select -s`.
 */
export async function selectXcode(version: string): Promise<string> {
  const preferred = preferredAppPath(version)
  if (preferred) {
    const installed = await readXcodeAppVersion(preferred)
    if (installed && versionMatches(installed, version)) {
      await exec('sudo', ['xcode-select', '-s', developerDir(preferred)])
      info(`Xcode is set to ${installed} (${preferred})`)
      return installed
    }
  }

  const matches: Array<{appPath: string; installed: string}> = []
  for (const appPath of listXcodeApps()) {
    const installed = await readXcodeAppVersion(appPath)
    if (installed && versionMatches(installed, version)) {
      matches.push({appPath, installed})
    }
  }

  if (matches.length === 0) {
    throw new Error(
      `Could not find an installed Xcode matching version '${version}'.`
    )
  }

  // Prefer the longest (most specific) installed version string.
  matches.sort((a, b) => b.installed.length - a.installed.length)
  const chosen = matches[0]
  await exec('sudo', ['xcode-select', '-s', developerDir(chosen.appPath)])
  info(`Xcode is set to ${chosen.installed} (${chosen.appPath})`)
  return chosen.installed
}

/** Resolve a possibly-relative project path against the workspace. */
export function resolveProjectPath(project: string, workspace: string): string {
  return isAbsolute(project) ? project : join(workspace, project)
}
