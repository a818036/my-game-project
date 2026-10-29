import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const persons = [{ id: 'sample-person', name: '示例人物', alive: true, location: '郡府', office: '縣令' }];
const eventId = 'yizhou-ma-xiang-revolt-188';

describe('188 年益州馬相起事節點', () => {
  it('按來源觸發，將 v85 舊存檔追加升級且不回補較晚年份', () => {
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(134);

    const fresh = advancePhase4(createPhase4Model(187, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('益州馬相起事、賈龍迎劉焉'));
    expect(event?.source).toContain('《資治通鑑》卷五十九');
    expect(event?.source).toContain('中平五年六月');
    expect(event?.source).toContain('《後漢書》卷七十五');
    expect(event?.source).toContain('攻取三郡');

    const old = createPhase4Model(187, 1, persons, 'phase4-scenario-85');
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

describe('187 年長沙區星起事節點', () => {
  it('保留史料異名並按年觸發，遷移不補寫晚年存檔', () => {
    const eventId = 'changsha-ou-xing-revolt-187';
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(134);

    const fresh = advancePhase4(createPhase4Model(186, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('長沙區星起事、孫堅平定'));
    expect(event?.source).toContain('《資治通鑑》卷五十八');
    expect(event?.source).toContain('考異');
    expect(event?.source).toContain('觀鵠');
    expect(event?.source).toContain('《三國志》卷四十六');

    const old = createPhase4Model(186, 1, persons, 'phase4-scenario-85');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === eventId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(188, 1, persons, 'phase4-scenario-85'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === eventId)).toMatchObject({ status: 'resolved', resolvedYear: 187 });
    expect(late.eventLedger.some((item) => item.detail.includes('長沙區星起事、孫堅平定'))).toBe(false);
  });
});

describe('185–186 年涼州與江夏事件', () => {
  it('連續兩年事件依年觸發，v86 遷移保留事件前綴且不回補', () => {
    const meiyangId = 'liangzhou-meiyang-campaign-185';
    const zhaoCiId = 'zhao-ci-revolt-186';
    const fresh = advancePhase4(createPhase4Model(184, 1, persons, PHASE4_CONTENT_VERSION), 720);
    expect(fresh.nodes.find((node) => node.contentId === meiyangId)?.status).toBe('triggered');
    expect(fresh.nodes.find((node) => node.contentId === zhaoCiId)?.status).toBe('triggered');
    const meiyang = fresh.eventLedger.find((item) => item.detail.includes('張溫征涼州、美陽戰事'));
    expect(meiyang?.source).toContain('《資治通鑑》卷五十八');
    expect(meiyang?.source).toContain('孫堅');
    const zhaoCi = fresh.eventLedger.find((item) => item.detail.includes('江夏兵趙慈起事、王敏討平'));
    expect(zhaoCi?.source).toContain('殺南陽太守秦頡');
    expect(zhaoCi?.source).toContain('王敏');

    const old = createPhase4Model(184, 1, persons, 'phase4-scenario-86');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === meiyangId)?.status).toBe('pending');
    expect(upgraded.nodes.find((node) => node.contentId === zhaoCiId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === meiyangId)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(187, 1, persons, 'phase4-scenario-86'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === meiyangId)).toMatchObject({ status: 'resolved', resolvedYear: 185 });
    expect(late.nodes.find((node) => node.contentId === zhaoCiId)).toMatchObject({ status: 'resolved', resolvedYear: 186 });
    expect(late.eventLedger.some((item) => item.detail.includes('張溫征涼州、美陽戰事'))).toBe(false);
    expect(late.eventLedger.some((item) => item.detail.includes('江夏兵趙慈起事、王敏討平'))).toBe(false);
  });
});

describe('199 年孫權隨孫策征伐節點', () => {
  it('按《三國志》年級來源觸發，v104 遷移保留事件前綴且不回補', () => {
    const eventId = 'sun-quan-joins-sun-ce-expedition-199';
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(134);

    const fresh = advancePhase4(createPhase4Model(198, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('孫權隨孫策征劉勳、轉討黃祖'));
    expect(event?.source).toContain('《三國志》卷四十七');
    expect(event?.source).toContain('建安四年');
    expect(event?.source).toContain('征廬江太守劉勳');
    expect(event?.source).toContain('進討黃祖於沙羨');

    const old = createPhase4Model(198, 1, persons, 'phase4-scenario-104');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === eventId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');

    const sameYear = upgradePhase4Content(createPhase4Model(199, 1, persons, 'phase4-scenario-104'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === eventId)).toMatchObject({ status: 'resolved', resolvedYear: 199 });
    const late = upgradePhase4Content(createPhase4Model(200, 1, persons, 'phase4-scenario-104'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === eventId)).toMatchObject({ status: 'resolved', resolvedYear: 199 });
    expect(late.eventLedger.some((item) => item.detail.includes('孫權隨孫策征劉勳、轉討黃祖'))).toBe(false);
  });
});
