import { invoke } from '@tauri-apps/api/core';

export type OpenedFile = {
  path: string;
  content: string;
};

export type SavedFile = {
  path: string;
};

export type MarkdownTreeNode = {
  name: string;
  path: string;
  kind: 'file' | 'dir' | string;
  children?: MarkdownTreeNode[];
};

export type MarkdownDirListing = {
  root: string;
  entries: MarkdownTreeNode[];
  truncated: boolean;
};

export function openFile(): Promise<OpenedFile> {
  return invoke('open_file');
}

export type ImportedDocument = {
  path: string;
  kind: string;
  text?: string | null;
  bytes?: number[] | null;
};

/** 导入 Markdown / 文本 / HTML / Word */
export function importDocument(): Promise<ImportedDocument> {
  return invoke('import_document');
}

/** 用系统默认应用打开 README */
export function openReadme(): Promise<void> {
  return invoke('open_readme');
}

/** 打开文件夹对话框，返回绝对路径 */
export function openFolderDialog(): Promise<string> {
  return invoke('open_folder_dialog');
}

/** 递归列出目录下的 Markdown 文件树 */
export function listDirMarkdown(path: string): Promise<MarkdownDirListing> {
  return invoke('list_dir_markdown', { path });
}

export function readFile(path: string): Promise<string> {
  return invoke('read_file', { path });
}

export function writeFile(path: string, content: string): Promise<void> {
  return invoke('write_file', { path, content });
}

export function saveFileAs(content: string): Promise<SavedFile> {
  return invoke('save_file_as', { content });
}

/** 文件修改时间（Unix 毫秒） */
export function getFileMtime(path: string): Promise<number> {
  return invoke('get_file_mtime', { path });
}

export function saveImageAsset(
  docPath: string,
  bytes: number[],
  ext: string,
): Promise<string> {
  return invoke('save_image_asset', { docPath, bytes, ext });
}

function errorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error ?? '');
}

/** 用户取消对话框时后端返回的稳定错误码前缀（见 Rust `ERR_CANCELLED`） */
export const IPC_CANCELLED_PREFIX = 'CANCELLED:';

/** 用户取消对话框时后端返回的错误 */
export function isUserCancelled(error: unknown): boolean {
  return errorMessage(error).startsWith(IPC_CANCELLED_PREFIX);
}

export function formatFileError(error: unknown): string {
  return errorMessage(error) || '文件操作失败';
}
