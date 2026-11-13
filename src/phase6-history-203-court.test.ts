import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['court-welcomes-winter-northern-suburb-203','court-establishes-sizhi-203'] as const;
const persons:PersonRef[]=[];

describe('A733 補列 203 年建安八年朝廷記事',()=>{
  it('分列迎冬禮儀與司直官設置，保留原文界線',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries.every(item=>item?.kind==='event'&&item.startYear===203&&item.endYear===203&&item.precision==='year'&&item.introducedRevision===356&&item.sourceDateNote)).toBe(true);
    expect(entries[0]?.source).toContain('公卿初迎冬於北郊');
    expect(entries[0]?.source).toContain('八佾舞');
    expect(entries[1]?.source).toContain('初置司直官，督中都官');
    const advanced=advancePhase4(createPhase4Model(202,1,persons,PHASE4_CONTENT_VERSION),360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('v355 舊存檔升版保留事件帳前綴並遵守不回補',()=>{
    const prior=createPhase4Model(202,1,persons,'phase4-scenario-355');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    for(const year of [203,204]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-355'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:203});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
