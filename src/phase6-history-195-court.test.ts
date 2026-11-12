import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=[
  'xingping-amnesty-li-jue-guo-si-conflict-195','li-jue-coerces-emperor-burns-palace-195','empress-fu-appointed-195',
  'guo-si-attacks-li-jue-emperor-moved-195','drought-195','li-jue-self-appointed-grand-marshal-195',
  'zhang-ji-reconciles-li-jue-guo-si-195','yuan-shao-defeats-gongsun-zan-baogou-195',
] as const;
const persons:PersonRef[]=[];

describe('A725 補列 195 年興平二年記事',()=>{
  it('按來源分列本紀紀年，並與既有車駕東歸節點區隔',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries).toHaveLength(8);
    expect(entries.every(item=>item?.kind==='event'&&item.startYear===195&&item.endYear===195&&item.precision==='year'&&item.introducedRevision===348&&item.sourceDateNote)).toBe(true);
    expect(entries.every(item=>item?.historicalPersonId===undefined)).toBe(true);
    expect(entries.find(item=>item?.id==='drought-195')?.description).toContain('不推測範圍');
    expect(entries.find(item=>item?.id==='yuan-shao-defeats-gongsun-zan-baogou-195')?.source).toContain('鮑丘');
    expect(HISTORY_CONTENT.filter(item=>item.id==='emperor-returns-east-195')).toHaveLength(1);
  });

  it('v347 舊模型升版保留事件帳前綴，跨年至 195 年可觸發新增記事',()=>{
    const legacy=createPhase4Model(194,1,persons,'phase4-scenario-347');
    const prefix=structuredClone(legacy.eventLedger);
    const upgraded=upgradePhase4Content(legacy,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,365);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('195 年或更晚的舊存檔升版不回補新增記事',()=>{
    for(const year of [195,196]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-347'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:195});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
