import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const id='solar-eclipse-jianan-15-210';
const persons:PersonRef[]=[];

describe('A740 補列 210 年建安十五年日食記事',()=>{
  it('依原典記錄春二月乙巳朔日食，保留年級精度',()=>{
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(666);
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-397');
    const content=HISTORY_CONTENT.find(item=>item.id===id);
    expect(content).toMatchObject({kind:'event',startYear:210,endYear:210,precision:'year',introducedRevision:363});
    expect(content?.source).toContain('建安十五年春二月乙巳朔');
    expect(content?.sourceDateNote).toContain('乙巳朔');
    expect(content?.description).toContain('不推算現代日期、可見範圍、成因或政治意義');
  });

  it('v362 舊 v6 存檔升至 v363 保留事件帳前綴並可跨年觸發',()=>{
    const prior=createPhase4Model(209,1,persons,'phase4-scenario-362');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,'phase4-scenario-363');
    expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded,360).nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('已到 210 年與 211 年的存檔升版不回補新增記事',()=>{
    for(const year of [210,211]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-362'),'phase4-scenario-363');
      expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:210});
      expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
    }
  });
});
