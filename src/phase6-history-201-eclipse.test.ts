import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const id='solar-eclipse-jianan-6-201';
const persons:PersonRef[]=[];

describe('A731 補列 201 年建安六年日食記事',()=>{
  it('按原典日期註記、遊戲年級觸發，且不推測天象影響',()=>{
    const entry=HISTORY_CONTENT.find(item=>item.id===id);
    expect(entry).toMatchObject({kind:'event',startYear:201,endYear:201,precision:'year',introducedRevision:354});
    expect(entry?.source).toContain('丁卯朔，日有食之');
    expect(entry?.description).toContain('不推算現代天文日期');
    const advanced=advancePhase4(createPhase4Model(200,1,persons,PHASE4_CONTENT_VERSION),360);
    expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('v353 舊存檔升版保留事件帳前綴並遵守不回補',()=>{
    const prior=createPhase4Model(200,1,persons,'phase4-scenario-353');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded,360).nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    for(const year of [201,202]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-353'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:201});
      expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
    }
  });
});
