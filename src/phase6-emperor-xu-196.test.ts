import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import { createOpeningFacts, dispatch, ENGINE_VERSION } from './engine';

const people = [{ id: 'sample-person', name: '示例人物', alive: true, location: '郡府', office: '縣令' }];
const nodeId = 'emperor-relocates-xu-196';

describe('A463 補足 196 年迎帝、討黃巾與遷都記事', () => {
  it('詳列年內來源記事及月序，但遊戲維持年級精度', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === nodeId);
    expect(node).toMatchObject({ startYear: 196, endYear: 196, precision: 'year' });
    expect(node?.source).toContain('正月曹操遣曹洪西迎天子受阻');
    expect(node?.source).toContain('二月討破汝南、潁川黃巾');
    expect(node?.source).toContain('七月楊奉、韓暹奉天子還洛陽');
    expect(node?.source).toContain('九月車駕西出轘轅而東');
    expect(node?.description).toContain('不將它們推演成逐月行程');

    const facts = createOpeningFacts(463, 184, { regions: [], surnames: [] });
    const state = dispatch(null, { version: ENGINE_VERSION, commandId: 'a463-history-query', expectedRevision: 0, type: 'StartGame', name: '查史主角', seed: 463, facts }).state!;
    const before = structuredClone(state);
    const answer = answerKnownHistoricalEventQuestion('196 年發生什麼事？', state);
    expect(answer?.answer).toContain('已收錄的史實事件（採年級精度）');
    expect(answer?.answer).toContain('迎帝受阻');
    expect(answer?.answer).toContain('劉辟、黃邵遇斬');
    expect(answer?.answer).toContain('授曹操節鉞');
    expect(state).toEqual(before);
  });

  it('v170 舊模型補入來源而不重複結算，續玩、事件前綴及重複升版保持一致', () => {
    const fresh = advancePhase4(createPhase4Model(195, 1, people, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === nodeId)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('獻帝遷都許縣'));
    expect(event?.source).toContain('正月曹操遣曹洪西迎天子受阻');
    expect(event?.source).toContain('二月討破汝南、潁川黃巾');

    const old = createPhase4Model(196, 1, people, 'phase4-scenario-170');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === nodeId)?.evidence).toEqual([expect.stringContaining('建安元年迎帝與遷都記事補充')]);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.eventLedger).toEqual(prefix);
    const repeated = upgradePhase4Content(upgraded, PHASE4_CONTENT_VERSION);
    expect(repeated.eventLedger).toEqual(upgraded.eventLedger);
    expect(repeated.nodes.find((node) => node.contentId === nodeId)?.evidence).toEqual(upgraded.nodes.find((node) => node.contentId === nodeId)?.evidence);

    const beforeYear = upgradePhase4Content(createPhase4Model(195, 1, people, 'phase4-scenario-170'), PHASE4_CONTENT_VERSION);
    expect(beforeYear.nodes.find((node) => node.contentId === nodeId)?.status).toBe('pending');
    expect(advancePhase4(beforeYear, 360).nodes.find((node) => node.contentId === nodeId)?.status).toBe('triggered');
  });
});
