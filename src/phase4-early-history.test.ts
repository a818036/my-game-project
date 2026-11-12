import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';
import { createOpeningFacts, dispatch, ENGINE_VERSION, type GameState, type OpeningHistory } from './engine';
import { answerKnownHistoricalEventQuestion } from './life';

const persons = [{ id: 'sample-person', name: '示例人物', alive: true, location: '郡府', office: '縣令' }];
const eventId = 'yizhou-ma-xiang-revolt-188';
function world(): GameState {
  const history: OpeningHistory = { regions: [], surnames: [] };
  const facts = createOpeningFacts(23, 184, history);
  return dispatch(null, { version: ENGINE_VERSION, commandId: 'history-question-world', expectedRevision: 0, type: 'StartGame', name: `${facts.surname}景初`, seed: 23, facts }).state!;
}

describe('168 年日食後詔令記事', () => {
  it('A557 分列封事與舉士詔令；v227 遷移保留前綴、可續玩且不回補', () => {
    const id = 'e168';
    const fresh = advancePhase4(createPhase4Model(167, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('日食詔'));
    expect(event?.source).toContain('五月丁未朔日食');
    expect(event?.source).toContain('求封事');
    expect(event?.source).toContain('求封事、舉士');
    expect(event?.source).toContain('徵故刺史');
    const before = world();
    const snapshot = structuredClone(before);
    expect(answerKnownHistoricalEventQuestion('西元 168 年日食後下了什麼詔？', before)?.answer).toContain('日食詔');
    expect(before).toEqual(snapshot);

    const old = createPhase4Model(167, 1, persons, 'phase4-scenario-227');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    for (const year of [168, 169]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, persons, 'phase4-scenario-227'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 168 });
      expect(late.eventLedger.some((item) => item.detail.includes('日食詔'))).toBe(false);
    }
  });
});

