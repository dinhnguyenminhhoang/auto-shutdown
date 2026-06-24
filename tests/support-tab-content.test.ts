import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { SupportTabContent } from '../src/renderer/src/components/support-tab-content'

describe('support tab content', () => {
  it('renders the support message, QR details, and copy actions', () => {
    const markup = renderToStaticMarkup(
      React.createElement(SupportTabContent, {
        qrSrc: '/support-qr.png',
        copiedField: null,
        onCopyAccountName: () => undefined,
        onCopyAccountNumber: () => undefined
      })
    )

    assert.match(markup, /Nếu bạn thấy ứng dụng hữu ích/i)
    assert.match(markup, /Sacombank/i)
    assert.match(markup, /050133514497/)
    assert.match(markup, /DINH NGUYEN MINH HOANG/)
    assert.match(markup, /Sao chép STK/)
    assert.match(markup, /Sao chép tên TK/)
  })
})
