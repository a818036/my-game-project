import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['tong-pass-campaign-211','zhao-prince-she-dies-211'] as const;
const persons:PersonRef[]=[];

describe('A741 補列 211 年建安十六年記事',()=>{
  it('潼關節點補列秋九月來源，新增趙王赦去世年級記事',()=>{
    const battle=HISTORY_CONTENT.find(item=>item.id===ids[0]);
    expect(battle?.source).toContain('《後漢書》卷九補記秋九月');
    expect(battle?.sourceDateNote).toContain('秋九月');
    const prince=HISTORY_CONTENT.find(item=>item.id===ids[1]);
    expect(prince).toMatchObject({kind:'event',startYear:211,endYear:211,precision:'year',introducedRevision:364});
    expect(prince?.source).toContain('建安十六年「是歲」記趙王赦薨');
    expect(prince?.description).toContain('原文未標月份');
  });

  it('v363 舊 v6 存檔升至 v364 保留事件帳前綴並可跨年觸發',()=>{
    const prior=createPhase4Model(210,1,persons,'phase4-scenario-363');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,'phase4-scenario-364');
    expect(upgraded.nodes.find(node=>node.contentId===ids[1])?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    const advanced=advancePhase4(upgraded,360);
    expect(advanced.nodes.find(node=>node.contentId===ids[1])?.status).toBe('triggered');
  });

  it('已到 211 年與 212 年的存檔升版不回補新增記事',()=>{
    for(const year of [211,212]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-363'),'phase4-scenario-364');
      expect(late.nodes.find(node=>node.contentId===ids[1])).toMatchObject({status:'resolved',resolvedYear:211});
      expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===ids[1])?.source)).toBe(false);
    }
  });
});
