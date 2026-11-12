import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['geng-ji-wei-huang-rebellion-218','comet-east-jianan-23-218'];
const persons:PersonRef[]=[];

describe('A748 補列 218 年建安二十三年記事',()=>{
  it('依原典登錄耿紀、韋晃起兵及三月東方星孛，保留日期精度',()=>{
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-404');
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(672);
    const rebellion=HISTORY_CONTENT.find(item=>item.id===ids[0]);
    expect(rebellion).toMatchObject({startYear:218,endYear:218,precision:'year',introducedRevision:371,sourceDateNote:expect.stringContaining('春正月甲子')});
    expect(rebellion?.source).toContain('春正月甲子');
    expect(rebellion?.source).toContain('少府耿紀、丞相司直韋晃起兵誅曹操');
    expect(rebellion?.source).toContain('不克，夷三族');
    const comet=HISTORY_CONTENT.find(item=>item.id===ids[1]);
    expect(comet).toMatchObject({startYear:218,endYear:218,precision:'year',introducedRevision:371,sourceDateNote:expect.stringContaining('三月')});
    expect(comet?.source).toContain('有星孛於東方');
  });

  it('v370 存檔升至 v371 保留事件帳前綴，跨年至 218 年觸發',()=>{
    const prior=createPhase4Model(217,1,persons,'phase4-scenario-370');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('已到 218 年或更晚的存檔升版不回補新記事',()=>{
    for(const year of [218,219]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-370'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:218});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
