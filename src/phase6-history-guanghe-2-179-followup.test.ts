import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const ids = [
  'duan-jiong-defeats-dongqiang-shehuosai-179',
  'guo-xi-succeeds-liu-chong-taiwei-179',
  'xianbei-raids-bingzhou-179',
] as const;

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

describe('A605 補列 179 年射虎塞外谷戰事、太尉任免與鮮卑寇并州', () => {
  it('三項記事各自保留原典範圍與月份精度，179 年級觸發', () => {
    const expectedSources = [
      ['秋七月', '射虎塞外谷', '東羌悉平'],
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
