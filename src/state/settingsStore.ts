import {
  fetchSettings,
  persistSettings,
  type Settings,
} from '../ipc/settings';

let cached: Settings | null = null;

type SettingsListener = (settings: Settings) => void;
const listeners = new Set<SettingsListener>();

function notify(settings: Settings): void {
  for (const listener of listeners) {
    listener(settings);
  }
}

export function getCachedSettings(): Settings | null {
  return cached;
}

/** 订阅设置变更；返回取消订阅函数 */
export function subscribeSettings(listener: SettingsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function loadSettings(): Promise<Settings> {
  cached = await fetchSettings();
  notify(cached);
  return cached;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await persistSettings(settings);
  cached = settings;
  notify(settings);
}

export async function patchSettings(partial: Partial<Settings>): Promise<Settings> {
  const current = cached ?? (await loadSettings());
  const next: Settings = { ...current, ...partial };
  await saveSettings(next);
  return next;
}
