import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const ids = [
  'amnesty-xiping-5-176',
  'songgao-mountain-name-restored-176',
  'rain-prayer-and-prison-review-176',
  'chen-dan-removed-xu-xun-taiwei-176',
  'liu-yi-appointed-sikong-176',
  'xu-xun-removed-liu-kuan-taiwei-176',
  'rear-palace-locust-tree-uprooted-176',
  'yuan-wei-removed-yang-ci-situ-176',
  'ganling-prince-ding-dies-176',
  'elderly-taixue-students-appointed-176',
  'xianbei-raid-youzhou-176',
  'yellow-dragon-reported-peiguo-176',
] as const;

describe('A701 補列熹平五年本紀記事', () => {
  it('十二筆記事均保留來源精度，原文未繫月者不補日期', () => {
    const entries = ids.map(id => HISTORY_CONTENT.find(item => item.id === id));
    expect(entries.every(Boolean)).toBe(true);
    for (const item of entries) expect(item).toMatchObject({ startYear: 176, endYear: 176, precision: 'year', introducedRevision: 324 });
    expect(entries[0]?.source).toContain('夏四月癸亥');
    expect(entries[1]?.sourceDateNote).toContain('未另標月份');
    expect(entries[2]?.source).toContain('理冤枉');
    expect(entries[3]?.source).toContain('五月');
    expect(entries[4]?.source).toContain('六月壬戌');
    expect(entries[5]?.source).toContain('秋七月');
    expect(entries[6]?.source).toContain('冬十月壬午');
    expect(entries[7]?.source).toContain('十一月丙戌');
    expect(entries[8]?.source).toContain('十二月');
    expect(entries[9]?.source).toContain('百餘人');
    expect(entries[10]?.source).toContain('是歲');
    expect(entries[11]?.description).toContain('不判定現象真偽');
  });

  it('v323 舊 v6 存檔升至 v324 保留事件帳，跨年至 176 年逐項觸發', () => {
    const old = createPhase4Model(175, 1, [], 'phase4-scenario-323');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.some(node => node.contentId === 'drought-locust-seven-provinces-176')).toBe(false);
    expect(upgraded.nodes.find(node => node.contentId === 'drought-locust-seven-provinces-177')?.status).toBe('pending');

    const continued = advancePhase4(upgraded, 360);
    for (const id of ids) expect(continued.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(continued.nodes.find(node => node.contentId === 'drought-locust-seven-provinces-177')?.status).toBe('pending');
  });

  it('176 年及晚年存檔不回補新增記事，並保留十七年後節點年序', () => {
    for (const year of [176, 177, 180]) {
      const migrated = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-323'), PHASE4_CONTENT_VERSION);
      for (const id of ids) {
        expect(migrated.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 176 });
        expect(migrated.eventLedger.some(event => event.type === '史實事件形成' && event.detail.includes(HISTORY_CONTENT.find(item => item.id === id)!.title))).toBe(false);
      }
      const correctedDrought = migrated.nodes.find(node => node.contentId === 'drought-locust-seven-provinces-177');
      if (year === 176) expect(correctedDrought?.status).toBe('pending');
      else expect(correctedDrought).toMatchObject({ status: 'resolved', resolvedYear: 177 });
    }
  });
});
