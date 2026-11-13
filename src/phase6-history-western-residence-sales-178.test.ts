import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const id = 'xidi-sale-178';

function v251Save(): SaveFile {
  const facts = createOpeningFacts(591, 177, { regions: [], surnames: [] });
  const started = dispatch(null, {
    version: ENGINE_VERSION,
    commandId: 'a591-v251-start',
    expectedRevision: 0,
    type: 'StartGame',
    name: '驗收玩家',
    seed: 591,
    facts,
  });
  if (!started.event || started.event.type !== 'WorldCreated') throw new Error('無法建立 v251 開局事件');
  const event: GameEvent = { ...started.event, payload: { ...started.event.payload, phase4ContentVersion: 'phase4-scenario-251' } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('無法重播 v251 開局事件');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

function queryWorld(): GameState {
  const facts = createOpeningFacts(592, 178, { regions: [], surnames: [] });
  const started = dispatch(null, {
    version: ENGINE_VERSION,
    commandId: 'a591-question-world',
    expectedRevision: 0,
    type: 'StartGame',
    name: '驗收玩家',
    seed: 592,
    facts,
  });
  if (!started.state) throw new Error('無法建立年表問答測試世界線');
  return started.state;
}

describe('A591 補列 178 年西邸賣官記事', () => {
  it('依《後漢書》卷八記載西邸與公卿售官，不外推效果', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 178, endYear: 178, precision: 'year', introducedRevision: 252, lateSameYear: true });
    expect(node?.source).toContain('初開西邸賣官');
    expect(node?.source).toContain('公千萬、卿五百萬');
    expect(node?.description).toContain('不推算購買力');

    const fresh = advancePhase4(createPhase4Model(177, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((item) => item.contentId === id)?.status).toBe('triggered');

    const state = queryWorld();
    const before = structuredClone(state);
    const answer = answerKnownHistoricalEventQuestion('西元 178 年發生了什麼事？', state);
    expect(answer?.answer).toContain('西邸售官');
    expect(answer?.answer).toContain('《後漢書》卷八');
    expect(state).toEqual(before);
  });

  it('v251 舊存檔升級保留事件帳、續玩可觸發並可重播', () => {
    const old = v251Save();
    const prefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    expect(old.state.phase4?.nodes.some((node) => node.contentId === id)).toBe(false);

    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('pending');

    const continued = upgradePhase4Content(migrated.state.phase4!, PHASE4_CONTENT_VERSION);
    expect(continued.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(continued, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    expect(replay(migrated.events)).toEqual(migrated.state);

    const late = upgradePhase4Content(createPhase4Model(178, 1, [], 'phase4-scenario-251'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 178 });
    expect(late.eventLedger.some((item) => item.detail.includes('西邸賣官'))).toBe(false);
  });
});
