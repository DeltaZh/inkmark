import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { Editor } from '@tiptap/core'
import { createExtensions } from './extensions'

const path =
  '/Users/delta/RiderProjects/lemi.microservice.api/docs/superpowers/specs/2026-08-08-auto-invoice-frontend-integration.md'
const md = readFileSync(path, 'utf8')

describe('full user doc parse', () => {
  let editor: Editor
  afterEach(() => editor?.destroy())

  it('keeps key structures', () => {
    editor = new Editor({
      extensions: createExtensions(),
      content: md,
      contentType: 'markdown',
    })
    const html = editor.getHTML()
    const types = (editor.getJSON().content ?? []).map((n) => n.type)
    const counts = types.reduce<Record<string, number>>((a, t) => {
      a[t] = (a[t] ?? 0) + 1
      return a
    }, {})
    // eslint-disable-next-line no-console
    console.log('COUNTS', counts)
    // eslint-disable-next-line no-console
    console.log('first 30 types', types.slice(0, 30))

    expect(html).toMatch(/<h3[^>]*>[\s\S]*开票列表/)
    expect(html).toMatch(/<(strong|b)>修改建议<\/(strong|b)>/)
    expect(html).toMatch(/SaveInvoiceFileAsync/)
    expect(html).toMatch(/<h2[^>]*>[\s\S]*状态与来源枚举/)
    expect(html).toMatch(/<blockquote[\s\S]*Swagger/)
    expect(html).toMatch(/GetSysConfigValue/)
    expect((counts.table ?? 0) > 0).toBe(true)
    expect((counts.heading ?? 0) > 5).toBe(true)
  })
})
