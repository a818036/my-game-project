import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import { createOpeningFacts, dispatch, ENGINE_VERSION } from './engine';

const people = [{ id: 'sample-person', name: '示例人物', alive: true, location: '郡府', office: '縣令' }];
const nodeId = 'tao-qian-dies-liu-bei-leads-xuzhou-194';

describe('A453 陶謙去世與劉備領徐州', () => {
  it('指定人物與年份查詢列出來源，且不改變玩家世界狀態', () => {
    const facts = createOpeningFacts(194, 184, { regions: [], surnames: [] });
    const state = dispatch(null, { version: ENGINE_VERSION, commandId: 'a453-history-query', expectedRevision: 0, type: 'StartGame', name: '查史主角', seed: 194, facts }).state!;
    const before = structuredClone(state);
    const answer = answerKnownHistoricalEventQuestion('陶謙在 194 年發生了什麼事？', state);
    expect(answer?.answer).toContain('陶謙去世，劉備領徐州');
    expect(answer?.answer).toContain('卷三十二〈蜀書·先主傳〉');
    expect(state).toEqual(before);
  });

  it('以原典年級記事觸發，舊存檔升版保留前綴且不回補同年或晚年', () => {
    const fresh = advancePhase4(createPhase4Model(193, 1, people, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === nodeId)?.status).toBe('triggered');
    const freshEvent = fresh.eventLedger.find((item) => item.detail.includes('陶謙去世，劉備領徐州'));
    expect(freshEvent?.source).toContain('《三國志》卷八');
    expect(freshEvent?.source).toContain('卷三十二');
    expect(freshEvent?.source).toContain('非劉備不能安此州');

    const old = createPhase4Model(193, 1, people, 'phase4-scenario-168');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === nodeId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === nodeId)?.status).toBe('triggered');

    for (const year of [194, 195]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, people, 'phase4-scenario-168'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === nodeId)).toMatchObject({ status: 'resolved', resolvedYear: 194 });
      expect(late.eventLedger.some((item) => item.detail.includes('陶謙去世，劉備領徐州'))).toBe(false);
    }
  });
});
