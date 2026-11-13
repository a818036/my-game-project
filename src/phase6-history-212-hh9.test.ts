import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['ma-teng-executed-212','jianan-17-solar-eclipse-212','weishui-yingshui-flood-locusts-212','ma-chao-defeats-liangzhou-wei-kang-212','emperor-invests-four-princes-212','comet-five-feudal-lords-212'] as const;
const persons:PersonRef[]=[];

describe('A742 補列 212 年建安十七年記事',()=>{
  it('逐筆保留《後漢書》記事、日期精度與原文界線',()=>{
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(684);
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-417');
    expect(ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id))).toEqual([
      expect.objectContaining({startYear:212,endYear:212,precision:'year',introducedRevision:365,sourceDateNote:expect.stringContaining('夏五月')}),
      expect.objectContaining({startYear:212,endYear:212,precision:'year',introducedRevision:365,sourceDateNote:expect.stringContaining('六月庚寅晦')}),
      expect.objectContaining({startYear:212,endYear:212,precision:'year',introducedRevision:365,sourceDateNote:expect.stringContaining('秋七月')}),
      expect.objectContaining({startYear:212,endYear:212,precision:'year',introducedRevision:365,sourceDateNote:expect.stringContaining('秋八月')}),
      expect.objectContaining({startYear:212,endYear:212,precision:'year',introducedRevision:365,sourceDateNote:expect.stringContaining('秋九月庚戌')}),
      expect.objectContaining({startYear:212,endYear:212,precision:'year',introducedRevision:365,sourceDateNote:expect.stringContaining('冬十二月')}),
    ]);
    expect(HISTORY_CONTENT.find(item=>item.id===ids[4])?.source).toContain('熙為濟陰王、懿為山陽王、𨘷為濟北王、敦為東海王');
  });

  it('v364 舊 v6 存檔升至 v366 保留事件帳前綴並跨年至 212 年結算',()=>{
    const prior=createPhase4Model(211,1,persons,'phase4-scenario-364');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('已到 212 年或更晚的存檔升版不回補新記事',()=>{
    for(const year of [212,213]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-364'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        const item=HISTORY_CONTENT.find(node=>node.id===id)!;
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:212});
        expect(late.eventLedger.some(event=>event.source===item.source)).toBe(false);
      }
    }
  });
});
