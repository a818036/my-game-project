import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const id = 'capital-horse-human-anomaly-178';

function saveAtVersion(year: number, contentVersion: string, seed: number): SaveFile {
  const facts = createOpeningFacts(seed, year, { regions: [], surnames: [] });
  const started = dispatch(null, {
    version: ENGINE_VERSION,
    commandId: `a594-start-${seed}`,
    expectedRevision: 0,
    type: 'StartGame',
    name: '史料驗收',
    seed,
    facts,
  });
  if (!started.event || started.event.type !== 'WorldCreated') throw new Error('無法建立 A594 舊存檔');
  const event: GameEvent = { ...started.event, payload: { ...started.event.payload, phase4ContentVersion: contentVersion } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('無法重播 A594 舊存檔');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

function questionWorld(): GameState {
  const started = dispatch(null, {
    version: ENGINE_VERSION,
    commandId: 'a594-question-world',
    expectedRevision: 0,
    type: 'StartGame',
    name: '史料驗收',
    seed: 594,
    facts: createOpeningFacts(594, 178, { regions: [], surnames: [] }),
  });
  if (!started.state) throw new Error('無法建立 A594 年表問答世界線');
  return started.state;
}

describe('A594 補列 178 年京師馬生人記事', () => {
  it('只記錄《後漢書》異象文字，不把災異注解當成遊戲因果', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 178, endYear: 178, precision: 'year', introducedRevision: 254 });
    expect(node?.source).toContain('是歲');
    expect(node?.source).toContain('京師馬生人');
    expect(node?.source).toContain('不據《易傳》推斷因果');
    expect(node?.description).toContain('不把字面內容當作可驗證的生物事實');

    const fresh = advancePhase4(createPhase4Model(177, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((item) => item.contentId === id)?.status).toBe('triggered');

    const state = questionWorld();
    const before = structuredClone(state);
    const answer = answerKnownHistoricalEventQuestion('西元 178 年有哪些史書記載的異象？', state);
    expect(answer?.answer).toContain('京師馬生人');
    expect(answer?.answer).toContain('《後漢書》卷八');
    expect(state).toEqual(before);
  });

  it('v253 舊 v6 存檔升級保留帳本，續玩觸發且已過年份不回補', () => {
    const old = saveAtVersion(177, 'phase4-scenario-253', 595);
    const prefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    expect(old.state.phase4?.nodes.some((item) => item.contentId === id)).toBe(false);

    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find((item) => item.contentId === id)?.status).toBe('pending');
    expect(advancePhase4(migrated.state.phase4!, 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
    expect(replay(migrated.events)).toEqual(migrated.state);

    for (const year of [178, 179]) {
      const late = verifySave(toJson(saveAtVersion(year, 'phase4-scenario-253', 595 + year)));
      expect(late.state.phase4?.nodes.find((item) => item.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 178 });
      expect(late.state.phase4?.eventLedger.some((item) => item.detail.includes('京師馬生人'))).toBe(false);
    }
  });
});
