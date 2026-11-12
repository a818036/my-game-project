import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['drought-and-rainwater-214','xiahou-yuan-captures-song-jian-214','empress-fu-killed-214'] as const;
const persons:PersonRef[]=[];

describe('A744 補列 214 年建安十九年記事',()=>{
  it('保留《後漢書》原文、年級精度與日期界線，並沿用益州戰局節點',()=>{
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(655);
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-386');
    expect(ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id))).toEqual([
      expect.objectContaining({startYear:214,endYear:214,precision:'year',introducedRevision:367,sourceDateNote:expect.stringContaining('夏四月')}),
      expect.objectContaining({startYear:214,endYear:214,precision:'year',introducedRevision:367,sourceDateNote:expect.stringContaining('冬十月')}),
      expect.objectContaining({startYear:214,endYear:214,precision:'year',introducedRevision:367,sourceDateNote:expect.stringContaining('十一月丁卯')}),
    ]);
    expect(HISTORY_CONTENT.find(item=>item.id===ids[0])?.source).toContain('五月記「雨水」');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[1])?.source).toContain('討宋建於枹罕，獲之');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[2])?.source).toContain('滅其族及二皇子');
    expect(HISTORY_CONTENT.find(item=>item.id==='yi-province-surrender-214')?.source).toContain('《後漢書》卷九');
  });

  it('v366 舊 v6 存檔升至 v367 保留事件帳前綴並跨年至 214 年結算',()=>{
    const prior=createPhase4Model(213,1,persons,'phase4-scenario-366');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(advanced.nodes.find(node=>node.contentId==='yi-province-surrender-214')?.status).toBe('triggered');
  });

  it('已到 214 年或更晚的存檔升版不回補新記事',()=>{
    for(const year of [214,215]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-366'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        const item=HISTORY_CONTENT.find(node=>node.id===id)!;
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:214});
        expect(late.eventLedger.some(event=>event.source===item.source)).toBe(false);
      }
    }
  });
});
