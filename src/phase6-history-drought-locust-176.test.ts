import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'drought-locust-seven-provinces-176';

describe('A582 補列 176 年大旱與七州蝗災', () => {
  it('依卷八記錄原文災異，不推測州名與社會後果', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 176, endYear: 176, precision: 'year', introducedRevision: 248, lateSameYear: true });
    expect(node?.source).toContain('大旱，七州蝗');
    expect(node?.description).toContain('不推定七州範圍');
    expect(node?.sourceDateNote).toContain('夏四月');
    expect(advancePhase4(createPhase4Model(175, 1, [], PHASE4_CONTENT_VERSION), 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
  });

  it('v247 舊存檔保留事件帳並可續玩；176 年存檔不回補', () => {
    const old = createPhase4Model(175, 1, [], 'phase4-scenario-247');
    const prefix = structuredClone(old.eventLedger);
    expect(old.nodes.some((node) => node.contentId === id)).toBe(false);

    const migrated = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(migrated, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(176, 1, [], 'phase4-scenario-247'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 176 });
    expect(late.eventLedger.some((event) => event.detail.includes('大旱，七州蝗災'))).toBe(false);
  });
});
