import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const id = 'wind-hail-and-memorial-edict-179';

function saveAtVersion(year: number, seed: number): SaveFile {
  const facts = createOpeningFacts(seed, year, { regions: [], surnames: [] });
  const started = dispatch(null, {
    version: ENGINE_VERSION,
    commandId: `a604-start-${seed}`,
    expectedRevision: 0,
    type: 'StartGame',
    name: '史料驗收',
    seed,
    facts,
  });
  if (!started.event || started.event.type !== 'WorldCreated') throw new Error('無法建立 A604 舊存檔');
  const event: GameEvent = { ...started.event, payload: { ...started.event.payload, phase4ContentVersion: 'phase4-scenario-255' } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('無法重播 A604 舊存檔');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

function questionWorld(): GameState {
  const started = dispatch(null, {
    version: ENGINE_VERSION,
    commandId: 'a604-question-world',
    expectedRevision: 0,
    type: 'StartGame',
    name: '史料驗收',
    seed: 604,
    facts: createOpeningFacts(604, 179, { regions: [], surnames: [] }),
  });
  if (!started.state) throw new Error('無法建立 A604 年表問答世界線');
  return started.state;
}

describe('A604 補列 179 年大風雨雹及上封事詔令', () => {
  it('依《後漢書》保留夏四月癸巳來源註記，只按年級呈現且問答不改狀態', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 179, endYear: 179, retired: true, retiredIn: 'phase4-scenario-305' });
    expect(node?.source).toContain('建寧二年（169）');

    const fresh = advancePhase4(createPhase4Model(178, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((item) => item.contentId === id)).toBeUndefined();
    expect(fresh.eventLedger.some(item => item.type === '史實事件形成' && item.detail.includes('大風雨雹'))).toBe(false);

    const state = questionWorld();
    const before = structuredClone(state);
    const answer = answerKnownHistoricalEventQuestion('西元 179 年有哪些記載？', state);
    expect(answer?.answer).not.toContain('大風雨雹');
    expect(answer?.answer).toContain('《後漢書》卷八');
    expect(state).toEqual(before);
  });

  it('v255 舊 v6 存檔升版保留事件帳、可續玩重播且同年不回補', () => {
    const old = saveAtVersion(178, 604);
    const prefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    expect(old.state.phase4?.nodes.some((item) => item.contentId === id)).toBe(false);

    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find((item) => item.contentId === id)).toBeUndefined();
    expect(advancePhase4(migrated.state.phase4!, 360).nodes.find((item) => item.contentId === id)).toBeUndefined();
    expect(replay(migrated.events)).toEqual(migrated.state);

    const late = verifySave(toJson(saveAtVersion(179, 605)));
    expect(late.state.phase4?.nodes.find((item) => item.contentId === id)).toBeUndefined();
    expect(late.state.phase4?.eventLedger.some((item) => item.detail.includes('大風雨雹'))).toBe(false);
  });
});
