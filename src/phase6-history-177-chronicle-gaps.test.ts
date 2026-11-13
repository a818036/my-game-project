import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';

const persons:PersonRef[]=[];
const addedIds=[
  'amnesty-xiping-6-177',
  'xuling-filial-commendation-177',
  'xianbei-raids-three-frontiers-177',
  'chen-qiu-appointed-sikong-177',
  'xiping-6-autumn-eclipse-biyong-earthquake-ransom-177',
  'meng-yu-appointed-taiwei-chen-dan-sikong-177',
  'wang-min-dies-in-prison-177',
];

describe('A702 補列 177 年熹平六年本紀記事',()=>{
  it('依《後漢書》卷八收錄缺漏並保留原文精度與未載界線',()=>{
    for(const id of addedIds){
      const node=HISTORY_CONTENT.find(item=>item.id===id);
      expect(node).toMatchObject({startYear:177,endYear:177,precision:'year',introducedRevision:325});
      expect(node?.source).toContain('《後漢書》卷八');
    }
    expect(HISTORY_CONTENT.find(item=>item.id==='xuling-filial-commendation-177')?.source).toContain('數十人');
    expect(HISTORY_CONTENT.find(item=>item.id==='xiping-6-autumn-eclipse-biyong-earthquake-ransom-177')?.source).toContain('不推定彼此因果');
  });

  it('v324 舊內容升版保留事件帳，177 年可觸發，已過年份不回補',()=>{
    const old=createPhase4Model(176,1,persons,'phase4-scenario-324');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger).toEqual(prefix);
    for(const id of addedIds)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const continued=advancePhase4(upgraded,360);
    for(const id of addedIds)expect(continued.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    for(const id of addedIds)expect(continued.eventLedger.find(event=>event.detail.includes(HISTORY_CONTENT.find(node=>node.id===id)!.title))?.source).toContain('《後漢書》卷八');
    const late=upgradePhase4Content(createPhase4Model(178,1,persons,'phase4-scenario-324'),PHASE4_CONTENT_VERSION);
    for(const id of addedIds){
      expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:177});
      expect(late.eventLedger.some(event=>event.detail.includes(HISTORY_CONTENT.find(node=>node.id===id)!.title))).toBe(false);
    }
  });
});
