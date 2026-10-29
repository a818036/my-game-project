import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const persons = [{ id: 'sample-person', name: '示例人物', alive: true, location: '郡府', office: '縣令' }];
const eventId = 'yizhou-ma-xiang-revolt-188';

describe('188 年益州馬相起事節點', () => {
  it('按來源觸發，將 v84 舊存檔追加升級且不回補較晚年份', () => {
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event')).toHaveLength(106);

    const fresh = advancePhase4(createPhase4Model(187, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('益州馬相起事、賈龍迎劉焉'));
    expect(event?.source).toContain('《資治通鑑》卷五十九');
    expect(event?.source).toContain('中平五年六月');
    expect(event?.source).toContain('《後漢書》卷七十五');
    expect(event?.source).toContain('攻取三郡');

    const old = createPhase4Model(187, 1, persons, 'phase4-scenario-84');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === eventId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(189, 1, persons, 'phase4-scenario-84'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === eventId)).toMatchObject({ status: 'resolved', resolvedYear: 188 });
    expect(late.eventLedger.some((item) => item.detail.includes('益州馬相起事、賈龍迎劉焉'))).toBe(false);
  });
});
