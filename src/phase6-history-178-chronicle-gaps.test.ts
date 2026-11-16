import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';

const persons:PersonRef[]=[];
const ids=[
  'meng-yu-removed-taiwei-178',
  'yuan-pang-appointed-situ-february-eclipse-earthquake-178',
  'amnesty-and-era-change-guanghe-178',
  'lai-yan-appointed-sikong-april-earthquake-178',
  'guanghe-178-palace-omens-may-to-august',
  'lai-yan-dies-yuan-feng-appointed-sikong-178',
] as const;

describe('A703 補列 178 年光和元年本紀記事',()=>{
  it('六筆新增節點保留原典日期、記事次序與未載界線',()=>{
    for(const id of ids){
      const content=HISTORY_CONTENT.find(item=>item.id===id);
      expect(content).toMatchObject({startYear:178,endYear:178,precision:'year',introducedRevision:326});
      expect(content?.source).toContain('《後漢書》卷八');
      expect(content?.sourceDateNote).toBeTruthy();
    }
    expect(HISTORY_CONTENT.find(item=>item.id===ids[0])?.source).toContain('未另載罷職日期');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[1])?.description).toContain('因果關係');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[4])?.description).toContain('不推測現象真偽');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[5])?.description).toContain('未明言任命為接替來豔');
  });

  it('v325 舊存檔升至 v326 保留事件帳，177 年可續玩且 178 年後不回補',()=>{
    const old=createPhase4Model(177,1,persons,'phase4-scenario-325');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const continued=advancePhase4(upgraded,360);
    for(const id of ids)expect(continued.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    const late=upgradePhase4Content(createPhase4Model(179,1,persons,'phase4-scenario-325'),PHASE4_CONTENT_VERSION);
    for(const id of ids){
      expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:178});
      expect(late.eventLedger.some(event=>event.detail.includes(HISTORY_CONTENT.find(node=>node.id===id)!.title))).toBe(false);
    }
  });
});
