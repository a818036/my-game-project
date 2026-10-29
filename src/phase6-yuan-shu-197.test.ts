import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,upgradePhase4Content,PHASE4_CONTENT_VERSION,HISTORY_CONTENT} from './phase4';

describe('A262 197 Yuan Shu source node',()=>{
  const id='yuan-shu-proclaims-zhong-jia-197';
  it('records only the year and preserves the source wording',()=>{
    const advanced=advancePhase4(createPhase4Model(196,1,[],PHASE4_CONTENT_VERSION),360);
    expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    const event=advanced.eventLedger.find(item=>item.detail.includes('袁術於壽春稱帝、自稱仲家'));
    expect(event?.year).toBe(197);
    expect(event?.source).toContain('《資治通鑑》卷六十二建安二年條');
    expect(event?.source).toContain('自稱仲家');
    expect(event?.source).toContain('不推定月份、日辰');
    expect(HISTORY_CONTENT.find(node=>node.id===id)?.precision).toBe('year');
  });

  it('migrates v134 saves without rewriting their event prefix or backfilling 197',()=>{
    const old=createPhase4Model(196,1,[],'phase4-scenario-134'),prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe('phase4-scenario-135');
    expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded,360).nodes.find(node=>node.contentId===id)?.status).toBe('triggered');

    const alreadyInYear=upgradePhase4Content(createPhase4Model(197,1,[],'phase4-scenario-134'),PHASE4_CONTENT_VERSION);
    expect(alreadyInYear.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:197});
    expect(alreadyInYear.eventLedger.some(item=>item.detail.includes('袁術於壽春稱帝、自稱仲家'))).toBe(false);
  });
});
