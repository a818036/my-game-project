import { describe, expect, it } from 'vitest';
import { advancePhase4, createPhase4Model, HISTORY_CONTENT, HISTORY_SOURCE_DATE_NOTES, PHASE4_CONTENT_VERSION, upgradePhase4Content } from './phase4';

describe('A780 黃初六年遣使問疾苦並振貸記事',()=>{
  const id='wei-circulates-east-of-xuchang-relieves-poor-225';

  it('保留春二月及原文記載，不推測貸予對象、數量或成效',()=>{
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-416');
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:225,endYear:225,precision:'year',introducedRevision:401,kind:'event'});
    expect(node?.source).toContain('黃初六年春二月');
    expect(node?.source).toContain('遣使者循行許昌以東盡沛郡，問民所疾苦，貧者振貸之');
    expect(node?.description).toContain('不推演個別人物、貸予數量、地方成效');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('保留季節與月份');
  });

  it('v400 存檔保留事件帳前綴，續玩跨年至 225 年才觸發',()=>{
    const old=createPhase4Model(224,1,[],'phase4-scenario-400');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe('phase4-scenario-416');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.some(item=>item.detail.includes('問疾苦並振貸'))).toBe(false);

    const continued=advancePhase4(upgraded,360);
    expect(continued.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    expect(continued.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('問疾苦並振貸'))).toBe(true);
  });

  it('升版時已到或晚於 225 年的存檔不回補記事',()=>{
    for (const year of [225,226]) {
      const upgraded=upgradePhase4Content(createPhase4Model(year,1,[],'phase4-scenario-400'),PHASE4_CONTENT_VERSION);
      expect(upgraded.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:225});
      expect(upgraded.eventLedger.some(item=>item.detail.includes('問疾苦並振貸'))).toBe(false);
    }
  });
});
