import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['restores-nine-provinces-213','heavy-rain-and-flood-213','zhao-prince-gui-moved-to-boling-213','three-stars-enter-taiwei-213','pengcheng-prince-he-dies-213'] as const;
const persons:PersonRef[]=[];

describe('A743 補列 213 年建安十八年記事',()=>{
  it('逐筆保留《後漢書》記事、日期精度與不推測界線',()=>{
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(647);
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-373');
    expect(ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id))).toEqual([
      expect.objectContaining({startYear:213,endYear:213,precision:'year',introducedRevision:366,sourceDateNote:expect.stringContaining('春正月庚寅')}),
      expect.objectContaining({startYear:213,endYear:213,precision:'year',introducedRevision:366,sourceDateNote:expect.stringContaining('夏五月')}),
      expect.objectContaining({startYear:213,endYear:213,precision:'year',introducedRevision:366,sourceDateNote:expect.stringContaining('夏五月')}),
      expect.objectContaining({startYear:213,endYear:213,precision:'year',introducedRevision:366,sourceDateNote:expect.stringContaining('是歲')}),
      expect.objectContaining({startYear:213,endYear:213,precision:'year',introducedRevision:366,sourceDateNote:expect.stringContaining('是歲')}),
    ]);
    expect(HISTORY_CONTENT.find(item=>item.id===ids[0])?.source).toContain('復禹貢九州');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[1])?.source).toContain('大雨水');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[2])?.source).toContain('徙趙王珪為博陵王');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[3])?.source).toContain('歲星、鎮星、熒惑俱入太微');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[4])?.source).toContain('彭城王和薨');
  });

  it('v365 舊 v6 存檔升至 v366 保留事件帳前綴並跨年至 213 年結算',()=>{
    const prior=createPhase4Model(212,1,persons,'phase4-scenario-365');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('已到 213 年或更晚的存檔升版不回補新記事',()=>{
    for(const year of [213,214]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-365'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        const item=HISTORY_CONTENT.find(node=>node.id===id)!;
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:213});
        expect(late.eventLedger.some(event=>event.source===item.source)).toBe(false);
      }
    }
  });
});