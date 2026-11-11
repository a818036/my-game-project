import { describe, expect, it } from 'vitest';
import { answerKnownHistoricalEventQuestion } from './life';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content, type PersonRef } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const people: PersonRef[] = [];
const eventId = 'six-provinces-flood-bohai-sea-overflow-167';
const oldVersion = 'phase4-scenario-298';

function legacySave(year: number): SaveFile {
  const facts = createOpeningFacts(676, year, { regions: [], surnames: [] });
  const created = dispatch(null, { version: ENGINE_VERSION, commandId: `a676-${year}-start`, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 676, facts });
  if (!created.event || created.event.type !== 'WorldCreated') throw new Error('無法建立歷史內容舊存檔');
  const event: GameEvent = { ...created.event, payload: { ...created.event.payload, phase4ContentVersion: oldVersion } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('無法重播歷史內容舊存檔');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

function questionWorld(): GameState {
  const facts = createOpeningFacts(676, 167, { regions: [], surnames: [] });
  const result = dispatch(null, { version: ENGINE_VERSION, commandId: 'a676-question-world', expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 676, facts });
  if (!result.state) throw new Error('無法建立問答測試世界線');
  return result.state;
}

describe('A676 167 年六州水災、勃海海溢與賑濟', () => {
  it('只按年級呈現原典所載災情與救濟，並可由年表查詢', () => {
    const model = advancePhase4(createPhase4Model(166, 1, people, PHASE4_CONTENT_VERSION), 360);
    const node = model.nodes.find(item => item.contentId === eventId);
    const ledger = model.eventLedger.find(item => item.type === '史實事件形成' && item.detail.includes('六州大水、勃海海溢'));
    const content = HISTORY_CONTENT.find(item => item.id === eventId);
    const answer = answerKnownHistoricalEventQuestion('西元167年有哪些史實事件？', questionWorld());

    expect(node?.status).toBe('triggered');
    expect(ledger?.source).toContain('「六州大水，勃海海溢」');
    expect(ledger?.source).toContain('賑濟溺死者家屬與亡失穀食者');
    expect(content).toMatchObject({ startYear: 167, endYear: 167, precision: 'year', introducedRevision: 299 });
    expect(content?.description).toContain('不推定六州具體名單');
    expect(content?.description).toContain('不將記載的賑濟數額套用至玩家世界線');
    expect(answer?.answer).toContain('六州大水、勃海海溢與賑濟');
    expect(answer?.answer).toContain('《後漢書》卷七〈孝桓帝紀〉');
  });

  it('v298 v6 舊存檔保留事件帳前綴，跨年可觸發，同年與晚年不回補', () => {
    const old = legacySave(166);
    const oldPrefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.nodes.find(item => item.contentId === eventId)?.status).toBe('pending');

    const continued = dispatch(migrated.state, { version: ENGINE_VERSION, commandId: 'a676-v298-continue', expectedRevision: migrated.state.revision, worldlineId: migrated.worldlineId, type: 'Phase4Action', action: { type: 'AdvanceDays', days: 360 } });
    if (!continued.state || !continued.event) throw new Error('無法續玩 v298 舊存檔');
    expect(continued.state.phase4?.nodes.find(item => item.contentId === eventId)?.status).toBe('triggered');
    const nextSave: SaveFile = { ...migrated, events: [...migrated.events, continued.event], state: continued.state };
    expect(replay(nextSave.events)).toEqual(nextSave.state);
    expect(verifySave(toJson(nextSave))).toEqual(nextSave);

    for (const year of [167, 168]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, people, oldVersion), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item => item.contentId === eventId)).toMatchObject({ status: 'resolved', resolvedYear: 167 });
      expect(late.eventLedger.some(item => item.type === '史實事件形成' && item.detail.includes('六州大水、勃海海溢'))).toBe(false);
    }
  });
});
