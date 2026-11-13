import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const id='cao-consort-made-empress-215';
const persons:PersonRef[]=[];

describe('A745 補列 215 年建安二十年記事',()=>{
  it('記錄曹氏立后，並把《後漢書》漢中記事合併至既有戰局節點',()=>{
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(698);
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-431');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:215,endYear:215,precision:'year',introducedRevision:368,sourceDateNote:expect.stringContaining('春正月甲子')});
    expect(HISTORY_CONTENT.find(item=>item.id===id)?.source).toContain('立貴人曹氏為皇后');
    const hanzhong=HISTORY_CONTENT.find(item=>item.id==='han-zhong-campaign-215');
    expect(hanzhong?.source).toContain('秋七月曹操破漢中、張魯降');
    expect(hanzhong?.sourceDateNote).toContain('秋七月');
  });

  it('v367 舊存檔升至 v368 保留事件帳前綴並跨年至 215 年觸發',()=>{
    const prior=createPhase4Model(214,1,persons,'phase4-scenario-367');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,360);
    expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(advanced.nodes.find(node=>node.contentId==='han-zhong-campaign-215')?.status).toBe('triggered');
  });

  it('已到 215 年或更晚的存檔升版不回補新記事',()=>{
    for(const year of [215,216]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-367'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:215});
      expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
    }
  });
});
