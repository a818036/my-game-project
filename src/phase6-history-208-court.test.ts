import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['zhao-wen-dismissed-han-situ-208','cao-court-reorganization-208','kong-rong-executed-208','solar-eclipse-jianan-13-208'] as const;
const persons:PersonRef[]=[];

describe('A738 補列 208 年建安十三年記事',()=>{
  it('新增趙溫免職、官制更替、孔融遇害與日食，合併補述赤壁來源',()=>{
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(655);
    for(const id of ids){
      const content=HISTORY_CONTENT.find(item=>item.id===id);
      expect(content).toMatchObject({kind:'event',startYear:208,endYear:208,precision:'year',introducedRevision:361});
      expect(content?.sourceDateNote).toBeTruthy();
    }
    expect(HISTORY_CONTENT.find(item=>item.id===ids[0])?.source).toContain('春正月');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[1])?.source).toContain('癸巳，曹操自為丞相');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[2])?.source).toContain('夷其族');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[3])?.source).toContain('癸未朔');
    const redCliffs=HISTORY_CONTENT.find(item=>item.id==='red-cliffs-208');
    expect(redCliffs?.source).toContain('《後漢書》卷九');
    expect(redCliffs?.source).toContain('劉琮降曹');
    expect(redCliffs?.sourceDateNote).toContain('秋七月');
    expect(redCliffs?.sourceDateNote).toContain('冬十月');
  });

  it('v360 舊 v6 存檔升至 v361 保留事件帳前綴並可跨年觸發',()=>{
    const prior=createPhase4Model(207,1,persons,'phase4-scenario-360');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,'phase4-scenario-361');
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('已到 208 年與 209 年的存檔升版不補發新增記事',()=>{
    for(const year of [208,209]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-360'),'phase4-scenario-361');
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:208});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
