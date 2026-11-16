import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['comet-dongjing-jianan-9-204','court-grants-gold-silk-recurring-204'] as const;
const persons:PersonRef[]=[];

describe('A734 補列 204 年建安九年記事',()=>{
  it('記錄星孛與朝廷賜金帛，不改寫玩家資源',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries.every(item=>item?.kind==='event'&&item.startYear===204&&item.endYear===204&&item.precision==='year'&&item.introducedRevision===357&&item.sourceDateNote)).toBe(true);
    expect(entries[0]?.source).toContain('星孛於東井');
    expect(entries[1]?.source).toContain('三年一賜');
    expect(entries[1]?.description).toContain('不套用至玩家金錢');
    const advanced=advancePhase4(createPhase4Model(203,1,persons,PHASE4_CONTENT_VERSION),360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('v356 舊存檔升版保留事件帳前綴並遵守不回補',()=>{
    const prior=createPhase4Model(203,1,persons,'phase4-scenario-356');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    for(const year of [204,205]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-356'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:204});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
