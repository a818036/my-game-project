import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const persons = [{ id: 'sample-person', name: '示例人物', alive: true, location: '郡府', office: '縣令' }];

describe('166、168 年東漢朝廷史實切片', () => {
  it('A375 依來源觸發兩個年級節點，並只追加遷移、不回補舊存檔', () => {
    const partisanId = 'partisan-frictions-emerge-166';
    const courtId = 'ling-emperor-accession-court-purge-168';
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(184);

    const fresh = advancePhase4(createPhase4Model(165, 1, persons, PHASE4_CONTENT_VERSION), 3 * 360);
    expect(fresh.nodes.find((node) => node.contentId === partisanId)?.status).toBe('triggered');
    expect(fresh.nodes.find((node) => node.contentId === courtId)?.status).toBe('triggered');
    const partisan = fresh.eventLedger.find((item) => item.detail.includes('桓帝朝廷朋黨議論漸起'));
    expect(partisan?.source).toContain('《資治通鑑》卷五十五');
    expect(partisan?.source).toContain('《後漢書》卷六十七');
    expect(partisan?.source).toContain('黨人之議自此始');
    const court = fresh.eventLedger.find((item) => item.detail.includes('靈帝即位與竇武、陳蕃遭誅'));
    expect(court?.source).toContain('《後漢書》卷八');
    expect(court?.source).toContain('曹節矯詔');
    expect(court?.source).toContain('不換算成模型月份');

    const old = createPhase4Model(165, 1, persons, 'phase4-scenario-143');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find((node) => node.contentId === partisanId)?.status).toBe('pending');
    expect(upgraded.nodes.find((node) => node.contentId === courtId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const continued = advancePhase4(upgraded, 3 * 360);
    expect(continued.nodes.find((node) => node.contentId === partisanId)?.status).toBe('triggered');
    expect(continued.nodes.find((node) => node.contentId === courtId)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(169, 1, persons, 'phase4-scenario-143'), PHASE4_CONTENT_VERSION);
    expect(late.nodes.find((node) => node.contentId === partisanId)).toMatchObject({ status: 'resolved', resolvedYear: 166 });
    expect(late.nodes.find((node) => node.contentId === courtId)).toMatchObject({ status: 'resolved', resolvedYear: 168 });
    expect(late.eventLedger.some((item) => item.detail.includes('桓帝朝廷朋黨議論漸起'))).toBe(false);
    expect(late.eventLedger.some((item) => item.detail.includes('靈帝即位與竇武、陳蕃遭誅'))).toBe(false);
  });
});

describe('169–178 年東漢政局、教育與邊防切片', () => {
  it('A376 按年觸發四筆有來源事件，v144 遷移保留舊事件帳且不回補', () => {
    const ids = [
      'partisan-purge-expands-169',
      'taixue-classics-stone-inscription-175',
      'han-campaign-against-xianbei-defeated-177',
      'jiaozhi-wuhuh-man-uprising-178',
    ];
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(184);

    const fresh = advancePhase4(createPhase4Model(168, 1, persons, PHASE4_CONTENT_VERSION), 10 * 360);
    for (const id of ids) expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const events = fresh.eventLedger.filter((item) => ids.some((id) => item.detail.includes(HISTORY_CONTENT.find((node) => node.id === id)!.title)));
    expect(events).toHaveLength(4);
    expect(events.find((item) => item.detail.includes('黨錮擴大'))?.source).toContain('死者百餘人');
    expect(events.find((item) => item.detail.includes('太學校正'))?.source).toContain('刻石立於太學門外');
    expect(events.find((item) => item.detail.includes('三路出塞'))?.source).toContain('晏等大敗');
    expect(events.find((item) => item.detail.includes('交阯烏滸民'))?.source).toContain('攻沒郡縣');

    const old = createPhase4Model(168, 1, persons, 'phase4-scenario-144');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    for (const id of ids) expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const continued = advancePhase4(upgraded, 10 * 360);
    for (const id of ids) expect(continued.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(179, 1, persons, 'phase4-scenario-144'), PHASE4_CONTENT_VERSION);
    for (const [id, year] of ids.map((id, index) => [id, [169, 175, 177, 178][index]!] as const)) {
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: year });
    }
    expect(late.eventLedger.filter((item) => ids.some((id) => item.detail.includes(HISTORY_CONTENT.find((node) => node.id === id)!.title)))).toHaveLength(0);
  });
});

