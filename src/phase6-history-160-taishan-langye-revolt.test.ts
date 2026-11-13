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

  it('A655 補列桂陽盜賊李研等寇郡界，不推定月份與後續', () => {
    const id = 'guiyang-bandits-li-yan-163';
    const previous = createPhase4Model(162, 1, [], 'phase4-scenario-277');
    const oldLedger = structuredClone(previous.eventLedger);
    const upgraded = upgradePhase4Content(previous, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, oldLedger.length)).toEqual(oldLedger);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('桂陽盜賊李研等寇郡界'));
    expect(event?.source).toContain('《後漢書》卷七');
    expect(HISTORY_CONTENT.find((item) => item.id === id)).toMatchObject({
      startYear: 163,
      endYear: 163,
      precision: 'year',
      introducedRevision: 278,
    });
    expect(HISTORY_CONTENT.find((item) => item.id === id)?.sourceDateNote).toBeUndefined();

    for (const year of [163, 164]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-277'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
      expect(late.eventLedger.some((item) => item.detail.includes('桂陽盜賊李研等寇郡界'))).toBe(false);
    }

    const old = oldSave(162, 665, 'phase4-scenario-277');
    const prefix = structuredClone(old.events);
    const migrated = verifySave(toJson(old));
    expect(migrated.events.slice(0, prefix.length)).toEqual(prefix);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    const lateSave = verifySave(toJson(oldSave(163, 666, 'phase4-scenario-277')));
    expect(lateSave.state.phase4?.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
    expect(lateSave.state.phase4?.eventLedger.some((item) => item.detail.includes('桂陽盜賊李研等寇郡界'))).toBe(false);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A656 補列孫羌討滇那羌並擊破記事', () => {
    const id = 'sun-qiang-defeats-dian-na-qiang-163';
    const previous = createPhase4Model(162, 1, [], 'phase4-scenario-278');
    const prefix = structuredClone(previous.eventLedger);
    const upgraded = upgradePhase4Content(previous, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('孫羌討滇那羌並擊破'));
    expect(event?.source).toContain('隴西太守孫羌討滇那羌，破之');
    expect(HISTORY_CONTENT.find((item) => item.id === id)).toMatchObject({
      startYear: 163,
      endYear: 163,
      precision: 'year',
      introducedRevision: 279,
    });
    expect(HISTORY_CONTENT.find((item) => item.id === id)?.sourceDateNote).toBeUndefined();

    for (const year of [163, 164]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-278'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
      expect(late.eventLedger.some((item) => item.detail.includes('孫羌討滇那羌並擊破'))).toBe(false);
    }

    const old = oldSave(162, 667, 'phase4-scenario-278');
    const oldEvents = structuredClone(old.events);
    const migrated = verifySave(toJson(old));
    expect(migrated.events.slice(0, oldEvents.length)).toEqual(oldEvents);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    const lateSave = verifySave(toJson(oldSave(163, 668, 'phase4-scenario-278')));
    expect(lateSave.state.phase4?.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
    expect(lateSave.state.phase4?.eventLedger.some((item) => item.detail.includes('孫羌討滇那羌並擊破'))).toBe(false);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A657 補列南海賊寇郡界記事，不推定規模與後續', () => {
    const id = 'nanhai-bandits-raid-163';
    const previous = createPhase4Model(162, 1, [], 'phase4-scenario-279');
    const prefix = structuredClone(previous.eventLedger);
    const upgraded = upgradePhase4Content(previous, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('南海賊寇郡界'));
    expect(event?.source).toContain('《後漢書》卷七');
    expect(HISTORY_CONTENT.find((item) => item.id === id)).toMatchObject({
      startYear: 163,
      endYear: 163,
      precision: 'year',
      introducedRevision: 280,
    });

    for (const year of [163, 164]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-279'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
      expect(late.eventLedger.some((item) => item.detail.includes('南海賊寇郡界'))).toBe(false);
    }

    const old = oldSave(162, 669, 'phase4-scenario-279');
    const oldEvents = structuredClone(old.events);
    const migrated = verifySave(toJson(old));
    expect(migrated.events.slice(0, oldEvents.length)).toEqual(oldEvents);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    const lateSave = verifySave(toJson(oldSave(163, 670, 'phase4-scenario-279')));
    expect(lateSave.state.phase4?.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
    expect(lateSave.state.phase4?.eventLedger.some((item) => item.detail.includes('南海賊寇郡界'))).toBe(false);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A658 補列馮緄免職並保留八月來源日期註記', () => {
    const id = 'feng-gun-dismissed-163';
    const previous = createPhase4Model(162, 1, [], 'phase4-scenario-280');
    const prefix = structuredClone(previous.eventLedger);
    const upgraded = upgradePhase4Content(previous, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('車騎將軍馮緄免職'));
    expect(event?.source).toContain('延熹六年八月');
    expect(HISTORY_CONTENT.find((item) => item.id === id)).toMatchObject({
      startYear: 163,
      endYear: 163,
      precision: 'year',
      introducedRevision: 281,
      sourceDateNote: '延熹六年八月；遊戲按 163 年級觸發，不換算漢曆月份。',
    });

    for (const year of [163, 164]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-280'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
      expect(late.eventLedger.some((item) => item.detail.includes('車騎將軍馮緄免職'))).toBe(false);
    }

    const old = oldSave(162, 671, 'phase4-scenario-280');
    const oldEvents = structuredClone(old.events);
    const migrated = verifySave(toJson(old));
    expect(migrated.events.slice(0, oldEvents.length)).toEqual(oldEvents);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migrated.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    const lateSave = verifySave(toJson(oldSave(163, 672, 'phase4-scenario-280')));
    expect(lateSave.state.phase4?.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
    expect(lateSave.state.phase4?.eventLedger.some((item) => item.detail.includes('車騎將軍馮緄免職'))).toBe(false);
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A659–A660 補列 163 年十一、十二月三公任免記事', () => {
    const ids = ['liu-chong-dismissed-163', 'zhou-jing-appointed-sikong-163'];
    const prior = createPhase4Model(162, 1, [], 'phase4-scenario-281');
    const oldPrefix = structuredClone(prior.eventLedger);
    const upgraded = upgradePhase4Content(prior, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    for (const [index, id] of ids.entries()) {
      expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
      const node = HISTORY_CONTENT.find((item) => item.id === id);
      expect(node).toMatchObject({ startYear: 163, endYear: 163, precision: 'year', introducedRevision: 282 + index });
      expect(node?.sourceDateNote).toContain(index === 0 ? '十一月' : '十二月');
    }

    const advanced = advancePhase4(upgraded, 360);
    for (const [index, id] of ids.entries()) {
      const node = advanced.nodes.find((item) => item.contentId === id);
      expect(node?.status).toBe('triggered');
      const label = index === 0 ? '司空劉寵免職' : '周景任司空';
      expect(advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes(label))?.source).toContain(index === 0 ? '延熹六年十一月' : '延熹六年十二月');
    }

    for (const year of [163, 164]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-281'), PHASE4_CONTENT_VERSION);
      for (const id of ids) {
        expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
        expect(late.eventLedger.some((item) => item.detail.includes(id === ids[0] ? '司空劉寵免職' : '周景任司空'))).toBe(false);
      }
    }

    const old = oldSave(162, 673, 'phase4-scenario-281');
    const oldEvents = structuredClone(old.events);
    const migrated = verifySave(toJson(old));
    expect(migrated.events.slice(0, oldEvents.length)).toEqual(oldEvents);
    for (const id of ids) expect(migrated.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    const lateSave = verifySave(toJson(oldSave(163, 674, 'phase4-scenario-281')));
    for (const id of ids) expect(lateSave.state.phase4?.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A661 補列 163 年十月桓帝校獵與巡幸記事', () => {
    const id = 'emperor-hunts-guangcheng-visits-hangu-shanglin-163';
    const old = createPhase4Model(162, 1, [], 'phase4-scenario-283');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 163, endYear: 163, precision: 'year', introducedRevision: 284 });
    expect(node?.sourceDateNote).toContain('冬十月丙辰');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('桓帝校獵'))?.source).toContain('延熹六年冬十月丙辰');

    for (const year of [163, 164]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-283'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((item) => item.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
      expect(late.eventLedger.some((item) => item.detail.includes('桓帝校獵'))).toBe(false);
    }

    const oldSaveData = oldSave(162, 675, 'phase4-scenario-283');
    const oldEvents = structuredClone(oldSaveData.events);
    const migrated = verifySave(toJson(oldSaveData));
    expect(migrated.events.slice(0, oldEvents.length)).toEqual(oldEvents);
    expect(migrated.state.phase4?.nodes.find((item) => item.contentId === id)?.status).toBe('pending');
    const lateSave = verifySave(toJson(oldSave(163, 676, 'phase4-scenario-283')));
    expect(lateSave.state.phase4?.nodes.find((item) => item.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A662 補列 163 年七月平陵園寢失火記事', () => {
    const id = 'pingling-mausoleum-chamber-fire-163';
    const old = createPhase4Model(162, 1, [], 'phase4-scenario-284');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 163, endYear: 163, precision: 'year', introducedRevision: 285 });
    expect(node?.sourceDateNote).toContain('秋七月甲申');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('平陵園寢失火'))?.source).toContain('延熹六年秋七月甲申');

    for (const year of [163, 164]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-284'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((item) => item.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
      expect(late.eventLedger.some((item) => item.detail.includes('平陵園寢失火'))).toBe(false);
    }

    const legacy = oldSave(162, 677, 'phase4-scenario-284');
    const legacyEvents = structuredClone(legacy.events);
    const migrated = verifySave(toJson(legacy));
    expect(migrated.events.slice(0, legacyEvents.length)).toEqual(legacyEvents);
    expect(migrated.state.phase4?.nodes.find((item) => item.contentId === id)?.status).toBe('pending');
    const lateSave = verifySave(toJson(oldSave(163, 678, 'phase4-scenario-284')));
    expect(lateSave.state.phase4?.nodes.find((item) => item.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A663 補列 163 年二月、三月與四月記事', () => {
    const entries = [
      { id: 'zhong-hao-dies-163', title: '司徒種暠去世', source: '春二月戊午', note: '二月戊午' },
      { id: 'general-amnesty-163', title: '戊戌大赦天下', source: '三月戊戌', note: '三月戊戌' },
      { id: 'xu-xu-appointed-situ-163', title: '許栩任司徒', source: '衛尉潁川許栩為司徒', note: '未為此任命另標月日' },
      { id: 'kangling-east-office-fire-163', title: '康陵東署失火', source: '夏四月辛亥', note: '夏四月辛亥' },
    ];
    const old = createPhase4Model(162, 1, [], 'phase4-scenario-285');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);

    for (const entry of entries) {
      expect(upgraded.nodes.find((node) => node.contentId === entry.id)?.status).toBe('pending');
      const node = HISTORY_CONTENT.find((item) => item.id === entry.id);
      expect(node).toMatchObject({ startYear: 163, endYear: 163, precision: 'year', introducedRevision: 286 });
      expect(node?.sourceDateNote).toContain(entry.note);
    }

    const advanced = advancePhase4(upgraded, 360);
    for (const entry of entries) {
      expect(advanced.nodes.find((node) => node.contentId === entry.id)?.status).toBe('triggered');
      expect(advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes(entry.title))?.source).toContain(entry.source);
    }

    for (const year of [163, 164]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-285'), PHASE4_CONTENT_VERSION);
      for (const entry of entries) {
        expect(late.nodes.find((node) => node.contentId === entry.id)).toMatchObject({ status: 'resolved', resolvedYear: 163 });
        expect(late.eventLedger.some((item) => item.detail.includes(entry.title))).toBe(false);
      }
    }

    const legacy = oldSave(162, 679, 'phase4-scenario-285');
    const legacyEvents = structuredClone(legacy.events);
    const migrated = verifySave(toJson(legacy));
    expect(migrated.events.slice(0, legacyEvents.length)).toEqual(legacyEvents);
    for (const entry of entries) expect(migrated.state.phase4?.nodes.find((node) => node.contentId === entry.id)?.status).toBe('pending');
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A664 補列 164 年王侯去世、天象與天候記事', () => {
    const entries = [
      { id: 'pei-prince-rong-dies-164', title: '沛王榮去世', source: '春正月庚寅', note: '春正月庚寅' },
      { id: 'meteor-falls-hu-164', title: '隕石落於鄠', source: '三月癸亥', note: '三月癸亥' },
      { id: 'liang-prince-cheng-dies-164', title: '梁王成去世', source: '夏四月丙寅', note: '夏四月丙寅' },
      { id: 'capital-hail-164', title: '京師雨雹', source: '五月己丑', note: '五月己丑' },
      { id: 'zhao-prince-qian-dies-164', title: '趙王乾去世', source: '秋七月辛卯', note: '秋七月辛卯' },
      { id: 'dead-dragon-reported-ye-wang-mountain-164', title: '野王山上有死龍之報', source: '野王山上有死龍', note: '未為「野王山上有死龍」另標月日' },
    ];
    const old = createPhase4Model(163, 1, [], 'phase4-scenario-286');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);

    for (const entry of entries) {
      expect(upgraded.nodes.find((node) => node.contentId === entry.id)?.status).toBe('pending');
      const node = HISTORY_CONTENT.find((item) => item.id === entry.id);
      expect(node).toMatchObject({ startYear: 164, endYear: 164, precision: 'year', introducedRevision: 287 });
      expect(node?.sourceDateNote).toContain(entry.note);
    }

    const advanced = advancePhase4(upgraded, 360);
    for (const entry of entries) {
      expect(advanced.nodes.find((node) => node.contentId === entry.id)?.status).toBe('triggered');
      expect(advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes(entry.title))?.source).toContain(entry.source);
    }

    for (const year of [164, 165]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-286'), PHASE4_CONTENT_VERSION);
      for (const entry of entries) {
        expect(late.nodes.find((node) => node.contentId === entry.id)).toMatchObject({ status: 'resolved', resolvedYear: 164 });
        expect(late.eventLedger.some((item) => item.detail.includes(entry.title))).toBe(false);
      }
    }

    const legacy = oldSave(163, 680, 'phase4-scenario-286');
    const legacyEvents = structuredClone(legacy.events);
    const migrated = verifySave(toJson(legacy));
    expect(migrated.events.slice(0, legacyEvents.length)).toEqual(legacyEvents);
    for (const entry of entries) expect(migrated.state.phase4?.nodes.find((node) => node.contentId === entry.id)?.status).toBe('pending');
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A665 補列 164 年南巡與還宮記事', () => {
    const entries = [
      { id: 'emperor-southern-tour-164', title: '桓帝南巡章陵、雲夢與新野', source: '冬十月壬寅，南巡狩', note: '冬十月壬寅' },
      { id: 'emperor-returns-palace-164', title: '桓帝還宮', source: '十二月辛丑，車駕還宮', note: '十二月辛丑' },
    ];
    const old = createPhase4Model(163, 1, [], 'phase4-scenario-287');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);

    for (const entry of entries) {
      expect(upgraded.nodes.find((node) => node.contentId === entry.id)?.status).toBe('pending');
      const node = HISTORY_CONTENT.find((item) => item.id === entry.id);
      expect(node).toMatchObject({ startYear: 164, endYear: 164, precision: 'year', introducedRevision: 288 });
      expect(node?.sourceDateNote).toContain(entry.note);
    }

    const advanced = advancePhase4(upgraded, 360);
    for (const entry of entries) {
      expect(advanced.nodes.find((node) => node.contentId === entry.id)?.status).toBe('triggered');
      expect(advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes(entry.title))?.source).toContain(entry.source);
    }

    for (const year of [164, 165]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-287'), PHASE4_CONTENT_VERSION);
      for (const entry of entries) {
        expect(late.nodes.find((node) => node.contentId === entry.id)).toMatchObject({ status: 'resolved', resolvedYear: 164 });
        expect(late.eventLedger.some((item) => item.detail.includes(entry.title))).toBe(false);
      }
    }

    const legacy = oldSave(163, 681, 'phase4-scenario-287');
    const legacyEvents = structuredClone(legacy.events);
    const migrated = verifySave(toJson(legacy));
    expect(migrated.events.slice(0, legacyEvents.length)).toEqual(legacyEvents);
    for (const entry of entries) expect(migrated.state.phase4?.nodes.find((node) => node.contentId === entry.id)?.status).toBe('pending');
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A666 補列 164 年段熲擊破當煎羌記事', () => {
    const id = 'duan-jiong-defeats-dangjian-qiang-164';
    const old = createPhase4Model(163, 1, [], 'phase4-scenario-288');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    const node = HISTORY_CONTENT.find((item) => item.id === id);
    expect(node).toMatchObject({ startYear: 164, endYear: 164, precision: 'year', introducedRevision: 289 });
    expect(node?.sourceDateNote).toContain('未為此討擊另標月日');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((item) => item.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.find((item) => item.type === '史實事件形成' && item.detail.includes('段熲擊破當煎羌'))?.source).toContain('擊當煎羌，破之');

    for (const year of [164, 165]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-288'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((item) => item.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 164 });
      expect(late.eventLedger.some((item) => item.detail.includes('段熲擊破當煎羌'))).toBe(false);
    }

    const legacy = oldSave(163, 682, 'phase4-scenario-288');
    const legacyEvents = structuredClone(legacy.events);
    const migrated = verifySave(toJson(legacy));
    expect(migrated.events.slice(0, legacyEvents.length)).toEqual(legacyEvents);
    expect(migrated.state.phase4?.nodes.find((item) => item.contentId === id)?.status).toBe('pending');
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A667 補列 165 年王爵處分、廢后、羌事與陵寢火災', () => {
    const ids = [
      'bohai-king-kui-demoted-165',
      'empress-deng-deposed-165',
      'duan-jiong-defeats-qiang-165',
      'anling-mausoleum-fire-165',
      'duan-jiong-defeats-dangjian-qiang-165',
    ];
    const old = createPhase4Model(164, 1, [], 'phase4-scenario-289');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-418');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    for (const id of ids) expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(HISTORY_CONTENT.find((item) => item.id === ids[0])).toMatchObject({ startYear: 165, endYear: 165, precision: 'year', introducedRevision: 290 });
    expect(HISTORY_CONTENT.find((item) => item.id === ids[1])?.source).toContain('鄧萬世、虎賁中郎將鄧會下獄死');
    expect(HISTORY_CONTENT.find((item) => item.id === ids[2])?.source).toContain('擊䍐姐羌，破之');
    expect(HISTORY_CONTENT.find((item) => item.id === ids[3])?.sourceDateNote).toContain('夏四月甲寅');
    expect(HISTORY_CONTENT.find((item) => item.id === ids[4])?.sourceDateNote).toContain('六月');

    const advanced = advancePhase4(upgraded, 360);
    for (const id of ids) expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    for (const year of [165, 166]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-289'), PHASE4_CONTENT_VERSION);
      for (const id of ids) {
        expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 165 });
        expect(late.eventLedger.some((item) => item.detail.includes(HISTORY_CONTENT.find((entry) => entry.id === id)!.title))).toBe(false);
      }
    }

    const legacy = oldSave(164, 690, 'phase4-scenario-289');
    const legacyEvents = structuredClone(legacy.events);
    const migrated = verifySave(toJson(legacy));
    expect(migrated.events.slice(0, legacyEvents.length)).toEqual(legacyEvents);
    for (const id of ids) expect(migrated.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A668 補列 165 年首次按畝徵收稅錢記事', () => {
    const id = 'first-land-tax-per-mu-165';
    const old = createPhase4Model(164, 1, [], 'phase4-scenario-290');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    const content = HISTORY_CONTENT.find((item) => item.id === id);

    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-418');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(content).toMatchObject({ startYear: 165, endYear: 165, precision: 'year', introducedRevision: 291 });
    expect(content?.source).toContain('延熹八年八月戊辰，初令郡國有田者畒斂稅錢；原注文曰「畒十錢也」');
    expect(content?.description).toContain('原注文明載每畝十錢');
    expect(content?.sourceDateNote).toContain('八月戊辰');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    for (const year of [165, 166]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-290'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 165 });
      expect(late.eventLedger.some((item) => item.detail.includes(content!.title))).toBe(false);
    }

    const legacy = oldSave(164, 690, 'phase4-scenario-290');
    const legacyEvents = structuredClone(legacy.events);
    const migrated = verifySave(toJson(legacy));
    expect(migrated.events.slice(0, legacyEvents.length)).toEqual(legacyEvents);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(verifySave(toJson(migrated))).toEqual(migrated);

    const playedAt165 = advancePhase4(createPhase4Model(164, 1, [], 'phase4-scenario-291'), 360);
    const playedPrefix = structuredClone(playedAt165.eventLedger);
    expect(playedAt165.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const refined = upgradePhase4Content(playedAt165, PHASE4_CONTENT_VERSION);
    expect(refined.eventLedger.slice(0, playedPrefix.length)).toEqual(playedPrefix);
    expect(refined.nodes.find((node) => node.contentId === id)?.evidence).toContainEqual(expect.stringContaining('每畝十錢'));
    expect(refined.eventLedger.filter((item) => item.type === '史實來源補充' && item.detail.includes('原注文「畒十錢也」'))).toHaveLength(1);
    expect(upgradePhase4Content(refined, PHASE4_CONTENT_VERSION)).toEqual(refined);
  });

  it('A670 補列 165 年勃海蓋登等自稱太上皇帝記事', () => {
    const id = 'bohai-gai-deng-revolt-165';
    const old = createPhase4Model(164, 1, [], 'phase4-scenario-292');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    const content = HISTORY_CONTENT.find((item) => item.id === id);

    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-418');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(content).toMatchObject({ startYear: 165, endYear: 165, precision: 'year', introducedRevision: 293 });
    expect(content?.source).toContain('勃海妖賊蓋登等稱「太上皇帝」');
    expect(content?.source).toContain('皆伏誅');
    expect(content?.description).toContain('不補查獲、審理');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.some((event) => event.detail.includes(content!.title))).toBe(true);

    for (const year of [165, 166]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-292'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 165 });
      expect(late.eventLedger.some((event) => event.detail.includes(content!.title))).toBe(false);
    }

    const legacy = oldSave(164, 690, 'phase4-scenario-292');
    const legacyEvents = structuredClone(legacy.events);
    const migrated = verifySave(toJson(legacy));
    expect(migrated.events.slice(0, legacyEvents.length)).toEqual(legacyEvents);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A671 補列 165 年三公更迭與竇氏立后記事', () => {
    const id = 'court-succession-and-empress-dou-165';
    const old = createPhase4Model(164, 1, [], 'phase4-scenario-293');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    const content = HISTORY_CONTENT.find((item) => item.id === id);

    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-418');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(content).toMatchObject({ startYear: 165, endYear: 165, precision: 'year', introducedRevision: 294 });
    expect(content?.source).toContain('五月丙戌，太尉楊秉薨');
    expect(content?.source).toContain('秋七月，太中大夫陳蕃爲太尉');
    expect(content?.source).toContain('冬十月，司空周景免，太常劉茂爲司空');
    expect(content?.source).toContain('辛巳，立貴人竇氏爲皇后');
    expect(content?.sourceDateNote).toContain('不換算漢曆日期');
    expect(content?.description).toContain('不推測任免原因');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.some((event) => event.detail.includes(content!.title))).toBe(true);

    for (const year of [165, 166]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-293'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 165 });
      expect(late.eventLedger.some((event) => event.detail.includes(content!.title))).toBe(false);
    }

    const legacy = oldSave(164, 691, 'phase4-scenario-293');
    const legacyEvents = structuredClone(legacy.events);
    const migrated = verifySave(toJson(legacy));
    expect(migrated.events.slice(0, legacyEvents.length)).toEqual(legacyEvents);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A672 獨立補列 165 年緱氏地裂記事', () => {
    const id = 'goushi-ground-split-165';
    const old = createPhase4Model(164, 1, [], 'phase4-scenario-294');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    const content = HISTORY_CONTENT.find((item) => item.id === id);

    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-418');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(content).toMatchObject({ startYear: 165, endYear: 165, precision: 'year', introducedRevision: 295 });
    expect(content?.source).toContain('丙辰，緱氏地裂');
    expect(content?.sourceDateNote).toContain('未重標月份');
    expect(content?.description).toContain('不推測成因、範圍、損害');

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.some((event) => event.detail.includes(content!.title))).toBe(true);

    for (const year of [165, 166]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], 'phase4-scenario-294'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 165 });
      expect(late.eventLedger.some((event) => event.detail.includes(content!.title))).toBe(false);
    }

    const legacy = oldSave(164, 692, 'phase4-scenario-294');
    const legacyEvents = structuredClone(legacy.events);
    const migrated = verifySave(toJson(legacy));
    expect(migrated.events.slice(0, legacyEvents.length)).toEqual(legacyEvents);
    expect(migrated.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(verifySave(toJson(migrated))).toEqual(migrated);
  });

  it('A673 補齊既有 165 年胡蘭、朱蓋記事的官員後續，升版不重複結算', () => {
    const id = 'hu-lan-zhu-gai-revolt-165';
    const content = HISTORY_CONTENT.find((item) => item.id === id);
    const oldVersion = 'phase4-scenario-295';
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-418');
    expect(content?.source).toContain('零陵太守陳球拒之');
    expect(content?.source).toContain('蒼梧太守張叙為賊所執');
    expect(content?.source).toContain('桂陽太守任胤背敵畏懦，二人皆棄市');

    const previouslyPlayed = advancePhase4(createPhase4Model(164, 1, [], oldVersion), 360);
    const oldEventPrefix = structuredClone(previouslyPlayed.eventLedger);
    expect(previouslyPlayed.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const migratedPlayed = upgradePhase4Content(previouslyPlayed, PHASE4_CONTENT_VERSION);
    const sourceMarker = '延熹八年桂陽、蒼梧記事來源補充';
    expect(migratedPlayed.eventLedger.slice(0, oldEventPrefix.length)).toEqual(oldEventPrefix);
    expect(migratedPlayed.nodes.find((node) => node.contentId === id)?.evidence).toContainEqual(expect.stringContaining(sourceMarker));
    expect(migratedPlayed.eventLedger.filter((event) => event.type === '史實來源補充' && event.detail.includes(sourceMarker))).toHaveLength(1);
    expect(upgradePhase4Content(migratedPlayed, PHASE4_CONTENT_VERSION)).toEqual(migratedPlayed);

    const legacy = oldSave(164, 693, oldVersion);
    const legacyEvents = structuredClone(legacy.events);
    const migratedSave = verifySave(toJson(legacy));
    expect(migratedSave.events.slice(0, legacyEvents.length)).toEqual(legacyEvents);
    expect(migratedSave.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(migratedSave.state.phase4?.nodes.find((node) => node.contentId === id)?.evidence).toContainEqual(expect.stringContaining(sourceMarker));
    expect(verifySave(toJson(migratedSave))).toEqual(migratedSave);
  });
  it('A674 補列 165 年官署裁撤、南宮閏月火災與京師地震', () => {
    const ids = [
      'taishan-commandant-office-abolished-165',
      'southern-palace-intercalary-fire-165',
      'capital-earthquake-165',
    ];
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-418');
    const entries = ids.map((id) => HISTORY_CONTENT.find((item) => item.id === id));
    expect(entries.map((item) => item?.introducedRevision)).toEqual([297, 297, 297]);
    expect(entries[0]?.sourceDateNote).toContain('五月壬申');
    expect(entries[1]?.sourceDateNote).toContain('閏月甲午');
    expect(entries[2]?.sourceDateNote).toContain('九月丁未');
    expect(entries[1]?.description).toContain('不推測起火原因、損害、傷亡');
    expect(entries[2]?.description).toContain('不推測震度、損害、傷亡');

    const oldVersion = 'phase4-scenario-296';
    const old = createPhase4Model(164, 1, [], oldVersion);
    const oldPrefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0, oldPrefix.length)).toEqual(oldPrefix);
    for (const id of ids) expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    const advanced = advancePhase4(upgraded, 360);
    for (const id of ids) expect(advanced.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    for (const entry of entries) expect(advanced.eventLedger.some((event) => event.detail.includes(entry!.title))).toBe(true);

    for (const year of [165, 166]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, [], oldVersion), PHASE4_CONTENT_VERSION);
      for (const entry of entries) {
        expect(late.nodes.find((node) => node.contentId === entry!.id)).toMatchObject({ status: 'resolved', resolvedYear: 165 });
        expect(late.eventLedger.some((event) => event.detail.includes(entry!.title))).toBe(false);
      }
    }

    const legacy = oldSave(164, 694, oldVersion);
    const legacyEvents = structuredClone(legacy.events);
    const migratedSave = verifySave(toJson(legacy));
    expect(migratedSave.events.slice(0, legacyEvents.length)).toEqual(legacyEvents);
    for (const id of ids) expect(migratedSave.state.phase4?.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(verifySave(toJson(migratedSave))).toEqual(migratedSave);
  });

});
