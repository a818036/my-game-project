import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

const id = 'wei-cao-pi-appointments-and-office-regulations-220';
const detail = '魏廷任命三公並記官職員額與宦官限制';

describe('A796 補列延康元年二月三公任命與官職記事', () => {
  it('區分明繫壬戌的任命與同段未另繫日期的官制記事', () => {
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-420');
    const content = HISTORY_CONTENT.find(item => item.id === id)!;
    expect(content).toMatchObject({ startYear: 220, endYear: 220, precision: 'year', introducedRevision: 417 });
    expect(content.source).toContain('延康元年二月');
    expect(content.source).toContain('壬戌，以大中大夫賈詡為太尉');
    expect(content.source).toContain('御史大夫華歆為相國，大理王朗為御史大夫');
    expect(content.source).toContain('置散騎常侍、侍郎各四人');
    expect(content.source).toContain('其宦人為官者不得過諸署令');
    expect(content.source).toContain('為金策著令，藏之石室');
    expect(content.source).toContain('不把壬戌套用至未標日期的後項');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('未另繫日期');
  });

  it('新局由 219 年跨年至 220 年時結算一次', () => {
    const state = advancePhase4(createPhase4Model(219, 1, [], PHASE4_CONTENT_VERSION), 360);
    expect(state.year).toBe(220);
    expect(state.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(state.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);
  });

  it('v416 舊存檔保留事件帳前綴，跨年觸發且已到年份不回補', () => {
    const old = createPhase4Model(219, 1, [], 'phase4-scenario-416');
    const prefix = structuredClone(old.eventLedger);
    const upgraded = upgradePhase4Content(old, PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node => node.contentId === id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0, prefix.length)).toEqual(prefix);

    const advanced = advancePhase4(upgraded, 360);
    expect(advanced.nodes.find(node => node.contentId === id)?.status).toBe('triggered');
    expect(advanced.eventLedger.slice(0, prefix.length)).toEqual(prefix);
    expect(advanced.eventLedger.filter(event => event.detail.includes(detail))).toHaveLength(1);

    for (const year of [220, 221]) {
      const late = createPhase4Model(year, 1, [], 'phase4-scenario-416');
      const latePrefix = structuredClone(late.eventLedger);
      const lateUpgrade = upgradePhase4Content(late, PHASE4_CONTENT_VERSION);
      expect(lateUpgrade.nodes.find(node => node.contentId === id)).toMatchObject({ status: 'resolved', resolvedYear: 220 });
      expect(lateUpgrade.eventLedger.slice(0, latePrefix.length)).toEqual(latePrefix);
      expect(lateUpgrade.eventLedger.some(event => event.detail.includes(detail))).toBe(false);
    }
  });
});
