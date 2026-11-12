import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const ids = [
  'guo-xi-succeeds-liu-chong-taiwei-179',
  'xianbei-raids-bingzhou-179',
] as const;

function questionWorld(): GameState {
  const seed = 607;
  const started = dispatch(null, {
    version: ENGINE_VERSION,
    commandId: 'a605-question-world',
    expectedRevision: 0,
    type: 'StartGame',
    name: '史料驗收',
    seed,
    facts: createOpeningFacts(seed, 179, { regions: [], surnames: [] }),
  });
  if (!started.state) throw new Error('無法建立 A605 年表問答世界線');
  return started.state;
}

function versionedSave(year: number, seed: number): SaveFile {
  const facts = createOpeningFacts(seed, year, { regions: [], surnames: [] });
  const started = dispatch(null, {
    version: ENGINE_VERSION,
    commandId: `a605-start-${seed}`,
    expectedRevision: 0,
    type: 'StartGame',
    name: '史料驗收',
    seed,
    facts,
  });
  if (!started.event || started.event.type !== 'WorldCreated') throw new Error('無法建立 A605 舊存檔');
  const event: GameEvent = { ...started.event, payload: { ...started.event.payload, phase4ContentVersion: 'phase4-scenario-256' } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('無法重播 A605 舊存檔');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

describe('A605 補列 179 年太尉任免與鮮卑寇并州', () => {
  it('兩項記事保留原典範圍與月份精度，179 年級觸發；射虎塞記事已改列169年', () => {
    const expectedSources = [
      ['十一月', '太尉劉寵免', '郭禧為太尉'],
      ['鮮卑寇并州', '未標具體月份'],
    ];
    for (const [index, id] of ids.entries()) {
      const node = HISTORY_CONTENT.find((item) => item.id === id);
      expect(node).toMatchObject({ startYear: 179, endYear: 179, precision: 'year', introducedRevision: 257 });
      for (const phrase of expectedSources[index]) expect(node?.source).toContain(phrase);
      expect(node?.sourceDateNote).toContain('只按 179 年級觸發');
    }

    const advanced = advancePhase4(createPhase4Model(178, 1, [], PHASE4_CONTENT_VERSION), 360);
    for (const id of ids) expect(advanced.nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
    expect(advanced.nodes.some(item => item.contentId === 'duan-jiong-defeats-dongqiang-shehuosai-179')).toBe(false);
  });

  it('179 年史料問答列出新增事件且不變更世界狀態', () => {
    const state = questionWorld();
    const before = structuredClone(state);
    const answer = answerKnownHistoricalEventQuestion('西元 179 年有哪些史料記載？', state);
    expect(answer?.answer).not.toContain('射虎塞外谷');
    expect(answer?.answer).toContain('郭禧繼任太尉');
    expect(answer?.answer).toContain('鮮卑寇并州');
    expect(state).toEqual(before);
  });

  it('v256 舊 v6 存檔遷移保留事件前綴、可續玩重播且不回補', () => {
    const old = versionedSave(178, 605);
    const prefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    for (const id of ids) expect(migrated.state.phase4?.nodes.find((item) => item.contentId === id)?.status).toBe('pending');

    const continued = advancePhase4(migrated.state.phase4!, 360);
    for (const id of ids) expect(continued.nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
    expect(replay(migrated.events)).toEqual(migrated.state);

    const late = verifySave(toJson(versionedSave(179, 606)));
    for (const id of ids) {
      expect(late.state.phase4?.nodes.find((item) => item.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 179 });
    }
    expect(late.state.phase4?.eventLedger.some((item) => ids.some((id) => item.detail.includes(id)))).toBe(false);
  });
});
