import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['zhang-yan-black-mountain-surrenders-205','court-grants-poor-officials-gold-silk-205'] as const;
const persons:PersonRef[]=[];

describe('A735 補列 205 年建安十年記事',()=>{
  it('記錄張燕歸降與朝廷賜百官金帛，不延伸未載結果',()=>{
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(677);
    for(const id of ids){
      const content=HISTORY_CONTENT.find(item=>item.id===id);
      expect(content).toMatchObject({kind:'event',startYear:205,endYear:205,precision:'year',introducedRevision:358});
      expect(content?.sourceDateNote).toBeTruthy();
    }
    const yuanTan=HISTORY_CONTENT.find(item=>item.id==='yuan-tan-defeat-205');
    expect(yuanTan?.source).toContain('《後漢書》卷九');
    expect(yuanTan?.source).toContain('兩來源的同一敗亡事件合併');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[0])?.description).toContain('不延伸為官職');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[1])?.description).toContain('不換算為玩家金錢');

    const advanced=advancePhase4(createPhase4Model(204,1,persons,PHASE4_CONTENT_VERSION),360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(advanced.eventLedger.filter(event=>event.type==='史實事件形成'&&event.detail.includes('袁譚敗亡與袁氏勢力轉折'))).toHaveLength(1);
  });

  it('v357 舊存檔升至 v358 保留事件帳前綴並不回補已過年份',()=>{
    const old=createPhase4Model(204,1,persons,'phase4-scenario-357');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node=>node.contentId===ids[0])?.status).toBe('pending');
    expect(upgraded.nodes.find(node=>node.contentId===ids[1])?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');

    for(const year of [205,206]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-357'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:205});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
