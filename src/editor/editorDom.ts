/** 主题钩子：在不破坏 TipTap schema 的前提下挂 class / 属性 */

export const WRITE_ROOT_ID = 'write';

export const editorHeadingHTMLAttributes: Record<string, string> = {
  class: 'md-heading',
};

export const editorParagraphHTMLAttributes: Record<string, string> = {
  class: 'md-p',
};

export const editorCodeBlockHTMLAttributes: Record<string, string> = {
  class: 'md-fences',
};

export const editorBlockquoteHTMLAttributes: Record<string, string> = {
  class: 'md-quote',
};

export const editorLinkHTMLAttributes: Record<string, string> = {
  class: 'md-link',
};

export const editorImageHTMLAttributes: Record<string, string> = {
  class: 'md-image',
};
