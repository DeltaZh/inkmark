import type { Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { common, createLowlight } from 'lowlight';
import { CodeBlockNodeView } from './CodeBlockNodeView';
import { EditorImage } from './EditorImage';
import { EditorTaskItem } from './EditorTaskItem';
import { TaskAutoConvert } from './taskAutoConvert';
import { EditorViewModes } from './viewModes';
import { SmartPunctuation } from './smartPunctuation';
import { MathBlock, MathInline } from './EditorMath';
import { EditorToc } from './EditorToc';
import { EditorYaml } from './EditorYaml';
import { FootnoteDef } from './EditorFootnote';
import {
  EditorBold,
  EditorItalic,
  EditorStrike,
  EditorShortcuts,
} from './editorShortcuts';
import { EditorSelectAll } from './editorSelectAll';
import {
  editorBlockquoteHTMLAttributes,
  editorCodeBlockHTMLAttributes,
  editorHeadingHTMLAttributes,
  editorImageHTMLAttributes,
  editorLinkHTMLAttributes,
  editorParagraphHTMLAttributes,
} from './editorDom';

const lowlight = createLowlight(common);

lowlight.registerAlias({
  javascript: ['js'],
  typescript: ['ts'],
  bash: ['sh', 'shell', 'zsh'],
});

const CodeBlockWithLang = CodeBlockLowlight.extend({
  addNodeView() {
    // md-fences 必须在 NodeViewWrapper 上（含 .code-tooltip），
    // 才能成为语言条 absolute 的定位包含块；不要只挂在外层 react-renderer。
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },
}).configure({
  lowlight,
  defaultLanguage: null,
  HTMLAttributes: editorCodeBlockHTMLAttributes,
});

export function createExtensions(): Extensions {
  return [
    StarterKit.configure({
      codeBlock: false,
      bold: false,
      italic: false,
      strike: false,
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
        HTMLAttributes: editorHeadingHTMLAttributes,
      },
      paragraph: {
        HTMLAttributes: editorParagraphHTMLAttributes,
      },
      blockquote: {
        HTMLAttributes: editorBlockquoteHTMLAttributes,
      },
      link: {
        openOnClick: false,
        HTMLAttributes: editorLinkHTMLAttributes,
      },
    }),
    Markdown.configure({
      markedOptions: {
        gfm: true,
        breaks: false,
      },
    }),
    EditorBold,
    EditorItalic,
    EditorStrike,
    Highlight.configure({
      multicolor: false,
      HTMLAttributes: { class: 'md-highlight' },
    }),
    Subscript,
    Superscript,
    MathInline,
    MathBlock,
    EditorToc,
    EditorYaml,
    FootnoteDef,
    CodeBlockWithLang,
    EditorImage.configure({
      allowBase64: true,
      HTMLAttributes: editorImageHTMLAttributes,
    }),
    TableKit.configure({
      table: {
        // 关闭拖拽改列宽，避免写入固定 px；改由 CSS 铺满 + 按内容分配
        resizable: false,
        HTMLAttributes: {
          class: 'md-table',
        },
      },
    }),
    TaskList.configure({
      HTMLAttributes: {
        class: 'contains-task-list',
      },
    }),
    EditorTaskItem,
    TaskAutoConvert,
    Placeholder.configure({
      placeholder: '开始书写…',
    }),
    EditorShortcuts,
    EditorSelectAll,
    EditorViewModes,
    SmartPunctuation,
  ];
}
