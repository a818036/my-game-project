import { describe, expect, it } from 'vitest';
import { answerKnownHistoricalEventQuestion } from './life';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content, type PersonRef } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const people: PersonRef[] = [];
const eventId = 'daqin-envoy-166';
const oldVersion = 'phase4-scenario-297';

function legacySave(year: number): SaveFile {
  const facts = createOpeningFacts(675, year, { regions: [], surnames: [] });
  const created = dispatch(null, { version: ENGINE_VERSION, commandId: `a675-${year}-start`, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 675, facts });
  if (!created.event || created.event.type !== 'WorldCreated') throw new Error('無法建立歷史內容舊存檔');
  const event: GameEvent = { ...created.event, payload: { ...created.event.payload, phase4ContentVersion: oldVersion } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('無法重播歷史內容舊存檔');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

function questionWorld(): GameState {
  const facts = createOpeningFacts(675, 166, { regions: [], surnames: [] });
  const result = dispatch(null, { version: ENGINE_VERSION, commandId: 'a675-question-world', expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 675, facts });
  if (!result.state) throw new Error('無法建立問答測試世界線');
  return result.state;
}

describe('A675 166 年大秦遣使記事', () => {
  it('只按年級呈現原典所載遣使奉獻，並可由史實年表查詢', () => {
    const model = advancePhase4(createPhase4Model(165, 1, people, PHASE4_CONTENT_VERSION), 360);
    const node = model.nodes.find(item => item.contentId === eventId);
    const ledger = model.eventLedger.find(item => item.type === '史實事件形成' && item.detail.includes('大秦國王遣使奉獻'));
    const content = HISTORY_CONTENT.find(item => item.id === eventId);
    const answer = answerKnownHistoricalEventQuestion('西元166年有哪些史實事件？', questionWorld());

    expect(node?.status).toBe('triggered');
    expect(ledger?.source).toContain('延熹九年條記「大秦國王遣使奉獻」');
    expect(ledger?.source).toContain('原文未載使者姓名、往返路線或後續交涉');
    expect(content).toMatchObject({ startYear: 166, endYear: 166, precision: 'year', introducedRevision: 298 });
    expect(answer?.answer).toContain('大秦國王遣使奉獻');
    expect(answer?.answer).toContain('《後漢書》卷七〈孝桓帝紀〉');
  });

  it('v297 v6 舊存檔保留事件帳前綴，跨年可觸發，同年與晚年不回補', () => {
    const old = legacySave(165);
    const oldPrefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.nodes.find(item => item.contentId === eventId)?.status).toBe('pending');

    const continued = dispatch(migrated.state, { version: ENGINE_VERSION, commandId: 'a675-v297-continue', expectedRevision: migrated.state.revision, worldlineId: migrated.worldlineId, type: 'Phase4Action', action: { type: 'AdvanceDays', days: 360 } });
    if (!continued.state || !continued.event) throw new Error('無法續玩 v297 舊存檔');
    expect(continued.state.phase4?.nodes.find(item => item.contentId === eventId)?.status).toBe('triggered');
    const nextSave: SaveFile = { ...migrated, events: [...migrated.events, continued.event], state: continued.state };
    expect(replay(nextSave.events)).toEqual(nextSave.state);
    expect(verifySave(toJson(nextSave))).toEqual(nextSave);

    for (const year of [166, 167]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, people, oldVersion), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item => item.contentId === eventId)).toMatchObject({ status: 'resolved', resolvedYear: 166 });
      expect(late.eventLedger.some(item => item.type === '史實事件形成' && item.detail.includes('大秦國王遣使奉獻'))).toBe(false);
    }
  });
});
