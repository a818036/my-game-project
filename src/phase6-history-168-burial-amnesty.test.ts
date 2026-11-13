import { describe, expect, it } from 'vitest';
import { answerKnownHistoricalEventQuestion } from './life';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content, type PersonRef } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const people: PersonRef[] = [];
const eventId = 'huan-emperor-burial-amnesty-rewards-168';
const oldVersion = 'phase4-scenario-299';

function legacySave(year: number): SaveFile {
  const facts = createOpeningFacts(677, year, { regions: [], surnames: [] });
  const created = dispatch(null, { version: ENGINE_VERSION, commandId: `a677-${year}-start`, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 677, facts });
  if (!created.event || created.event.type !== 'WorldCreated') throw new Error('無法建立歷史內容舊存檔');
  const event: GameEvent = { ...created.event, payload: { ...created.event.payload, phase4ContentVersion: oldVersion } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('無法重播歷史內容舊存檔');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

function questionWorld(): GameState {
  const facts = createOpeningFacts(677, 168, { regions: [], surnames: [] });
  const result = dispatch(null, { version: ENGINE_VERSION, commandId: 'a677-question-world', expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 677, facts });
  if (!result.state) throw new Error('無法建立問答測試世界線');
  return result.state;
}

describe('A677 168 年桓帝安葬、大赦與賜爵帛', () => {
  it('按年級呈現《後漢書》所載記事，且不改變玩家資源', () => {
    const model = advancePhase4(createPhase4Model(167, 1, people, PHASE4_CONTENT_VERSION), 360);
    const node = model.nodes.find(item => item.contentId === eventId);
    const ledger = model.eventLedger.find(item => item.type === '史實事件形成' && item.detail.includes('桓帝葬宣陵'));
    const content = HISTORY_CONTENT.find(item => item.id === eventId);
    const answer = answerKnownHistoricalEventQuestion('西元168年桓帝去世後有哪些記事？', questionWorld());

    expect(node?.status).toBe('triggered');
    expect(ledger?.source).toContain('葬孝桓皇帝於宣陵');
    expect(ledger?.source).toContain('大赦天下，賜民爵及帛各有差');
    expect(content).toMatchObject({ startYear: 168, endYear: 168, precision: 'year', introducedRevision: 300 });
    expect(content?.description).toContain('不套用為玩家資源或身分變化');
    expect(answer?.answer).toContain('桓帝葬宣陵');
    expect(answer?.answer).toContain('《後漢書》卷八〈孝靈帝紀〉');
  });

  it('v299 v6 舊存檔保留事件帳前綴，跨年可觸發且已過年份不回補', () => {
    const old = legacySave(167);
    const oldPrefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.nodes.find(item => item.contentId === eventId)?.status).toBe('pending');

    const continued = dispatch(migrated.state, { version: ENGINE_VERSION, commandId: 'a677-v299-continue', expectedRevision: migrated.state.revision, worldlineId: migrated.worldlineId, type: 'Phase4Action', action: { type: 'AdvanceDays', days: 360 } });
    if (!continued.state || !continued.event) throw new Error('無法續玩 v299 舊存檔');
    expect(continued.state.phase4?.nodes.find(item => item.contentId === eventId)?.status).toBe('triggered');
    const nextSave: SaveFile = { ...migrated, events: [...migrated.events, continued.event], state: continued.state };
    expect(replay(nextSave.events)).toEqual(nextSave.state);
    expect(verifySave(toJson(nextSave))).toEqual(nextSave);

    for (const year of [168, 169]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, people, oldVersion), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item => item.contentId === eventId)).toMatchObject({ status: 'resolved', resolvedYear: 168 });
      expect(late.eventLedger.some(item => item.type === '史實事件形成' && item.detail.includes('桓帝葬宣陵'))).toBe(false);
    }
  });
});
