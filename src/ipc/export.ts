import { invoke } from '@tauri-apps/api/core';

export type ExportedFile = {
  path: string;
};

/** 弹出保存对话框并写出完整 HTML 文档。 */
export function exportHtml(html: string): Promise<ExportedFile> {
  return invoke('export_html', { html });
}

/** 弹出保存对话框，将 HTML 转为 PDF 后写出。 */
export function exportPdf(html: string): Promise<ExportedFile> {
  return invoke('export_pdf', { html });
}

/** 弹出保存对话框并写出二进制（如 docx）。 */
export function exportBinary(
  bytes: number[],
  defaultName: string,
  extension: string,
  filterLabel: string,
): Promise<ExportedFile> {
  return invoke('export_binary', {
    bytes,
    defaultName,
    extension,
    filterLabel,
  });
}
