import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const obsoleteId = 'drought-locust-seven-provinces-176';
const correctedId = 'drought-locust-seven-provinces-177';

describe('A582 年序勘誤：大旱與七州蝗災屬於 177 年', () => {
  it('保留 176 年舊索引作退役標記，並依原典熹平六年另建 177 年節點', () => {
    const obsolete = HISTORY_CONTENT.find((item) => item.id === obsoleteId);
    const corrected = HISTORY_CONTENT.find((item) => item.id === correctedId);
    expect(obsolete).toMatchObject({ startYear: 176, endYear: 176, introducedRevision: 248, retired: true, retiredIn: 'phase4-scenario-324' });
    expect(obsolete?.source).toContain('熹平六年（177）');
    expect(corrected).toMatchObject({ startYear: 177, endYear: 177, precision: 'year', introducedRevision: 324 });
    expect(corrected?.source).toContain('熹平六年夏四月條');
    expect(corrected?.description).toContain('不推定七州範圍');
    expect(corrected?.sourceDateNote).toContain('更正舊版誤繫熹平五年');
    const fresh = createPhase4Model(176, 1, [], PHASE4_CONTENT_VERSION);
    expect(fresh.nodes.some((item) => item.contentId === obsoleteId)).toBe(false);
    expect(fresh.nodes.find((item) => item.contentId === correctedId)?.status).toBe('pending');
  });

  it('v323 舊存檔保留事件帳，176 年續玩不觸發錯置災異，177 年可正常觸發', () => {
    const old = createPhase4Model(175, 1, [], 'phase4-scenario-323');
    const prefix = structuredClone(old.eventLedger);
    expect(old.nodes.some((node) => node.contentId === correctedId)).toBe(false);

    const migrated = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find((node) => node.contentId === obsoleteId)).toBeUndefined();
    expect(migrated.nodes.find((node) => node.contentId === correctedId)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const year176 = advancePhase4(migrated, 360);
    expect(year176.nodes.find((node) => node.contentId === correctedId)?.status).toBe('pending');
    const year177 = advancePhase4(year176, 360);
    expect(year177.nodes.find((node) => node.contentId === correctedId)?.status).toBe('triggered');
    expect(year177.nodes.some((node) => node.contentId === obsoleteId)).toBe(false);
  });

  it('舊年序已結算時只追加勘誤，正確 177 年記事不回溯補發', () => {
    const wronglyTriggered = createPhase4Model(176, 1, [], 'phase4-scenario-323');
    expect(wronglyTriggered.nodes.find((node) => node.contentId === obsoleteId)?.status).toBe('triggered');
    const oldLedger = structuredClone(wronglyTriggered.eventLedger);
    const migrated = upgradePhase4Content(wronglyTriggered, PHASE4_CONTENT_VERSION);
    expect(migrated.eventLedger.slice(0, oldLedger.length)).toEqual(oldLedger);
    expect(migrated.nodes.find((node) => node.contentId === obsoleteId)).toBeUndefined();
    expect(migrated.nodes.find((node) => node.contentId === correctedId)).toMatchObject({ status: 'pending' });
    expect(migrated.eventLedger.some((event) => event.type === '史實資料勘誤' && event.detail.includes('熹平六年（177）'))).toBe(true);
    expect(migrated.eventLedger.slice(oldLedger.length).some((event) => event.type === '史實事件形成' && event.detail.includes('大旱與七州蝗災'))).toBe(false);
  });

  it('177 年及晚年舊存檔不回補正確節點', () => {
    for (const year of [177, 178]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-323'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === correctedId)).toMatchObject({ status: 'resolved', resolvedYear: 177 });
      expect(late.eventLedger.some((event) => event.type === '史實事件形成' && event.detail.includes('大旱與七州蝗災'))).toBe(false);
    }
  });
});
