import { describe, it, expect } from 'vitest';
import { createTabsState, tabsReducer } from './tabsStore';

describe('tabsReducer', () => {
  it('marks dirty on markdown change', () => {
    let s = createTabsState();
    s = tabsReducer(s, { type: 'create', markdown: '# A\n' });
    const id = s.tabs[0].id;
    s = tabsReducer(s, { type: 'updateMarkdown', id, markdown: '# B\n' });
    expect(s.tabs[0].dirty).toBe(true);
  });

  it('clear dirty on markSaved', () => {
    let s = createTabsState();
    s = tabsReducer(s, { type: 'create', markdown: 'x', path: '/tmp/a.md' });
    s = tabsReducer(s, {
      type: 'updateMarkdown',
      id: s.tabs[0].id,
      markdown: 'y',
    });
    s = tabsReducer(s, {
      type: 'markSaved',
      id: s.tabs[0].id,
      path: '/tmp/a.md',
    });
    expect(s.tabs[0].dirty).toBe(false);
    expect(s.tabs[0].path).toBe('/tmp/a.md');
  });

  it('reloadContent replaces markdown and clears dirty', () => {
    let s = createTabsState();
    s = tabsReducer(s, { type: 'create', markdown: 'old', path: '/tmp/a.md' });
    const id = s.tabs[0].id;
    s = tabsReducer(s, { type: 'updateMarkdown', id, markdown: 'edited' });
    expect(s.tabs[0].dirty).toBe(true);
    s = tabsReducer(s, {
      type: 'reloadContent',
      id,
      markdown: 'from-disk',
    });
    expect(s.tabs[0].markdown).toBe('from-disk');
    expect(s.tabs[0].dirty).toBe(false);
  });

  it('create with path and title', () => {
    let s = createTabsState();
    s = tabsReducer(s, {
      type: 'create',
      markdown: '# Doc\n',
      path: '/tmp/readme.md',
      title: '自定义标题',
    });
    expect(s.tabs).toHaveLength(1);
    expect(s.tabs[0].path).toBe('/tmp/readme.md');
    expect(s.tabs[0].title).toBe('自定义标题');
    expect(s.tabs[0].markdown).toBe('# Doc\n');
    expect(s.tabs[0].dirty).toBe(false);
    expect(s.activeId).toBe(s.tabs[0].id);
  });

  it('create with path derives title from path when title omitted', () => {
    let s = createTabsState();
    s = tabsReducer(s, {
      type: 'create',
      path: '/home/user/notes.md',
    });
    expect(s.tabs[0].title).toBe('notes.md');
  });

  it('close active tab activates left neighbor', () => {
    let s = createTabsState();
    s = tabsReducer(s, { type: 'create', markdown: 'a', title: 'A' });
    const idA = s.tabs[0].id;
    s = tabsReducer(s, { type: 'create', markdown: 'b', title: 'B' });
    const idB = s.tabs[1].id;
    s = tabsReducer(s, { type: 'create', markdown: 'c', title: 'C' });
    const idC = s.tabs[2].id;
    expect(s.activeId).toBe(idC);

    s = tabsReducer(s, { type: 'close', id: idC });
    expect(s.tabs).toHaveLength(2);
    expect(s.activeId).toBe(idB);
    expect(s.tabs.map((t) => t.title)).toEqual(['A', 'B']);

    s = tabsReducer(s, { type: 'close', id: idB });
    expect(s.tabs).toHaveLength(1);
    expect(s.activeId).toBe(idA);
  });

  it('close first tab when active activates next tab', () => {
    let s = createTabsState();
    s = tabsReducer(s, { type: 'create', markdown: 'a', title: 'A' });
    const idA = s.tabs[0].id;
    s = tabsReducer(s, { type: 'create', markdown: 'b', title: 'B' });
    const idB = s.tabs[1].id;
    s = tabsReducer(s, { type: 'setActive', id: idA });

    s = tabsReducer(s, { type: 'close', id: idA });
    expect(s.tabs).toHaveLength(1);
    expect(s.activeId).toBe(idB);
  });

  it('close last tab recreates empty document', () => {
    let s = createTabsState();
    s = tabsReducer(s, { type: 'create', markdown: 'only', title: 'Only' });
    const idOnly = s.tabs[0].id;

    s = tabsReducer(s, { type: 'close', id: idOnly });
    expect(s.tabs).toHaveLength(1);
    expect(s.tabs[0].id).not.toBe(idOnly);
    expect(s.tabs[0].markdown).toBe('');
    expect(s.tabs[0].path).toBeNull();
    expect(s.tabs[0].title).toBe('未命名');
    expect(s.tabs[0].dirty).toBe(false);
    expect(s.activeId).toBe(s.tabs[0].id);
  });

  it('setActive with invalid id is no-op', () => {
    let s = createTabsState();
    s = tabsReducer(s, { type: 'create', markdown: 'x' });
    const before = { tabs: [...s.tabs], activeId: s.activeId };

    s = tabsReducer(s, { type: 'setActive', id: 'tab-nonexistent' });
    expect(s.tabs).toEqual(before.tabs);
    expect(s.activeId).toBe(before.activeId);
  });
});
