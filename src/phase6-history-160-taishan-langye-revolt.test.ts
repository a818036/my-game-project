import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';
import { answerKnownHistoricalEventQuestion } from './life';
import { applyEvent, createOpeningFacts, dispatch, ENGINE_VERSION, replay, type GameEvent, type GameState } from './engine';
import { toJson, verifySave, type SaveFile } from './storage';

const id = 'taishan-langye-revolt-lao-bing-160';

function oldSave(year: number, seed: number, contentVersion = 'phase4-scenario-266'): SaveFile {
  const facts = createOpeningFacts(seed, year, { regions: [], surnames: [] });
  const started = dispatch(null, {
    version: ENGINE_VERSION,
    commandId: `a644-old-start-${seed}`,
    expectedRevision: 0,
    type: 'StartGame',
    name: '史料驗收',
    seed,
    facts,
  });
  if (!started.event || started.event.type !== 'WorldCreated') throw new Error('無法建立 A644 v266 舊存檔');
  const event: GameEvent = { ...started.event, payload: { ...started.event.payload, phase4ContentVersion: contentVersion } };
  const state = applyEvent(null, event);
  if (!state) throw new Error('無法重播 A644 v266 舊存檔');
  return { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events: [event], state };
}

function questionWorld(): GameState {
  const facts = createOpeningFacts(644, 160, { regions: [], surnames: [] });
  const started = dispatch(null, {
    version: ENGINE_VERSION,
    commandId: 'a644-question-world',
    expectedRevision: 0,
    type: 'StartGame',
    name: '史料驗收',
    seed: 644,
    facts,
  });
  if (!started.state) throw new Error('無法建立 A644 問答世界線');
  return started.state;
}

