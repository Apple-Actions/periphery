import {info} from '@actions/core'
import {cacheDir, downloadTool, extractZip, find} from '@actions/tool-cache'
import {chmodSync, existsSync} from 'node:fs'
import {platform as osPlatform} from 'node:os'
import {join} from 'node:path'

const OWNER = 'peripheryapp'
const REPO = 'periphery'
const TOOL_NAME = 'periphery'

export async function fetchLatestVersion(token: string): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Apple-Actions/periphery',
    'X-GitHub-Api-Version': '2022-11-28'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`,
    {headers}
  )
  if (!response.ok) {
    throw new Error(
      `Failed to resolve latest Periphery release: ${response.status} ${response.statusText}`
    )
  }
  const body = (await response.json()) as {tag_name?: string}
  if (!body.tag_name) {
    throw new Error('Latest Periphery release response missing tag_name')
  }
  return body.tag_name.replace(/^v/i, '')
}

function releaseDownloadUrl(version: string): string {
  return `https://github.com/${OWNER}/${REPO}/releases/download/${version}/periphery-${version}.zip`
}

function findBinary(dir: string): string {
  const candidate = join(dir, 'periphery')
  if (!existsSync(candidate)) {
    throw new Error(
      `periphery binary not found in extracted archive: ${candidate}`
    )
  }
  return candidate
}

/**
 * Ensure Periphery `version` is on disk (tool-cache) and return the binary path.
 * macOS only — Periphery ships a Darwin binary with an adjacent IndexStore dylib.
 */
export async function installPeriphery(
  version: string,
  token: string,
  platform: NodeJS.Platform = osPlatform()
): Promise<string> {
  if (platform !== 'darwin') {
    throw new Error(
      `Periphery action supports macOS runners only (this one is ${platform})`
    )
  }

  const cached = find(TOOL_NAME, version)
  if (cached) {
    const binary = findBinary(cached)
    info(`Using cached Periphery ${version} at ${binary}`)
    return binary
  }

  const url = releaseDownloadUrl(version)
  info(`Downloading Periphery ${version}`)

  const auth = token ? `token ${token}` : undefined
  const archivePath = await downloadTool(url, undefined, auth)
  const extracted = await extractZip(archivePath)
  const binary = findBinary(extracted)
  chmodSync(binary, 0o755)

  const cachedDir = await cacheDir(extracted, TOOL_NAME, version)
  const cachedBinary = findBinary(cachedDir)
  info(`Installed Periphery ${version} at ${cachedBinary}`)
  return cachedBinary
}
