import { useEffect, useState } from 'react';
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { CodeBlockLangInput } from './CodeBlockLangInput';

async function renderMermaid(code: string): Promise<string> {
  const mermaid = (await import('mermaid')).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
  });
  const id = `mmd-${Math.random().toString(36).slice(2)}`;
  const { svg } = await mermaid.render(id, code);
  return svg;
}

/**
 * Editor 代码块结构（主题钩子）：
 *   .md-fences[position:relative]          ← 灰底/边框画在这里
 *     pre > code                           ← 内容，不再套第二层灰盒
 *     .code-tooltip > .ty-cm-lang-input    ← bottom:-2.5em，背景继承 fence
 */
export function CodeBlockNodeView({
  node,
  updateAttributes,
  extension,
}: NodeViewProps) {
  const language =
    (node.attrs.language as string | null | undefined) ||
    extension.options.defaultLanguage ||
    '';
  const code = node.textContent ?? '';
  const isMermaid = language === 'mermaid';
  const [svg, setSvg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState(true);

  useEffect(() => {
    if (!isMermaid || !preview) {
      setSvg(null);
      setErr(null);
      return;
    }
    let cancelled = false;
    void renderMermaid(code || 'graph TD; A-->B')
      .then((out) => {
        if (!cancelled) {
          setSvg(out);
          setErr(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSvg(null);
          setErr(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, isMermaid, preview]);

  return (
    <NodeViewWrapper
      className={`md-fences code-block-node${isMermaid ? ' md-diagram' : ''}`}
      data-language={language || 'plaintext'}
    >
      {isMermaid && preview && svg ? (
        <div
          className="md-diagram-panel"
          contentEditable={false}
          dangerouslySetInnerHTML={{ __html: svg }}
          onDoubleClick={() => setPreview(false)}
        />
      ) : null}
      {isMermaid && preview && err ? (
        <div className="md-diagram-error" contentEditable={false}>
          Mermaid: {err}
        </div>
      ) : null}
      <pre
        className="code-block-node__pre"
        style={
          isMermaid && preview && svg
            ? { display: 'none' }
            : undefined
        }
      >
        <code className={language ? `language-${language}` : undefined}>
          <NodeViewContent />
        </code>
      </pre>
      <div className="code-tooltip" contentEditable={false}>
        {isMermaid ? (
          <button
            type="button"
            className="code-block-node__preview-toggle"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? '编辑' : '预览'}
          </button>
        ) : null}
        <CodeBlockLangInput
          language={language}
          onChangeLanguage={(next) => updateAttributes({ language: next })}
        />
      </div>
    </NodeViewWrapper>
  );
}
