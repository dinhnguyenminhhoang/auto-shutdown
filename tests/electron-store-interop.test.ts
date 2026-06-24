import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveElectronStoreConstructor } from '../src/main/electron-store-interop'

class MockStore {}

describe('electron-store interop', () => {
  it('uses default export when electron-store is loaded through CommonJS require', () => {
    const result = resolveElectronStoreConstructor({ default: MockStore })

    assert.equal(result, MockStore)
  })

  it('keeps direct constructor when electron-store is loaded as an ESM default import', () => {
    const result = resolveElectronStoreConstructor(MockStore)

    assert.equal(result, MockStore)
  })
})
