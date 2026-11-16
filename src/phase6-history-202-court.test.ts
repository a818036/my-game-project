import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['yutian-presents-tamed-elephant-202','yuexi-man-transformation-reported-202'] as const;
const persons:PersonRef[]=[];

describe('A732 補列 202 年建安七年記事',()=>{
  it('分列於窴獻馴象與越巂異聞，不補推後續',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries.every(item=>item?.kind==='event'&&item.startYear===202&&item.endYear===202&&item.precision==='year'&&item.introducedRevision===355&&item.sourceDateNote)).toBe(true);
    expect(entries[0]?.source).toContain('於窴國獻馴象');
    expect(entries[1]?.source).toContain('越巂男子化為女子');
    expect(entries[1]?.description).toContain('不推測個案身份');
    const advanced=advancePhase4(createPhase4Model(201,1,persons,PHASE4_CONTENT_VERSION),360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('v354 舊存檔升版保留事件帳前綴並遵守不回補',()=>{
    const prior=createPhase4Model(201,1,persons,'phase4-scenario-354');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    for(const year of [202,203]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-354'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:202});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
