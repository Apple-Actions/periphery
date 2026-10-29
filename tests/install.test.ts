import {describe, expect, it} from 'vitest'
import {installPeriphery} from '../src/install'

describe('installPeriphery', () => {
  it('rejects non-macOS platforms', async () => {
    await expect(installPeriphery('3.8.0', '', 'linux')).rejects.toThrow(
      /macOS/
    )
  })
})
