import { describe, expect, it } from 'vitest';
import { MENU_EVENT, menuEventId } from './menuEvents';

describe('menuEvents', () => {
  it('uses menu:// prefix for frontend event names', () => {
    expect(MENU_EVENT.new).toBe('menu://new');
    expect(MENU_EVENT.open).toBe('menu://open');
    expect(MENU_EVENT.openFolder).toBe('menu://open-folder');
    expect(MENU_EVENT.openRecent).toBe('menu://open-recent');
    expect(MENU_EVENT.clearRecent).toBe('menu://clear-recent');
    expect(MENU_EVENT.save).toBe('menu://save');
    expect(MENU_EVENT.saveAs).toBe('menu://save-as');
    expect(MENU_EVENT.closeTab).toBe('menu://close-tab');
    expect(MENU_EVENT.exportHtml).toBe('menu://export-html');
    expect(MENU_EVENT.exportPdf).toBe('menu://export-pdf');
    expect(MENU_EVENT.exportDocx).toBe('menu://export-docx');
    expect(MENU_EVENT.exportHtmlPlain).toBe('menu://export-html-plain');
    expect(MENU_EVENT.import).toBe('menu://import');
    expect(MENU_EVENT.openQuickly).toBe('menu://open-quickly');
    expect(MENU_EVENT.copyWord).toBe('menu://copy-word');
    expect(MENU_EVENT.selectAll).toBe('menu://select-all');
    expect(MENU_EVENT.print).toBe('menu://print');
    expect(MENU_EVENT.spellCheck).toBe('menu://spell-check');
    expect(MENU_EVENT.help).toBe('menu://help');
    expect(MENU_EVENT.helpReadme).toBe('menu://help-readme');
    expect(MENU_EVENT.theme).toBe('menu://theme');
    expect(MENU_EVENT.settings).toBe('menu://settings');
    expect(MENU_EVENT.toggleOutline).toBe('menu://toggle-outline');
    expect(MENU_EVENT.toggleFileTree).toBe('menu://toggle-file-tree');
  });

  it('maps menu item id to event name', () => {
    expect(menuEventId('new')).toBe('menu://new');
    expect(menuEventId('save-as')).toBe('menu://save-as');
  });
});
