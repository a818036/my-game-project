import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import { createOpeningFacts, dispatch, ENGINE_VERSION } from './engine';

const people = [{ id: 'sample-person', name: '示例人物', alive: true, location: '郡府', office: '縣令' }];
const nodeId = 'cao-cao-recovers-yanzhou-lu-bu-flees-195';

describe('A461 曹操收復兗州與呂布東奔', () => {
  it('指定人物與年份問答列出原典記事，且不改動玩家世界狀態', () => {
    const facts = createOpeningFacts(195, 184, { regions: [], surnames: [] });
    const state = dispatch(null, { version: ENGINE_VERSION, commandId: 'a461-history-query', expectedRevision: 0, type: 'StartGame', name: '查史主角', seed: 195, facts }).state!;
    const before = structuredClone(state);
    const answer = answerKnownHistoricalEventQuestion('曹操與呂布在 195 年發生了什麼事？', state);
    expect(answer?.answer).toContain('曹操收復兗州，呂布東奔劉備');
    expect(answer?.answer).toContain('《三國志》卷一');
    expect(state).toEqual(before);
  });

  it('v169 舊模型可續玩觸發 195 年節點，保留事件帳前綴且不回補同年與晚年存檔', () => {
    const fresh = advancePhase4(createPhase4Model(194, 1, people, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === nodeId)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('曹操收復兗州，呂布東奔劉備'));
    expect(event?.source).toContain('卷一〈魏書·武帝紀〉');
    expect(event?.source).toContain('分兵平定諸縣');

    const old = createPhase4Model(194, 1, people, 'phase4-scenario-169');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === nodeId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const resumed = advancePhase4(upgraded, 360);
    expect(resumed.nodes.find((node) => node.contentId === nodeId)?.status).toBe('triggered');
    expect(resumed.eventLedger.some((item) => item.detail.includes('曹操收復兗州，呂布東奔劉備'))).toBe(true);

    for (const year of [195, 196]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, people, 'phase4-scenario-169'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === nodeId)).toMatchObject({ status: 'resolved', resolvedYear: 195 });
      expect(late.eventLedger.some((item) => item.detail.includes('曹操收復兗州，呂布東奔劉備'))).toBe(false);
    }
  });
});
