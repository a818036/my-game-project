import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'xianbei-raids-three-frontiers-176';

describe('A583 補列 176 年鮮卑寇三邊記事', () => {
  it('依《資治通鑑》卷五十七保留原文範圍並與 177 年戰事分開', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 176, endYear: 176, precision: 'year', introducedRevision: 249, lateSameYear: true });
    expect(node?.source).toContain('鮮卑寇三邊');
    expect(node?.source).toContain('東、西、北邊');
    expect(node?.description).toContain('與 177 年三路出塞分開');
    expect(node?.sourceDateNote).toContain('夏四月');
    expect(advancePhase4(createPhase4Model(175, 1, [], PHASE4_CONTENT_VERSION), 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
  });

  it('v248 舊存檔保留事件帳並可續玩；176 年存檔不回補', () => {
    const old = createPhase4Model(175, 1, [], 'phase4-scenario-248');
    const prefix = structuredClone(old.eventLedger);
    expect(old.nodes.some((node) => node.contentId === id)).toBe(false);

    const migrated = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(migrated, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(176, 1, [], 'phase4-scenario-248'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 176 });
    expect(late.eventLedger.some((event) => event.detail.includes('鮮卑寇漢廷三邊'))).toBe(false);
  });
});
