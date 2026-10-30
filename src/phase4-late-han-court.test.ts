import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const persons = [{ id: 'sample-person', name: '示例人物', alive: true, location: '郡府', office: '縣令' }];

describe('166、168 年東漢朝廷史實切片', () => {
  it('A375 依來源觸發兩個年級節點，並只追加遷移、不回補舊存檔', () => {
    const partisanId = 'partisan-frictions-emerge-166';
    const courtId = 'ling-emperor-accession-court-purge-168';
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(166);

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
    expect(HISTORY_CONTENT.filter((node) => node.kind === 'event' && !node.retired)).toHaveLength(166);

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
