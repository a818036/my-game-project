import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

describe('A779 黃初五年十一月戊申晦日日食',()=>{
  const id='wei-solar-eclipse-wushen-224';

  it('保留史料年月干支與晦日精度，不推測天文或政治影響',()=>{
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-411');
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:224,endYear:224,precision:'year',introducedRevision:400,kind:'event'});
    expect(node?.source).toContain('黃初五年十一月');
    expect(node?.source).toContain('戊申晦，日有食之');
    expect(node?.description).toContain('不推測現代日期、觀測範圍、天文成因或政治後果');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('保留漢曆月份、干支與晦日註記');
  });

  it('v399 存檔保留事件帳前綴，續玩跨年至 224 年才觸發',()=>{
    const old=createPhase4Model(223,1,[],'phase4-scenario-399');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe('phase4-scenario-411');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.some(item=>item.detail.includes('戊申晦日日食'))).toBe(false);

    const continued=advancePhase4(upgraded,360);
    expect(continued.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    expect(continued.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('戊申晦日日食'))).toBe(true);
  });

  it('升版時已到或晚於 224 年的存檔不回補記事',()=>{
    for (const year of [224,225]) {
      const upgraded=upgradePhase4Content(createPhase4Model(year,1,[],'phase4-scenario-399'),PHASE4_CONTENT_VERSION);
      expect(upgraded.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:224});
      expect(upgraded.eventLedger.some(item=>item.detail.includes('戊申晦日日食'))).toBe(false);
    }
  });
});
