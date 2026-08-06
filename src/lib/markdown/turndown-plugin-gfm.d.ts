declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown';

  export function gfm(service: TurndownService): TurndownService;
  export function strikethrough(service: TurndownService): TurndownService;
  export function tables(service: TurndownService): TurndownService;
  export function taskListItems(service: TurndownService): TurndownService;
}
