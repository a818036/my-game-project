import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content, type PersonRef } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const persons: PersonRef[] = [];
const id = 'taiwei-xu-yang-succession-182';

function world(): GameState {
  const facts = createOpeningFacts(522, 184, { regions: [], surnames: [] });
  const result = dispatch(null, { version: ENGINE_VERSION, commandId: 'a543-question-world', expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 522, facts });
  if (!result.state) throw new Error('could not create question world');
  return result.state;
}

function oldV221Save(): SaveFile {
  const facts = createOpeningFacts(522, 181, { regions: [], surnames: [] });
  const started = dispatch(null, { version: ENGINE_VERSION, commandId: 'a543-v221-start', expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 522, facts });
  if (!started.event || started.event.type !== 'WorldCreated') throw new Error('could not create v221 start event');
  const event: GameEvent = { ...started.event, payload: { ...started.event.payload, phase4ContentVersion: 'phase4-scenario-221' } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('could not replay v221 start event');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

describe('A543 182 年太尉任免記事', () => {
  it('按原典記錄許戫免職與楊賜繼任，並透過史實問答提供來源', () => {
    const advanced = advancePhase4(createPhase4Model(181, 1, persons, PHASE4_CONTENT_VERSION), 360);
    const node = advanced.nodes.find(item => item.contentId === id);
    const event = advanced.eventLedger.find(item => item.type === '史實事件形成' && item.detail.includes('太尉許戫免職'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('光和五年冬十月');
    expect(event?.source).toContain('太常楊賜為太尉');
    expect(event?.source).toContain('不推測免職原因');
    expect(HISTORY_CONTENT.find(item => item.id === id)).toMatchObject({ startYear: 182, endYear: 182, precision: 'year', introducedIn: 'phase4-scenario-222', sameYearMigrationIsLate: true });
    expect(answerKnownHistoricalEventQuestion('西元 182 年發生了什麼事？', world())?.answer).toContain('太尉許戫免職');
  });

  it('v221 舊存檔升級後可續玩、重播及再匯出；同年與晚年不回補', () => {
    const old = oldV221Save();
    const prefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item => item.contentId === id)?.status).toBe('pending');

    const continued = dispatch(migrated.state, { version: ENGINE_VERSION, commandId: 'a543-v221-continue', expectedRevision: migrated.state.revision, worldlineId: migrated.worldlineId, type: 'Phase4Action', action: { type: 'AdvanceDays', days: 360 } });
    if (!continued.state || !continued.event) throw new Error('could not continue v221 save');
    expect(continued.state.phase4?.nodes.find(item => item.contentId === id)?.status).toBe('triggered');
    const saved: SaveFile = { ...migrated, events: [...migrated.events, continued.event], state: continued.state };
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);

    for (const year of [182, 184]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, persons, 'phase4-scenario-221'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item => item.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 182 });
      expect(late.eventLedger.some(item => item.type === '史實事件形成' && item.detail.includes('太尉許戫免職'))).toBe(false);
    }
  });
});
