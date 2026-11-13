import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'tang-zhen-dismissed-xu-xun-sikong-174';

describe('A580 補列 174 年司空唐珍免職與許訓任職', () => {
  it('依卷八記錄兩項任免，不推測未標月份或玩家官職變動', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 174, endYear: 174, precision: 'year', introducedRevision: 246, lateSameYear: true });
    expect(node?.source).toContain('司空唐珍罷，永樂少府許訓為司空');
    expect(node?.description).toContain('不改動玩家官職');
    expect(node?.sourceDateNote).toContain('原典未對此句另標月份');
    expect(advancePhase4(createPhase4Model(173, 1, [], PHASE4_CONTENT_VERSION), 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
  });

  it('v245 舊存檔保留事件帳並可續玩；174 年存檔不回補', () => {
    const old = createPhase4Model(173, 1, [], 'phase4-scenario-245');
    const prefix = structuredClone(old.eventLedger);
    expect(old.nodes.some((node) => node.contentId === id)).toBe(false);

    const migrated = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(migrated, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(174, 1, [], 'phase4-scenario-245'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 174 });
    expect(late.eventLedger.some((event) => event.detail.includes('司空唐珍罷'))).toBe(false);
  });
});
