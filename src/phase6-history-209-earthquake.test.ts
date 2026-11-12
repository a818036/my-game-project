import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const id='jingzhou-earthquake-jianan-14-209';
const persons:PersonRef[]=[];

describe('A739 補列 209 年荊州地震記事',()=>{
  it('依原典記錄冬十月荊州地震，保持年級精度與災害推論界線',()=>{
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(674);
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-406');
    const content=HISTORY_CONTENT.find(item=>item.id===id);
    expect(content).toMatchObject({kind:'event',startYear:209,endYear:209,precision:'year',introducedRevision:362});
    expect(content?.source).toContain('建安十四年冬十月記荊州地震');
    expect(content?.sourceDateNote).toContain('冬十月');
    expect(content?.description).toContain('不推測震央、規模、損害或成因');
    expect(content?.description).toContain('不觸發虛構的居民傷亡');
  });

  it('v361 舊 v6 存檔升至 v362 保留事件帳前綴並可跨年觸發',()=>{
    const prior=createPhase4Model(208,1,persons,'phase4-scenario-361');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,'phase4-scenario-362');
    expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded,360).nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('已到 209 年與 210 年的存檔升版不回補新增記事',()=>{
    for(const year of [209,210]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-361'),'phase4-scenario-362');
      expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:209});
      expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
    }
  });
});

