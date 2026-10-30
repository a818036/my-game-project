import { describe, expect, it } from 'vitest';
import { HISTORY_CONTENT } from './phase4';
// @ts-expect-error Node file-system types are not included in the browser app type environment.
import { readFileSync } from 'node:fs';

describe('A304 歷史內容來源索引', () => {
  it('每個現行事件都有索引列，史實事件列出可點擊原典來源', () => {
    const document = readFileSync(new URL('../docs/HISTORY_CONTENT.md', import.meta.url), 'utf8');
    const rows = new Map([...document.matchAll(/^\| `([^`]+)` \|([^\r\n]*)/gm)].map(([, id, rest]) => [id, rest]));
    const activeEvents = HISTORY_CONTENT.filter((item) => item.kind === 'event' && !item.retired);

    expect(activeEvents).toHaveLength(159);
    for (const event of activeEvents) {
      const row = rows.get(event.id);
      expect(row, `缺少事件索引列：${event.id}`).toBeDefined();
      if (!event.source.includes('非史實')) {
        expect(row, `史實事件沒有來源連結：${event.id}`).toMatch(/\]\(https:\/\/zh\.wikisource\.org\//);
      }
    }
  });
});
