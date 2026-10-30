import { describe, expect, it } from 'vitest';
import { HISTORY_CONTENT } from './phase4';
// @ts-expect-error Node file-system types are not included in the browser app type environment.
import { readFileSync } from 'node:fs';

const numeral: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 零: 0, 〇: 0 };

function chineseNumber(value: string) {
  if (!/[十百]/.test(value)) return [...value].reduce((number, digit) => number * 10 + (numeral[digit] ?? 0), 0);
  let section = 0;
  let current = 0;
  for (const digit of value) {
    if (digit === '百') {
      section += (current || 1) * 100;
      current = 0;
    } else if (digit === '十') {
      section += (current || 1) * 10;
      current = 0;
    } else {
      current = numeral[digit] ?? 0;
    }
  }
  return section + current;
}

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
        const links = [...(row ?? '').matchAll(/\[([^\]]+)\]\((https:\/\/zh\.wikisource\.org\/[^)]+)\)/g)]
          .map(([, label, url]) => ({ label, target: decodeURIComponent(url) }));
        const references = [...event.source.matchAll(/《(三國志|後漢書|資治通鑑|晉書|宋書)》卷([一二三四五六七八九十百零〇]+)/g)];
        expect(links.length, `史實事件沒有來源連結：${event.id}`).toBeGreaterThan(0);
        for (const [, book, volume] of references) {
          const number = chineseNumber(volume);
          expect(links.some(({ label, target }) => {
            const simplifiedBook = book === '三國志' ? '三国志' : book;
            if (!target.includes(book) && !target.includes(simplifiedBook) && !label.includes(book)) return false;
            const targetVolume = target.match(/卷0*(\d+)/)?.[1];
            return targetVolume ? Number(targetVolume) === number : label.includes(`卷${volume}`);
          }),
            `來源連結未指向${book}卷${volume}：${event.id}`).toBe(true);
        }
      }
    }
  });
});