describe('170–182 年東漢地方、朝廷與災異年表', () => {
  it('A377 新增十一筆來源節點；v145 遷移保留事件帳且不回補', () => {
    const ids = [
      'jinan-revolt-dongpingling-170',
      'ling-emperor-majority-pardon-171',
      'xusheng-yue-king-revolt-172',
      'epidemic-east-commandery-flood-173',
      'xusheng-revolt-suppressed-174',
      'yizhou-revolt-quelled-176',
      'cao-luan-executed-party-purge-176',
      'epidemic-party-ban-relief-179',
      'jiangxia-local-uprising-180',
      'xianbei-raids-you-bing-181',
      'epidemic-drought-182',
    ];
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(184);

    const fresh = (function(){ let model=createPhase4Model(169,1,persons,PHASE4_CONTENT_VERSION); for(let year=170;year<=182;year++) model=advancePhase4(model,360); return model; })();
    for (const id of ids) expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const newEvents = fresh.eventLedger.filter((item) => ids.some((id) => item.detail.includes(HISTORY_CONTENT.find((node) => node.id === id)!.title)));
    expect(newEvents).toHaveLength(ids.length);
    expect(newEvents.find((item) => item.detail.includes('靈帝加元服'))?.source).toContain('唯黨人不赦');
    expect(newEvents.find((item) => item.detail.includes('會稽許生'))?.source).toContain('臧旻');
    expect(newEvents.find((item) => item.detail.includes('疫與北海'))?.source).toContain('使者巡行致醫藥');
    expect(newEvents.find((item) => item.detail.includes('曹鸞'))?.source).toContain('門生故吏父兄子弟');
    expect(newEvents.find((item) => item.detail.includes('江夏地方'))?.source).toContain('江夏蠻叛');
    expect(newEvents.find((item) => item.detail.includes('大疫與旱災'))?.source).toContain('光和五年');

    const old = createPhase4Model(169, 1, persons, 'phase4-scenario-145');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    for (const id of ids) expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const continued = (function(){ let model=upgraded; for(let year=170;year<=182;year++) model=advancePhase4(model,360); return model; })();
    for (const id of ids) expect(continued.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const late = upgradePhase4Content(createPhase4Model(183, 1, persons, 'phase4-scenario-145'), PHASE4_CONTENT_VERSION);
    for (const [id, year] of ids.map((id, index) => [id, [170, 171, 172, 173, 174, 176, 176, 179, 180, 181, 182][index]!] as const)) {
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: year });
    }
    expect(late.eventLedger.filter((item) => ids.some((id) => item.detail.includes(HISTORY_CONTENT.find((node) => node.id === id)!.title)))).toHaveLength(0);

    const sameYear = upgradePhase4Content(createPhase4Model(176, 1, persons, 'phase4-scenario-145'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === 'yizhou-revolt-quelled-176')).toMatchObject({ status: 'resolved', resolvedYear: 176 });
    expect(sameYear.nodes.find((node) => node.contentId === 'cao-luan-executed-party-purge-176')).toMatchObject({ status: 'resolved', resolvedYear: 176 });
    expect(sameYear.eventLedger.some((item) => item.detail.includes('曹鸞訟黨人'))).toBe(false);
  });
});

describe('160–167 年桓帝朝廷與地方史事', () => {
  it('A378 補齊 160–165、167 年節點；v146 遷移保留事件帳且不回補', () => {
    const ids = [
      'changsha-wuling-revolts-160',
      'epidemic-and-disasters-161',
      'changsha-cangwu-revolt-162',
      'wuling-revolt-suppressed-163',
      'jingzhou-rebels-suppressed-164',
      'hu-lan-zhu-gai-revolt-165',
      'huan-emperor-death-party-ban-lifted-167',
    ];
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(184);
    const runTo167 = (start: ReturnType<typeof createPhase4Model>) => {
      let model = start;
      for (let year = 160; year <= 167; year++) model = advancePhase4(model, 360);
      return model;
    };

    const fresh = runTo167(createPhase4Model(159, 1, persons, PHASE4_CONTENT_VERSION));
    for (const id of ids) expect(fresh.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');
    const events = fresh.eventLedger.filter((item) => ids.some((id) => item.detail.includes(HISTORY_CONTENT.find((node) => node.id === id)!.title)));
    expect(events).toHaveLength(ids.length);
    expect(events.find((item) => item.detail.includes('長沙、武陵'))?.source).toContain('馮緄');
    expect(events.find((item) => item.detail.includes('京師大疫'))?.source).toContain('大疫');
    expect(events.find((item) => item.detail.includes('胡蘭、朱蓋'))?.source).toContain('大破並斬胡蘭、朱蓋');
    expect(events.find((item) => item.detail.includes('悉除黨錮'))?.source).toContain('帝崩於德陽前殿');

    const old = createPhase4Model(159, 1, persons, 'phase4-scenario-146');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    for (const id of ids) expect(upgraded.nodes.find((node) => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    const continued = runTo167(upgraded);
    for (const id of ids) expect(continued.nodes.find((node) => node.contentId === id)?.status).toBe('triggered');

    const sameYear = upgradePhase4Content(createPhase4Model(165, 1, persons, 'phase4-scenario-146'), PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find((node) => node.contentId === 'hu-lan-zhu-gai-revolt-165')).toMatchObject({ status: 'resolved', resolvedYear: 165 });
    expect(sameYear.eventLedger.some((item) => item.detail.includes('胡蘭、朱蓋'))).toBe(false);
    const late = upgradePhase4Content(createPhase4Model(168, 1, persons, 'phase4-scenario-146'), PHASE4_CONTENT_VERSION);
    for (const [id, year] of ids.map((id, index) => [id, [160, 161, 162, 163, 164, 165, 167][index]!] as const)) {
      expect(late.nodes.find((node) => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: year });
    }
    expect(late.eventLedger.some((item) => item.detail.includes('悉除黨錮'))).toBe(false);
  });
});
