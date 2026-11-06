import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content, type PersonRef } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const persons: PersonRef[] = [];
const id = 'xianbei-invades-liaodong-dependency-163';

function oldSave(year: number, suffix: string): SaveFile {
  const facts = createOpeningFacts(549, year, { regions: [], surnames: [] });
  const started = dispatch(null, { version: ENGINE_VERSION, commandId: `a549-${suffix}-start`, expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 549, facts });
  if (!started.event || started.event.type !== 'WorldCreated') throw new Error('could not create old content save');
  const event: GameEvent = { ...started.event, payload: { ...started.event.payload, phase4ContentVersion: 'phase4-scenario-224' } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('could not replay old content save');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

function world(): GameState {
  const facts = createOpeningFacts(549, 184, { regions: [], surnames: [] });
  const result = dispatch(null, { version: ENGINE_VERSION, commandId: 'a549-question-world', expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 549, facts });
  if (!result.state) throw new Error('could not create question world');
  return result.state;
}

describe('A549 163 年鮮卑侵擾遼東屬國', () => {
  it('依《後漢書》記五月侵擾並保留史料月份，不補造戰事結果', () => {
    const advanced = advancePhase4(createPhase4Model(162, 1, persons, PHASE4_CONTENT_VERSION), 360);
    const node = advanced.nodes.find(item => item.contentId === id);
    const event = advanced.eventLedger.find(item => item.type === '史實事件形成' && item.detail.includes('鮮卑侵擾遼東屬國'));
    expect(node?.status).toBe('triggered');
    expect(event?.source).toContain('延熹六年條記五月');
    expect(event?.source).toContain('不推演具體地點');
    expect(HISTORY_CONTENT.find(item => item.id === id)).toMatchObject({ startYear: 163, endYear: 163, precision: 'year', introducedIn: 'phase4-scenario-225', lateSameYear: true });
    expect(HISTORY_CONTENT.find(item => item.id === id)?.sourceDateNote).toContain('保留漢曆月份註記');
    expect(answerKnownHistoricalEventQuestion('西元 163 年鮮卑發生什麼事？', world())?.answer).toContain('遼東屬國');
  });

  it('v224 舊存檔保留事件帳且可續玩、重播及再匯出；同年與晚年升級不回補', () => {
    const old = oldSave(162, 'v224');
    const prefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find(item => item.contentId === id)?.status).toBe('pending');

    const continued = dispatch(migrated.state, { version: ENGINE_VERSION, commandId: 'a549-v224-continue', expectedRevision: migrated.state.revision, worldlineId: migrated.worldlineId, type: 'Phase4Action', action: { type: 'AdvanceDays', days: 360 } });
    if (!continued.state || !continued.event) throw new Error('could not continue v224 save');
    expect(continued.state.phase4?.nodes.find(item => item.contentId === id)?.status).toBe('triggered');
    const saved: SaveFile = { ...migrated, events: [...migrated.events, continued.event], state: continued.state };
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);

    for (const year of [163, 184]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, persons, 'phase4-scenario-224'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item => item.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
      expect(late.eventLedger.some(item => item.type === '史實事件形成' && item.detail.includes('鮮卑侵擾遼東屬國'))).toBe(false);
    }
  });
});