describe('168 年逢義山羌戰記事', () => {
  it('A562 獨立記錄先於涇陽的逢義山戰事；v232 遷移保留前綴且同年不回補', () => {
    const id = 'duan-jiong-defeats-xianling-fengyishan-168';
    const fresh = advancePhase4(createPhase4Model(167, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('段熲大破先零羌於逢義山'));
    expect(event?.source).toBe('《後漢書》卷八〈孝靈帝紀〉段熲大破先零羌於逢義山。');
    const old = createPhase4Model(167, 1, persons, 'phase4-scenario-232');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const late = upgradePhase4Content(createPhase4Model(168, 1, persons, 'phase4-scenario-232'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 168 });
    expect(late.eventLedger.some((item) => item.detail.includes('段熲大破先零羌於逢義山'))).toBe(false);
  });
});

describe('168 年四、五月太尉與司空任免', () => {
  it('A563 並列原典記載的官職交替；v233 遷移保留前綴且同年不回補', () => {
    const id = 'court-offices-reorganized-spring-168';
    const fresh = advancePhase4(createPhase4Model(167, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('太尉與司空任免交替'));
    expect(event?.source).toBe('《後漢書》卷八〈孝靈帝紀〉夏四月太尉周景薨，司空宣酆免；長樂衛尉王暢為司空。五月太中大夫劉矩為太尉。');
    const old = createPhase4Model(167, 1, persons, 'phase4-scenario-233');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const late = upgradePhase4Content(createPhase4Model(168, 1, persons, 'phase4-scenario-233'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 168 });
    expect(late.eventLedger.some((item) => item.detail.includes('太尉與司空任免交替'))).toBe(false);
  });
});

describe('168 年八月司空任免', () => {
  it('A564 補全秋冬三公任免；v234／v235 遷移保留前綴且同年不回補', () => {
    const id = 'wang-chang-liu-chong-succession-168';
    const fresh = advancePhase4(createPhase4Model(167, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('三公官職秋冬交替'));
    expect(event?.source).toBe('《後漢書》卷八〈孝靈帝紀〉八月司空王暢免，宗正劉寵為司空；十一月太尉劉矩免，太僕沛國聞人襲為太尉。');
    const old = createPhase4Model(167, 1, persons, 'phase4-scenario-234');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const late = upgradePhase4Content(createPhase4Model(168, 1, persons, 'phase4-scenario-234'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 168 });
    expect(late.eventLedger.some((item) => item.detail.includes('三公官職秋冬交替'))).toBe(false);
    const priorSource = createPhase4Model(167, 1, persons, 'phase4-scenario-235');
    const priorPrefix = structuredClone(priorSource.eventLedger);
    const prior = upgradePhase4Content(priorSource, PHASE4_CONTENT_VERSION);
    expect(prior.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(prior.eventLedger.slice(0, priorPrefix.length)).toEqual(priorPrefix);
    expect(advancePhase4(prior, 360).eventLedger.some((item) => item.source?.includes('聞人襲為太尉'))).toBe(true);
  });

  it('A567 史實年表會呈現八月與十一月任免，查詢不改變世界狀態', () => {
    const state = world();
    state.world.year = 168;
    const before = structuredClone(state);
    const answer = answerKnownHistoricalEventQuestion('西元 168 年有哪些史實事件？', state);
    expect(answer?.answer).toContain('三公官職秋冬交替');
    expect(answer?.answer).toContain('十一月太尉劉矩免，太僕沛國聞人襲為太尉');
    expect(state).toEqual(before);
  });
});

describe('168 年段熲再破先零羌記事', () => {
  it('A558 分列秋七月戰事；v228 遷移保留前綴、續玩可觸發且不回補', () => {
    const id = 'duan-jiong-defeats-xianling-jingyang-168';
    const fresh = advancePhase4(createPhase4Model(167, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('段熲再破先零羌'));
    expect(event?.source).toBe('《後漢書》卷八〈孝靈帝紀〉秋七月破羌將軍段熲復破先零羌於涇陽。');
    const queryState = world();
    queryState.world.year = 168;
    const querySnapshot = structuredClone(queryState);
    const answer = answerKnownHistoricalEventQuestion('西元 168 年段熲在涇陽做了什麼？', queryState);
    expect(answer?.answer).toContain('段熲再破先零羌');
    expect(answer?.answer).toContain('《後漢書》卷八');
    expect(queryState).toEqual(querySnapshot);
    const old = createPhase4Model(167, 1, persons, 'phase4-scenario-228');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    for (const year of [168, 169]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, persons, 'phase4-scenario-228'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 168 });
      expect(late.eventLedger.some((item) => item.detail.includes('段熲再破先零羌'))).toBe(false);
    }
  });
});

describe('168 年京師雨水記事', () => {
  it('A559 只記六月雨水原文；v229 遷移保留前綴並阻止同年回補', () => {
    const id = 'capital-rainwater-168';
    const fresh = advancePhase4(createPhase4Model(167, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('京師雨水'));
    expect(event?.source).toBe('《後漢書》卷八〈孝靈帝紀〉六月京師雨水。');
    expect(HISTORY_CONTENT.find((item) => item.id === id)?.description).not.toMatch(/洪水|損失|災害/);
    const queryState = world();
    queryState.world.year = 168;
    const querySnapshot = structuredClone(queryState);
    expect(answerKnownHistoricalEventQuestion('西元 168 年京師有什麼記事？', queryState)?.answer).toContain('京師雨水');
    expect(queryState).toEqual(querySnapshot);
    const old = createPhase4Model(167, 1, persons, 'phase4-scenario-229');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const sameYear = upgradePhase4Content(createPhase4Model(168, 1, persons, 'phase4-scenario-229'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 168 });
    expect(sameYear.eventLedger.some((item) => item.detail.includes('京師雨水'))).toBe(false);
  });
});

describe('168 年鮮卑、濊貊侵擾幽并二州記事', () => {
  it('A560 依十二月原文獨立記錄；v230 遷移保留前綴且同年不回補', () => {
    const id = 'xianbei-huimo-raid-you-bing-168';
    const fresh = advancePhase4(createPhase4Model(167, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('鮮卑、濊貊寇幽并二州'));
    expect(event?.source).toBe('《後漢書》卷八〈孝靈帝紀〉十二月鮮卑及濊貊寇幽并二州。');
    expect(HISTORY_CONTENT.find((item) => item.id === id)?.description).not.toMatch(/佔領|攻陷|傷亡/);
    const old = createPhase4Model(167, 1, persons, 'phase4-scenario-230');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const late = upgradePhase4Content(createPhase4Model(168, 1, persons, 'phase4-scenario-230'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 168 });
    expect(late.eventLedger.some((item) => item.detail.includes('鮮卑、濊貊寇幽并二州'))).toBe(false);
  });
});

describe('168 年冬十月日食與繫囚贖罪令', () => {
  it('A561 保留日食與贖令原文；v231 遷移保留前綴且同年不回補', () => {
    const id = 'eclipse-ransom-168';
    const fresh = advancePhase4(createPhase4Model(167, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('冬十月日食與繫囚贖罪令'));
    expect(event?.source).toBe('《後漢書》卷八〈孝靈帝紀〉冬十月甲辰晦日食，令天下繫囚罪未決入縑贖，各有差。');
    const old = createPhase4Model(167, 1, persons, 'phase4-scenario-231');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const late = upgradePhase4Content(createPhase4Model(168, 1, persons, 'phase4-scenario-231'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 168 });
    expect(late.eventLedger.some((item) => item.detail.includes('冬十月日食與繫囚贖罪令'))).toBe(false);
  });
});

describe('184 年黃巾戰事結果節點', () => {
  it('A482 補列廣宗與下曲陽戰事，舊存檔續玩可觸發且同年不回補', () => {
    const id = 'huangjin-campaign-outcome-184';
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(422);

    const fresh = advancePhase4(createPhase4Model(183, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('廣宗、下曲陽戰事與張角兄弟敗亡'));
    expect(event?.source).toContain('《後漢書》卷八');
    expect(event?.source).toContain('冬十月');
    expect(event?.source).toContain('十一月');
    expect(event?.source).toContain('卷七十一');
    expect(HISTORY_CONTENT.find((node) => node.id === id)?.description).toContain('不表示其他黃巾軍活動同年立即全部停止');

    const old = createPhase4Model(183, 1, persons, 'phase4-scenario-171');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const sameYear = upgradePhase4Content(createPhase4Model(184, 1, persons, 'phase4-scenario-171'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 184 });
    expect(sameYear.eventLedger.some((item) => item.detail.includes('廣宗、下曲陽戰事與張角兄弟敗亡'))).toBe(false);
    const late = upgradePhase4Content(createPhase4Model(185, 1, persons, 'phase4-scenario-171'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 184 });
    expect(late.eventLedger.some((item) => item.detail.includes('廣宗、下曲陽戰事與張角兄弟敗亡'))).toBe(false);
  });
});

describe('161 年羌人戰事記事', () => {
  it('A546 依《後漢書》卷七獨立記錄侵擾與擊破，遷移保留前綴且不回補', () => {
    const id = 'qiang-incursion-sanfu-161';
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(422);

    const fresh = advancePhase4(createPhase4Model(160, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('羌人侵擾三輔與並涼二州'));
    expect(event?.source).toContain('《後漢書》卷七');
    expect(event?.source).toContain('延熹四年');
    expect(event?.source).toContain('皇甫規擊破');
    expect(HISTORY_CONTENT.find((node) => node.id === id)?.description).toContain('不補戰場細節');

    const old = createPhase4Model(160, 1, persons, 'phase4-scenario-222');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    for (const year of [161, 162]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, persons, 'phase4-scenario-222'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 161 });
      expect(late.eventLedger.some((item) => item.detail.includes('羌人侵擾三輔與並涼二州'))).toBe(false);
    }
  });
});

describe('184 年南陽戰事節點', () => {
  it('A484 另列朱儁攻取宛城，舊存檔跨年可觸發且不回補', () => {
    const id = 'zhu-jun-captures-wancheng-184';
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(422);
    const fresh = advancePhase4(createPhase4Model(183, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('朱儁攻取宛城、孫夏敗亡'));
    expect(event?.source).toContain('《後漢書》卷八');
    expect(event?.source).toContain('癸巳');
    expect(event?.source).toContain('斬黃巾別帥孫夏');
    expect(event?.source).toContain('卷七十一');
    expect(HISTORY_CONTENT.find((node) => node.id === id)?.description).toContain('不把原文「癸巳」換算為未明載的月日');

    const old = createPhase4Model(183, 1, persons, 'phase4-scenario-172');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    for (const year of [184, 185]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, persons, 'phase4-scenario-172'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 184 });
      expect(late.eventLedger.some((item) => item.detail.includes('朱儁攻取宛城、孫夏敗亡'))).toBe(false);
    }
  });
});

describe('184 年長社戰局節點', () => {
  it('A485 另列皇甫嵩、朱儁及曹操擊破波才，保存漢曆月份但按年觸發', () => {
    const id = 'changshe-battle-184';
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(422);
    const fresh = advancePhase4(createPhase4Model(183, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('長社戰局轉折，漢軍擊破波才'));
    expect(event?.source).toContain('《後漢書》卷八');
    expect(event?.source).toContain('中平元年五月');
    expect(event?.source).toContain('卷七十一');
    expect(event?.source).toContain('曹操');
    expect(HISTORY_CONTENT.find((node) => node.id === id)?.sourceDateNote).toContain('不換算為原型月份或日序');

    const old = createPhase4Model(183, 1, persons, 'phase4-scenario-173');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    for (const year of [184, 185]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, persons, 'phase4-scenario-173'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 184 });
      expect(late.eventLedger.some((item) => item.detail.includes('長社戰局轉折，漢軍擊破波才'))).toBe(false);
    }
  });
});

describe('184 年南陽黃巾後續節點', () => {
  it('A486 另列秦頡擊斬張曼成，保存六月來源註記且遷移不回補', () => {
    const id = 'qin-jie-kills-zhang-mancheng-184';
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(422);
    const fresh = advancePhase4(createPhase4Model(183, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('秦頡擊斬張曼成'));
    expect(event?.source).toContain('《後漢書》卷八');
    expect(event?.source).toContain('六月');
    expect(event?.source).toContain('不推演後續南陽戰事');
    expect(HISTORY_CONTENT.find((node) => node.id === id)?.sourceDateNote).toContain('不換算為模型月日');

    const old = createPhase4Model(183, 1, persons, 'phase4-scenario-174');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    for (const year of [184, 185]) {
      const late = upgradePhase4Content(createPhase4Model(year, 1, persons, 'phase4-scenario-174'), PHASE4_CONTENT_VERSION);
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 184 });
      expect(late.eventLedger.some((item) => item.detail.includes('秦頡擊斬張曼成'))).toBe(false);
    }
  });
});

describe('188 年益州馬相起事節點', () => {
  it('按來源觸發，將 v85 舊存檔追加升級且不回補較晚年份', () => {
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(422);

    const fresh = advancePhase4(createPhase4Model(187, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('益州馬相起事、賈龍迎劉焉'));
    expect(event?.source).toContain('《資治通鑑》卷五十九');
    expect(event?.source).toContain('中平五年六月');
    expect(event?.source).toContain('《後漢書》卷七十五');
    expect(event?.source).toContain('攻取三郡');

    const old = createPhase4Model(187, 1, persons, 'phase4-scenario-85');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === eventId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(189, 1, persons, 'phase4-scenario-84'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === eventId)).toMatchObject({ status: 'resolved', resolvedYear: 188 });
    expect(late.eventLedger.some((item) => item.detail.includes('益州馬相起事、賈龍迎劉焉'))).toBe(false);
  });
});

describe('187 年長沙區星起事節點', () => {
  it('保留史料異名並按年觸發，遷移不補寫晚年存檔', () => {
    const eventId = 'changsha-ou-xing-revolt-187';
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(422);

    const fresh = advancePhase4(createPhase4Model(186, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('長沙區星起事、孫堅平定'));
    expect(event?.source).toContain('《資治通鑑》卷五十八');
    expect(event?.source).toContain('考異');
    expect(event?.source).toContain('觀鵠');
    expect(event?.source).toContain('《三國志》卷四十六');

    const old = createPhase4Model(186, 1, persons, 'phase4-scenario-85');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === eventId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(188, 1, persons, 'phase4-scenario-85'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === eventId)).toMatchObject({ status: 'resolved', resolvedYear: 187 });
    expect(late.eventLedger.some((item) => item.detail.includes('長沙區星起事、孫堅平定'))).toBe(false);
  });
});

describe('185–186 年涼州與江夏事件', () => {
  it('連續兩年事件依年觸發，v86 遷移保留事件前綴且不回補', () => {
    const meiyangId = 'liangzhou-meiyang-campaign-185';
    const zhaoCiId = 'zhao-ci-revolt-186';
    const fresh = advancePhase4(createPhase4Model(184, 1, persons, PHASE4_CONTENT_VERSION), 720);
    expect(fresh.nodes.find((node) => node.contentId === meiyangId)?.status).toBe('triggered');
    expect(fresh.nodes.find((node) => node.contentId === zhaoCiId)?.status).toBe('triggered');
    const meiyang = fresh.eventLedger.find((item) => item.detail.includes('張溫征涼州、美陽戰事'));
    expect(meiyang?.source).toContain('《資治通鑑》卷五十八');
    expect(meiyang?.source).toContain('孫堅');
    const zhaoCi = fresh.eventLedger.find((item) => item.detail.includes('江夏兵趙慈起事、王敏討平'));
    expect(zhaoCi?.source).toContain('殺南陽太守秦頡');
    expect(zhaoCi?.source).toContain('王敏');

    const old = createPhase4Model(184, 1, persons, 'phase4-scenario-86');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === meiyangId)?.status).toBe('pending');
    expect(upgraded.nodes.find((node) => node.contentId === zhaoCiId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === meiyangId)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(187, 1, persons, 'phase4-scenario-86'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === meiyangId)).toMatchObject({ status: 'resolved', resolvedYear: 185 });
    expect(late.nodes.find((node) => node.contentId === zhaoCiId)).toMatchObject({ status: 'resolved', resolvedYear: 186 });
    expect(late.eventLedger.some((item) => item.detail.includes('張溫征涼州、美陽戰事'))).toBe(false);
    expect(late.eventLedger.some((item) => item.detail.includes('江夏兵趙慈起事、王敏討平'))).toBe(false);
  });
});

describe('199 年孫權隨孫策征伐節點', () => {
  it('按《三國志》年級來源觸發，v104 遷移保留事件前綴且不回補', () => {
    const eventId = 'sun-quan-joins-sun-ce-expedition-199';
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(422);

    const fresh = advancePhase4(createPhase4Model(198, 1, persons, PHASE4_CONTENT_VERSION), 360);
    expect(fresh.nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');
    const event = fresh.eventLedger.find((item) => item.detail.includes('孫權隨孫策征劉勳、轉討黃祖'));
    expect(event?.source).toContain('《三國志》卷四十七');
    expect(event?.source).toContain('建安四年');
    expect(event?.source).toContain('征廬江太守劉勳');
    expect(event?.source).toContain('進討黃祖於沙羨');

    const old = createPhase4Model(198, 1, persons, 'phase4-scenario-104');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === eventId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded, 360).nodes.find((node) => node.contentId === eventId)?.status).toBe('triggered');

    const sameYear = upgradePhase4Content(createPhase4Model(199, 1, persons, 'phase4-scenario-104'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === eventId)).toMatchObject({ status: 'resolved', resolvedYear: 199 });
    const late = upgradePhase4Content(createPhase4Model(200, 1, persons, 'phase4-scenario-104'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === eventId)).toMatchObject({ status: 'resolved', resolvedYear: 199 });
    expect(late.eventLedger.some((item) => item.detail.includes('孫權隨孫策征劉勳、轉討黃祖'))).toBe(false);
  });
});
