import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content, type PersonRef } from './phase4';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const persons: PersonRef[] = [];
const id = 'hailstorm-chicken-egg-181';

function oldV220Save(): SaveFile {
  const facts = createOpeningFacts(539, 180, { regions: [], surnames: [] });
  const started = dispatch(null, { version: ENGINE_VERSION, commandId: 'a539-v220-start', expectedRevision: 0, type: 'StartGame', name: '驗收玩家', seed: 539, facts });
  if (!started.event || started.event.type !== 'WorldCreated') throw new Error('could not create v220 start event');
  const event: GameEvent = { ...started.event, payload: { ...started.event.payload, phase4ContentVersion: 'phase4-scenario-220' } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('could not replay v220 start event');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

describe('A539 181 年六月雨雹記事', () => {
  it('依來源只按年級呈現原文記事，不推算災害細節', () => {
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(666);
    const fresh = advancePhase4(createPhase4Model(180, 1, persons, PHASE4_CONTENT_VERSION), 360);
    const event = fresh.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('光和四年六月雨雹'));
    expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    expect(event?.source).toContain('六月庚辰，雨雹如雞子');
    expect(event?.source).not.toContain('損害數');
    expect(HISTORY_CONTENT.find((node) => node.id === id)).toMatchObject({ startYear: 181, endYear: 181, precision: 'year', introducedRevision:221 });
  });

  it('v220 舊存檔保留事件帳前綴；未到年份可觸發，同年存檔不回補', () => {
    const old = oldV220Save();
    const prefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.state.phase4?.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const continued = dispatch(migrated.state, { version: ENGINE_VERSION, commandId: 'a539-v220-continue', expectedRevision: migrated.state.revision, worldlineId: migrated.worldlineId, type: 'Phase4Action', action: { type: 'AdvanceDays', days: 360 } });
    if (!continued.state || !continued.event) throw new Error('could not continue v220 save');
    expect(continued.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const saved: SaveFile = { ...migrated, events: [...migrated.events, continued.event], state: continued.state };
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);

    const late = upgradePhase4Content(createPhase4Model(181, 1, persons, 'phase4-scenario-220'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 181 });
    expect(late.eventLedger.some((item) => item.detail.includes('光和四年六月雨雹'))).toBe(false);
  });
});
