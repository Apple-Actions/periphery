import {getInput, info, setFailed, setOutput, warning} from '@actions/core'
import {exec} from '@actions/exec'
import {existsSync} from 'node:fs'
import {platform as osPlatform} from 'node:os'
import {join} from 'node:path'
import {fetchLatestVersion, installPeriphery} from './install'
import {resolveVersionSpec} from './version'
import {resolveProjectPath, resolveXcodeVersion, selectXcode} from './xcode'

async function run(): Promise<void> {
  try {
    await main()
  } catch (err) {
    setFailed(err instanceof Error ? err.message : String(err))
  }
}

function splitArgs(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    return []
  }
  // Simple whitespace split; quote-aware parsing is out of scope.
  return trimmed.split(/\s+/)
}

async function main(): Promise<void> {
  if (osPlatform() !== 'darwin') {
    throw new Error(
      `Periphery action supports macOS runners only (this one is ${osPlatform()})`
    )
  }

  const projectInput = getInput('project', {required: true})
  const scheme = getInput('scheme', {required: true})
  const versionInput = getInput('version')
  const versionFile = getInput('version-file')
  const xcodeVersionInput = getInput('xcode-version')
  const argsInput = getInput('args')
  const token = getInput('token')

  const workspace = process.env.GITHUB_WORKSPACE || process.cwd()
  const project = resolveProjectPath(projectInput, workspace)

  const xcodeVersionWanted = resolveXcodeVersion(xcodeVersionInput, workspace)
  const xcodeVersion = await selectXcode(xcodeVersionWanted)

  info(`Resolving Swift packages for ${project} scheme ${scheme}`)
  await exec('xcodebuild', [
    '-project',
    project,
    '-scheme',
    scheme,
    '-resolvePackageDependencies'
  ])

  let version = resolveVersionSpec({
    version: versionInput,
    versionFile,
    workspace,
    warn: warning
  })

  if (version === 'latest') {
    version = await fetchLatestVersion(token)
    info(`Resolved latest Periphery to ${version}`)
  }

  const peripheryPath = await installPeriphery(version, token)
  const scanArgs = [...splitArgs(argsInput)]
  const peripheryYml = join(workspace, '.periphery.yml')

  if (existsSync(peripheryYml)) {
    info('Using .periphery.yml')
  } else {
    scanArgs.unshift('--project', project, '--schemes', scheme)
  }

  info(`Running: ${peripheryPath} scan ${scanArgs.join(' ')}`)
  await exec(peripheryPath, ['scan', ...scanArgs], {cwd: workspace})

  setOutput('version', version)
  setOutput('periphery-path', peripheryPath)
  setOutput('xcode-version', xcodeVersion)
}

run()
