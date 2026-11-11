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

  it('v270 跨年加入 161 年三公任免，保留原文日期精度及舊事件帳', () => {
    const successionId = 'three-minister-succession-161';
    const previous = createPhase4Model(160, 1, [], 'phase4-scenario-270');
    const oldLedger = structuredClone(previous.eventLedger);
    const upgraded = upgradePhase4Content(previous, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, oldLedger.length)).toEqual(oldLedger);
    expect(upgraded.nodes.find((node) => node.contentId === successionId)?.status).toBe('pending');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === successionId)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('三公任免與任職交替'));
    for (const name of ['盛允', '種暠', '黃瓊', '劉矩', '虞放']) expect(event?.source).toContain(name);
    expect(event?.source).toContain('夏四月');
    expect(event?.source).toContain('未提供各項免職原因');
    expect(HISTORY_CONTENT.find((item) => item.id === successionId)).toMatchObject({
      startYear: 161,
      endYear: 161,
      precision: 'year',
      introducedRevision: 271,
    });

    for (const year of [161, 162]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-270'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === successionId)).toMatchObject({ status: 'resolved', resolvedYear: 161 });
      expect(late.eventLedger.some((item) => item.detail.includes('三公任免與任職交替'))).toBe(false);
    }

    const previousSave = oldSave(160, 651, 'phase4-scenario-270');
    const oldPrefix = structuredClone(previousSave.events);
    const migrated = verifySave(toJson(previousSave));
    expect(migrated.events.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === successionId)?.status).toBe('pending');
    const lateSave = verifySave(toJson(oldSave(161, 652, 'phase4-scenario-270')));
    expect(lateSave.state.phase4?.nodes.find((node) => node.contentId === successionId)).toMatchObject({ status: 'resolved', resolvedYear: 161 });
    expect(lateSave.state.phase4?.eventLedger.some((item) => item.detail.includes('三公任免與任職交替'))).toBe(false);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('v271 跨年加入犍為屬國記事，來源未繫月份時不補日期', () => {
    const qianweiId = 'qianwei-dependent-people-revolt-161';
    const previous = createPhase4Model(160, 1, [], 'phase4-scenario-271');
    const oldLedger = structuredClone(previous.eventLedger);
    const upgraded = upgradePhase4Content(previous, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, oldLedger.length)).toEqual(oldLedger);
    expect(upgraded.nodes.find((node) => node.contentId === qianweiId)?.status).toBe('pending');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === qianweiId)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('犍為屬國夷'));
    expect(event?.source).toContain('寇鈔百姓');
    expect(event?.source).toContain('山昱擊破');
    expect(event?.source).toContain('原文未載月份');
    expect(HISTORY_CONTENT.find((item) => item.id === qianweiId)).toMatchObject({
      startYear: 161,
      endYear: 161,
      precision: 'year',
      introducedRevision: 272,
    });
    expect(HISTORY_CONTENT.find((item) => item.id === qianweiId)?.sourceDateNote).toBeUndefined();

    for (const year of [161, 162]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-271'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === qianweiId)).toMatchObject({ status: 'resolved', resolvedYear: 161 });
      expect(late.eventLedger.some((item) => item.detail.includes('犍為屬國夷寇百姓'))).toBe(false);
    }

    const previousSave = oldSave(160, 653, 'phase4-scenario-271');
    const oldPrefix = structuredClone(previousSave.events);
    const migrated = verifySave(toJson(previousSave));
    expect(migrated.events.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === qianweiId)?.status).toBe('pending');
    const lateSave = verifySave(toJson(oldSave(161, 654, 'phase4-scenario-271')));
    expect(lateSave.state.phase4?.nodes.find((node) => node.contentId === qianweiId)).toMatchObject({ status: 'resolved', resolvedYear: 161 });
    expect(lateSave.state.phase4?.eventLedger.some((item) => item.detail.includes('犍為屬國夷寇百姓'))).toBe(false);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('v272 跨年加入鳥吾羌侵擾三郡記事，不臆補交戰細節', () => {
    const wuzhongId = 'wuzhong-qiang-hanyang-longxi-jincheng-162';
    const previous = createPhase4Model(161, 1, [], 'phase4-scenario-272');
    const oldLedger = structuredClone(previous.eventLedger);
    const upgraded = upgradePhase4Content(previous, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, oldLedger.length)).toEqual(oldLedger);
    expect(upgraded.nodes.find((node) => node.contentId === wuzhongId)?.status).toBe('pending');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === wuzhongId)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('鳥吾羌'));
    expect(event?.source).toContain('漢陽、隴西、金城');
    expect(event?.source).toContain('諸郡兵討破');
    expect(HISTORY_CONTENT.find((item) => item.id === wuzhongId)).toMatchObject({
      startYear: 162,
      endYear: 162,
      precision: 'year',
      introducedRevision: 273,
    });
    expect(HISTORY_CONTENT.find((item) => item.id === wuzhongId)?.sourceDateNote).toBeUndefined();

    for (const year of [162, 163]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-272'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === wuzhongId)).toMatchObject({ status: 'resolved', resolvedYear: 162 });
      expect(late.eventLedger.some((item) => item.detail.includes('鳥吾羌'))).toBe(false);
    }

    const previousSave = oldSave(161, 655, 'phase4-scenario-272');
    const oldPrefix = structuredClone(previousSave.events);
    const migrated = verifySave(toJson(previousSave));
    expect(migrated.events.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === wuzhongId)?.status).toBe('pending');
    const lateSave = verifySave(toJson(oldSave(162, 656, 'phase4-scenario-272')));
    expect(lateSave.state.phase4?.nodes.find((node) => node.contentId === wuzhongId)).toMatchObject({ status: 'resolved', resolvedYear: 162 });
    expect(lateSave.state.phase4?.eventLedger.some((item) => item.detail.includes('鳥吾羌'))).toBe(false);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('v273 跨年加入艾縣賊侵擾記事，不補月份或傷亡', () => {
    const aiCountyId = 'ai-county-burns-changsha-and-raids-yiyang-162';
    const previous = createPhase4Model(161, 1, [], 'phase4-scenario-273');
    const oldLedger = structuredClone(previous.eventLedger);
    const upgraded = upgradePhase4Content(previous, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, oldLedger.length)).toEqual(oldLedger);
    expect(upgraded.nodes.find((node) => node.contentId === aiCountyId)?.status).toBe('pending');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === aiCountyId)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('艾縣賊'));
    expect(event?.source).toContain('焚燒長沙郡縣');
    expect(event?.source).toContain('寇益陽，殺令');
    expect(HISTORY_CONTENT.find((item) => item.id === aiCountyId)).toMatchObject({
      startYear: 162,
      endYear: 162,
      precision: 'year',
      introducedRevision: 274,
    });
    expect(HISTORY_CONTENT.find((item) => item.id === aiCountyId)?.sourceDateNote).toBeUndefined();

    for (const year of [162, 163]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-273'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === aiCountyId)).toMatchObject({ status: 'resolved', resolvedYear: 162 });
      expect(late.eventLedger.some((item) => item.detail.includes('艾縣賊焚燒長沙'))).toBe(false);
    }

    const previousSave = oldSave(161, 657, 'phase4-scenario-273');
    const oldPrefix = structuredClone(previousSave.events);
    const migrated = verifySave(toJson(previousSave));
    expect(migrated.events.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === aiCountyId)?.status).toBe('pending');
    const lateSave = verifySave(toJson(oldSave(162, 658, 'phase4-scenario-273')));
    expect(lateSave.state.phase4?.nodes.find((node) => node.contentId === aiCountyId)).toMatchObject({ status: 'resolved', resolvedYear: 162 });
    expect(lateSave.state.phase4?.eventLedger.some((item) => item.detail.includes('艾縣賊焚燒長沙'))).toBe(false);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A652 將零陵蠻侵擾長沙獨立記錄，舊存檔升版不回補', () => {
    const linglingId = 'lingling-tribes-revolt-raids-changsha-162';
    const previous = createPhase4Model(161, 1, [], 'phase4-scenario-274');
    const oldLedger = structuredClone(previous.eventLedger);
    const upgraded = upgradePhase4Content(previous, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, oldLedger.length)).toEqual(oldLedger);
    expect(upgraded.nodes.find((node) => node.contentId === linglingId)?.status).toBe('pending');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === linglingId)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('零陵蠻起事侵擾長沙'));
    expect(event?.source).toContain('零陵蠻亦叛，寇長沙');
    expect(HISTORY_CONTENT.find((item) => item.id === linglingId)).toMatchObject({
      startYear: 162,
      endYear: 162,
      precision: 'year',
      introducedRevision: 275,
    });
    expect(HISTORY_CONTENT.find((item) => item.id === linglingId)?.sourceDateNote).toBeUndefined();
    expect(HISTORY_CONTENT.find((item) => item.id === 'changsha-cangwu-revolt-162')?.source).not.toContain('零陵蠻亦叛，寇長沙');

    for (const year of [162, 163]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-274'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === linglingId)).toMatchObject({ status: 'resolved', resolvedYear: 162 });
      expect(late.eventLedger.some((item) => item.detail.includes('零陵蠻起事侵擾長沙'))).toBe(false);
    }

    const old = oldSave(161, 659, 'phase4-scenario-274');
    const oldPrefix = structuredClone(old.events);
    const migrated = verifySave(toJson(old));
    expect(migrated.events.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === linglingId)?.status).toBe('pending');
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    const lateSave = verifySave(toJson(oldSave(162, 660, 'phase4-scenario-274')));
    expect(lateSave.state.phase4?.nodes.find((node) => node.contentId === linglingId)).toMatchObject({ status: 'resolved', resolvedYear: 162 });
    expect(lateSave.state.phase4?.eventLedger.some((item) => item.detail.includes('零陵蠻起事侵擾長沙'))).toBe(false);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A653 記錄武陵蠻寇江陵及馮緄討平，保留年級精度', () => {
    const wulingId = 'wuling-revolt-raids-jiangling-feng-gun-162';
    const previous = createPhase4Model(161, 1, [], 'phase4-scenario-275');
    const oldLedger = structuredClone(previous.eventLedger);
    const upgraded = upgradePhase4Content(previous, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, oldLedger.length)).toEqual(oldLedger);
    expect(upgraded.nodes.find((node) => node.contentId === wulingId)?.status).toBe('pending');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === wulingId)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('武陵蠻叛寇江陵'));
    expect(event?.source).toContain('冬十月');
    expect(event?.source).toContain('南郡太守李肅因敗退棄市');
    expect(event?.source).toContain('十一月馮緄於武陵大破叛蠻');
    expect(HISTORY_CONTENT.find((item) => item.id === wulingId)).toMatchObject({
      startYear: 162,
      endYear: 162,
      precision: 'year',
      introducedRevision: 276,
    });
    expect(HISTORY_CONTENT.find((item) => item.id === wulingId)?.sourceDateNote).toBeUndefined();

    for (const year of [162, 163]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-275'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === wulingId)).toMatchObject({ status: 'resolved', resolvedYear: 162 });
      expect(late.eventLedger.some((item) => item.detail.includes('武陵蠻叛寇江陵'))).toBe(false);
    }

    const old = oldSave(161, 661, 'phase4-scenario-275');
    const oldPrefix = structuredClone(old.events);
    const migrated = verifySave(toJson(old));
    expect(migrated.events.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === wulingId)?.status).toBe('pending');
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    const lateSave = verifySave(toJson(oldSave(162, 662, 'phase4-scenario-275')));
    expect(lateSave.state.phase4?.nodes.find((node) => node.contentId === wulingId)).toMatchObject({ status: 'resolved', resolvedYear: 162 });
    expect(lateSave.state.phase4?.eventLedger.some((item) => item.detail.includes('武陵蠻叛寇江陵'))).toBe(false);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A654 補列蜀郡屬國夷叛並保留三月來源註記', () => {
    const shuId = 'shu-dependent-country-revolt-163';
    const previous = createPhase4Model(162, 1, [], 'phase4-scenario-276');
    const oldLedger = structuredClone(previous.eventLedger);
    const upgraded = upgradePhase4Content(previous, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, oldLedger.length)).toEqual(oldLedger);
    expect(upgraded.nodes.find((node) => node.contentId === shuId)?.status).toBe('pending');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === shuId)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('蜀郡屬國夷叛'));
    expect(event?.source).toContain('延熹六年三月');
    expect(HISTORY_CONTENT.find((item) => item.id === shuId)).toMatchObject({
      startYear: 163,
      endYear: 163,
      precision: 'year',
      introducedRevision: 277,
      sourceDateNote: '延熹六年三月；遊戲只按 163 年級觸發，不換算漢曆月份為模型日期。',
    });

    for (const year of [163, 164]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-276'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === shuId)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
      expect(late.eventLedger.some((item) => item.detail.includes('蜀郡屬國夷叛'))).toBe(false);
    }

    const old = oldSave(162, 663, 'phase4-scenario-276');
    const oldPrefix = structuredClone(old.events);
    const migrated = verifySave(toJson(old));
    expect(migrated.events.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === shuId)?.status).toBe('pending');
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    const lateSave = verifySave(toJson(oldSave(163, 664, 'phase4-scenario-276')));
    expect(lateSave.state.phase4?.nodes.find((node) => node.contentId === shuId)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
    expect(lateSave.state.phase4?.eventLedger.some((item) => item.detail.includes('蜀郡屬國夷叛'))).toBe(false);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });
});
