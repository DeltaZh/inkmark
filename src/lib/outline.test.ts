import type { JSONContent } from '@tiptap/core';
import { describe, it, expect } from 'vitest';
import { extractOutlineFromEditorJson, extractOutlineFromHtml } from './outline';

describe('extractOutlineFromHtml', () => {
  it('reads h1-h3 in order', () => {
    const html = `<h1>A</h1><p>x</p><h2>B</h2><h3>C</h3>`;
    expect(extractOutlineFromHtml(html)).toEqual([
      { level: 1, text: 'A', id: expect.any(String) },
      { level: 2, text: 'B', id: expect.any(String) },
      { level: 3, text: 'C', id: expect.any(String) },
    ]);
  });
});

describe('extractOutlineFromEditorJson', () => {
  const sampleDoc: JSONContent = {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'A' }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'x' }],
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'B' }],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'C' }],
      },
    ],
  };

  it('reads headings in document order with stable ids', () => {
    expect(extractOutlineFromEditorJson(sampleDoc)).toEqual([
      { level: 1, text: 'A', id: 'h-0' },
      { level: 2, text: 'B', id: 'h-1' },
      { level: 3, text: 'C', id: 'h-2' },
    ]);
  });

  it('joins inline text nodes within a heading', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'World' },
          ],
        },
      ],
    };
    expect(extractOutlineFromEditorJson(doc)).toEqual([
      { level: 2, text: 'Hello World', id: 'h-0' },
    ]);
  });

  it('walks nested content for headings inside blocks', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Nested' }],
            },
          ],
        },
      ],
    };
    expect(extractOutlineFromEditorJson(doc)).toEqual([
      { level: 2, text: 'Nested', id: 'h-0' },
    ]);
  });

  it('defaults missing heading level to 1', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          content: [{ type: 'text', text: 'No level' }],
        },
      ],
    };
    expect(extractOutlineFromEditorJson(doc)).toEqual([
      { level: 1, text: 'No level', id: 'h-0' },
    ]);
  });

  it('returns empty list when doc has no headings', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'plain' }] }],
    };
    expect(extractOutlineFromEditorJson(doc)).toEqual([]);
  });
});
