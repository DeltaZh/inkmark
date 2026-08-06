import { useCallback, useReducer } from 'react';

export type Tab = {
  id: string;
  path: string | null;
  title: string;
  markdown: string;
  dirty: boolean;
};

export type TabsState = {
  tabs: Tab[];
  activeId: string | null;
};

export type TabsAction =
  | { type: 'create'; markdown?: string; path?: string | null; title?: string }
  | { type: 'close'; id: string }
  | { type: 'setActive'; id: string }
  | { type: 'updateMarkdown'; id: string; markdown: string }
  | { type: 'markSaved'; id: string; path: string }
  | { type: 'reloadContent'; id: string; markdown: string };

let nextTabSeq = 1;

function newTabId(): string {
  return `tab-${nextTabSeq++}`;
}

export function titleFromPath(path: string | null | undefined): string {
  if (!path) return '未命名';
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || '未命名';
}

/** 空标签状态（测试与 reducer 起点）；应用层用 useTabs 注入首个文档 */
export function createTabsState(): TabsState {
  return { tabs: [], activeId: null };
}

function createInitialState(initialMarkdown: string): TabsState {
  return tabsReducer(createTabsState(), {
    type: 'create',
    markdown: initialMarkdown,
  });
}

function mapTab(
  tabs: Tab[],
  id: string,
  updater: (tab: Tab) => Tab,
): Tab[] {
  return tabs.map((tab) => (tab.id === id ? updater(tab) : tab));
}

export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  switch (action.type) {
    case 'create': {
      const id = newTabId();
      const path = action.path ?? null;
      const tab: Tab = {
        id,
        path,
        title: action.title ?? titleFromPath(path),
        markdown: action.markdown ?? '',
        dirty: false,
      };
      return {
        tabs: [...state.tabs, tab],
        activeId: id,
      };
    }
    case 'close': {
      const idx = state.tabs.findIndex((t) => t.id === action.id);
      if (idx < 0) return state;
      const tabs = state.tabs.filter((t) => t.id !== action.id);
      if (tabs.length === 0) {
        return createInitialState('');
      }
      let activeId = state.activeId;
      if (activeId === action.id) {
        const neighbor = tabs[Math.max(0, idx - 1)] ?? tabs[0];
        activeId = neighbor.id;
      }
      return { tabs, activeId };
    }
    case 'setActive': {
      if (!state.tabs.some((t) => t.id === action.id)) return state;
      return { ...state, activeId: action.id };
    }
    case 'updateMarkdown': {
      return {
        ...state,
        tabs: mapTab(state.tabs, action.id, (tab) => ({
          ...tab,
          markdown: action.markdown,
          dirty: true,
        })),
      };
    }
    case 'markSaved': {
      return {
        ...state,
        tabs: mapTab(state.tabs, action.id, (tab) => ({
          ...tab,
          path: action.path,
          title: titleFromPath(action.path),
          dirty: false,
        })),
      };
    }
    case 'reloadContent': {
      return {
        ...state,
        tabs: mapTab(state.tabs, action.id, (tab) => ({
          ...tab,
          markdown: action.markdown,
          dirty: false,
        })),
      };
    }
    default:
      return state;
  }
}

export function getActiveTab(state: TabsState): Tab | null {
  if (!state.activeId) return null;
  return state.tabs.find((t) => t.id === state.activeId) ?? null;
}

export function useTabs(initialMarkdown = '') {
  const [state, dispatch] = useReducer(
    tabsReducer,
    initialMarkdown,
    createInitialState,
  );

  const createTab = useCallback(
    (opts?: { markdown?: string; path?: string | null; title?: string }) => {
      dispatch({
        type: 'create',
        markdown: opts?.markdown,
        path: opts?.path,
        title: opts?.title,
      });
    },
    [],
  );

  const closeTab = useCallback((id: string) => {
    dispatch({ type: 'close', id });
  }, []);

  const setActive = useCallback((id: string) => {
    dispatch({ type: 'setActive', id });
  }, []);

  const updateMarkdown = useCallback((id: string, markdown: string) => {
    dispatch({ type: 'updateMarkdown', id, markdown });
  }, []);

  const markSaved = useCallback((id: string, path: string) => {
    dispatch({ type: 'markSaved', id, path });
  }, []);

  const reloadContent = useCallback((id: string, markdown: string) => {
    dispatch({ type: 'reloadContent', id, markdown });
  }, []);

  return {
    state,
    activeTab: getActiveTab(state),
    createTab,
    closeTab,
    setActive,
    updateMarkdown,
    markSaved,
    reloadContent,
  };
}
