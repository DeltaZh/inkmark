import { invoke } from '@tauri-apps/api/core';

/** 同步原生菜单「专注 / 打字机」勾选状态 */
export async function setViewModeMenuChecked(
  focus: boolean,
  typewriter: boolean,
): Promise<void> {
  await invoke('set_view_mode_menu_checked', { focus, typewriter });
}