describe('A644 補列 160 年泰山、琅邪賊勞丙等記事', () => {
  it('按年記錄復叛與朝廷討伐命令，不推定結果或補出未具名者姓名', () => {
    const previous = createPhase4Model(159, 1, [], 'phase4-scenario-266');
    const upgraded = upgradePhase4Content(previous, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    const advanced = advancePhase4(upgraded, 360);
    const event = advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('勞丙'));
    expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    expect(event?.source).toContain('延熹三年九月');
    expect(event?.source).toContain('趙某');
    expect(event?.source).toContain('不補姓名');
    expect(HISTORY_CONTENT.find((item) => item.id === id)).toMatchObject({
      startYear: 160,
      endYear: 160,
      precision: 'year',
      introducedRevision: 267,
    });

    const state = questionWorld();
    const before = structuredClone(state);
    const answer = answerKnownHistoricalEventQuestion('西元 160 年發生了哪些史實事件？', state)?.answer;
    expect(answer).toContain('勞丙');
    expect(answer).toContain('御史中丞趙某');
    expect(state).toEqual(before);

    for (const year of [160, 161]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-266'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 160 });
      expect(late.eventLedger.some((item) => item.type === '史實事件形成' && item.detail.includes('勞丙'))).toBe(false);
    }
  });

  it('v266 v6 JSON 升級保留舊事件帳且不回補已過記事', () => {
    const old = oldSave(160, 645);
    const prefix = structuredClone(old.state.phase4?.eventLedger ?? []);
    const migrated = verifySave(toJson(old));
    expect(migrated.events[0]).toEqual(old.events[0]);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 160 });

    const continued = dispatch(migrated.state, {
      version: ENGINE_VERSION,
      commandId: 'a644-v266-continue',
      expectedRevision: migrated.state.revision,
      worldlineId: migrated.worldlineId,
      type: 'Phase4Action',
      action: { type: 'AdvanceDays', days: 1 },
    });
    if (!continued.state || !continued.event) throw new Error('A644 v266 存檔續玩失敗');
    expect(continued.state.phase4?.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 160 });
    expect(continued.state.phase4?.eventLedger.some((item) => item.type === '史實事件形成' && item.detail.includes('勞丙'))).toBe(false);
    const saved: SaveFile = { ...migrated, events: [...migrated.events, continued.event], state: continued.state };
    expect(replay(saved.events)).toEqual(saved.state);
    expect(verifySave(toJson(saved))).toEqual(saved);
  });

  it('續接 v267 時可觸發 160 年泰山賊記事，舊年份不補發', () => {
    const id = 'taishan-revolt-shusun-wuji-160';
    const old = createPhase4Model(159, 1, [], 'phase4-scenario-267');
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    const advanced = advancePhase4(upgraded, 360);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('叔孫無忌'))?.source).toContain('十二月');

    const sameYear = upgradePhase4Content(createPhase4Model(160, 1, [], 'phase4-scenario-267'), PHASE4_CONTENT_VERSION);
    const late = upgradePhase4Content(createPhase4Model(161, 1, [], 'phase4-scenario-267'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 160 });
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 160 });
    expect(sameYear.eventLedger.some((item) => item.detail.includes('叔孫無忌'))).toBe(false);
    expect(late.eventLedger.some((item) => item.detail.includes('叔孫無忌'))).toBe(false);

    const saved = verifySave(toJson(oldSave(160, 646, 'phase4-scenario-267')));
    expect(saved.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(saved.state.phase4?.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 160 });
    expect(saved.state.phase4?.eventLedger.some((item) => item.detail.includes('叔孫無忌'))).toBe(false);
  });

  it('v268 跨年加入三筆東漢事件，並為同年／晚年舊存檔保留不回補', () => {
    const ids = ['nanman-submits-rinan-160', 'lejie-qiang-attack-yunjie-160', 'court-succession-yin-song-160'];
    const before = createPhase4Model(159, 1, [], 'phase4-scenario-268');
    const prefix = structuredClone(before.eventLedger);
    const upgraded = upgradePhase4Content(before, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const advanced = advancePhase4(upgraded, 360);
    for (const id of ids) {
      expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    }
    expect(advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('日南蠻賊'))?.source).toContain('冬十一月');
    expect(advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('勒姐羌'))?.source).toContain('允街');
    expect(advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('尹頌'))?.source).toContain('韓縯');

    for (const year of [160, 161]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-268'), PHASE4_CONTENT_VERSION);
      for (const id of ids) {
        expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 160 });
        expect(late.eventLedger.some((item) => item.type === '史實事件形成' && item.detail.includes(HISTORY_CONTENT.find((entry) => entry.id === id)!.title))).toBe(false);
      }
    }

    const oldSaveData = oldSave(160, 647, 'phase4-scenario-268');
    const oldPrefix = structuredClone(oldSaveData.events);
    const migrated = verifySave(toJson(oldSaveData));
    expect(migrated.events.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    for (const id of ids) {
      expect(migrated.state.phase4?.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 160 });
    }
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('v269 跨年加入九真起事與魏朗平亂記事，並保留舊存檔前綴', () => {
    const jiuzhenId = 'jiuzhen-revolt-wei-lang-161';
    const previous = createPhase4Model(160, 1, [], 'phase4-scenario-269');
    const previousLedger = structuredClone(previous.eventLedger);
    const upgraded = upgradePhase4Content(previous, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, previousLedger.length)).toEqual(previousLedger);
    expect(upgraded.nodes.find((node) => node.contentId === jiuzhenId)?.status).toBe('pending');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === jiuzhenId)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('九真蠻夷起事'));
    expect(event?.source).toContain('延熹四年夏四月');
    expect(event?.source).toContain('兒式');
    expect(event?.source).toContain('戰歿');
    expect(event?.source).toContain('魏朗擊破');
    expect(event?.source).toContain('未載雙方兵力');
    expect(HISTORY_CONTENT.find((item) => item.id === jiuzhenId)).toMatchObject({
      startYear: 161,
      endYear: 161,
      precision: 'year',
      introducedRevision: 270,
    });

    const sameYear = upgradePhase4Content(createPhase4Model(161, 1, [], 'phase4-scenario-269'), PHASE4_CONTENT_VERSION);
    const late = upgradePhase4Content(createPhase4Model(162, 1, [], 'phase4-scenario-269'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === jiuzhenId)).toMatchObject({ status: 'resolved', resolvedYear: 161 });
    expect(late.nodes.find((node) => node.contentId === jiuzhenId)).toMatchObject({ status: 'resolved', resolvedYear: 161 });
    expect(sameYear.eventLedger.some((item) => item.detail.includes('九真蠻夷起事'))).toBe(false);
    expect(late.eventLedger.some((item) => item.detail.includes('九真蠻夷起事'))).toBe(false);

    const previousSave = oldSave(160, 649, 'phase4-scenario-269');
    const oldPrefix = structuredClone(previousSave.events);
    const migrated = verifySave(toJson(previousSave));
    expect(migrated.events.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === jiuzhenId)?.status).toBe('pending');
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });
});
