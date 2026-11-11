import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content, type PersonRef } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const persons: PersonRef[] = [];
const id = 'jiangxia-uprising-169';

function oldV236Save(year = 168): SaveFile {
  const facts = createOpeningFacts(569, year, { regions: [], surnames: [] });
  const started = dispatch(null, { version: ENGINE_VERSION, commandId: 'a570-v236-start', expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 569, facts });
  if (!started.event || started.event.type !== 'WorldCreated') throw new Error('無法建立 v236 開局事件');
  const event: GameEvent = { ...started.event, payload: { ...started.event.payload, phase4ContentVersion: 'phase4-scenario-236' } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('無法重播 v236 開局事件');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

describe('A570 建寧二年江夏起事記事', () => {
  it('只記卷八十六所載起事與討平，並可由本機史實問答查詢', () => {
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 169, endYear: 169, precision: 'year', introducedRevision: 237, lateSameYear: true });
    expect(node?.source).toContain('江夏蠻叛，州郡討平之');
    expect(node?.description).toContain('不補戰事、傷亡');
    expect(advancePhase4(createPhase4Model(168, 1, persons, PHASE4_CONTENT_VERSION), 360).nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
    expect(answerKnownHistoricalEventQuestion('西元169年江夏發生了什麼事？', oldV236Save().state)?.answer).toContain('江夏起事及州郡討平');
  });

  it('v236 舊 v6 存檔續玩可觸發，保留事件前綴並可重播；同年及晚年不回補', () => {
    const old = oldV236Save();
    const prefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find((item) => item.contentId === id)?.status).toBe('pending');

    const continued = dispatch(migrated.state, { version: ENGINE_VERSION, commandId: 'a570-v236-continue', expectedRevision: migrated.state.revision, worldlineId: migrated.worldlineId, type: 'Phase4Action', action: { type: 'AdvanceDays', days: 360 } });
    if (!continued.state || !continued.event) throw new Error('無法續玩 v236 存檔');
    expect(continued.state.phase4?.nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
    const saved: SaveFile = { ...migrated, events: [...migrated.events, continued.event], state: continued.state };
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);

    for (const year of [169, 170]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, persons, 'phase4-scenario-236'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((item) => item.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 169 });
      expect(late.eventLedger.some((item) => item.detail.includes('江夏起事及州郡討平'))).toBe(false);
    }
  });
});
