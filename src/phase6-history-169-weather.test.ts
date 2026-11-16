import { describe, expect, it } from 'vitest';
import { answerKnownHistoricalEventQuestion } from './life';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content, type PersonRef } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const people: PersonRef[] = [];
const eventId = 'great-wind-hail-169';
const oldVersion = 'phase4-scenario-302';

function legacySave(year: number): SaveFile {
  const facts = createOpeningFacts(680, year, { regions: [], surnames: [] });
  const created = dispatch(null, { version: ENGINE_VERSION, commandId: `a680-${year}-start`, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 680, facts });
  if (!created.event || created.event.type !== 'WorldCreated') throw new Error('無法建立歷史內容舊存檔');
  const event: GameEvent = { ...created.event, payload: { ...created.event.payload, phase4ContentVersion: oldVersion } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('無法重播歷史內容舊存檔');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

function questionWorld() {
  const facts = createOpeningFacts(680, 169, { regions: [], surnames: [] });
  const result = dispatch(null, { version: ENGINE_VERSION, commandId: 'a680-question-world', expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 680, facts });
  if (!result.state) throw new Error('無法建立問答測試世界線');
  return result.state;
}

describe('A680 169 年夏四月大風雨雹', () => {
  it('按年級記錄原典天候記事，不推定地點與災損', () => {
    const model = advancePhase4(createPhase4Model(168, 1, people, PHASE4_CONTENT_VERSION), 360);
    const node = model.nodes.find(item => item.contentId === eventId);
    const ledger = model.eventLedger.find(item => item.type === '史實事件形成' && item.detail.includes('夏四月大風雨雹'));
    const content = HISTORY_CONTENT.find(item => item.id === eventId);
    const answer = answerKnownHistoricalEventQuestion('西元169年發生什麼事件？', questionWorld());

    expect(node?.status).toBe('triggered');
    expect(ledger?.source).toContain('建寧二年夏四月癸巳');
    expect(ledger?.source).toContain('原文未述地點範圍、損害或因果');
    expect(content).toMatchObject({ startYear: 169, endYear: 169, precision: 'year', introducedRevision: 303 });
    expect(content?.description).toContain('不推定發生地點');
    expect(answer?.answer).toContain('夏四月大風雨雹');
  });

  it('v302 v6 舊存檔保留事件帳前綴，跨年可觸發且已過年份不回補', () => {
    const old = legacySave(168);
    const oldPrefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.nodes.find(item => item.contentId === eventId)?.status).toBe('pending');

    const continued = dispatch(migrated.state, { version: ENGINE_VERSION, commandId: 'a680-v302-continue', expectedRevision: migrated.state.revision, worldlineId: migrated.worldlineId, type: 'Phase4Action', action: { type: 'AdvanceDays', days: 360 } });
    if (!continued.state || !continued.event) throw new Error('無法續玩 v302 舊存檔');
    expect(continued.state.phase4?.nodes.find(item => item.contentId === eventId)?.status).toBe('triggered');
    const nextSave: SaveFile = { ...migrated, events: [...migrated.events, continued.event], state: continued.state };
    expect(replay(nextSave.events)).toEqual(nextSave.state);
    expect(verifySave(toJson(nextSave))).toEqual(nextSave);

    for (const year of [169, 170]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, people, oldVersion), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item => item.contentId === eventId)).toMatchObject({ status: 'resolved', resolvedYear: 169 });
      expect(late.eventLedger.some(item => item.type === '史實事件形成' && item.detail.includes('夏四月大風雨雹'))).toBe(false);
    }
  });
});
