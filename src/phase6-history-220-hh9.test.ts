import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content} from './phase4';

const id='solar-eclipse-jianan-25-220';

describe('A750 補列 220 年建安二十五年日食',()=>{
  it('依《後漢書》卷九記二月丁未朔日食並保留年級精度',()=>{
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-383');
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(653);
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({
      startYear:220,
      endYear:220,
      precision:'year',
      introducedRevision:373,
      sourceDateNote:expect.stringContaining('二月丁未朔'),
    });
    expect(HISTORY_CONTENT.find(item=>item.id===id)?.source).toContain('日有食之');
  });

  it('v372 的 219 年存檔升版後保留事件帳前綴並跨年至 220 年觸發',()=>{
    const prior=createPhase4Model(219,1,[],'phase4-scenario-372');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,360);
    expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(advanced.eventLedger.filter(event=>event.type==='史實事件形成'&&event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toHaveLength(1);
  });

  it('已到 220 年或更晚的存檔升版不回補日食事件',()=>{
    for(const year of [220,221]){
      const upgraded=upgradePhase4Content(createPhase4Model(year,1,[],'phase4-scenario-372'),PHASE4_CONTENT_VERSION);
      expect(upgraded.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:220});
      expect(upgraded.eventLedger.some(event=>event.type==='史實事件形成'&&event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
    }
  });
});
