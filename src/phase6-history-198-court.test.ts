import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=[
  'peimao-duanwei-campaign-against-li-jue-198','zhang-yang-assassinated-198',
] as const;
const persons:PersonRef[]=[];

describe('A728 補列 198 年建安三年記事',()=>{
  it('分列討李傕與張楊遇害記事，並補齊下邳節點的本紀來源',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries).toHaveLength(2);
    expect(entries.every(item=>item?.kind==='event'&&item.startYear===198&&item.endYear===198&&item.precision==='year'&&item.introducedRevision===351&&item.sourceDateNote)).toBe(true);
    expect(entries[0]?.source).toContain('夷三族');
    expect(entries[1]?.source).toContain('盜殺大司馬張楊');
    expect(entries[1]?.description).toContain('不補造姓名');
    const xiapi=HISTORY_CONTENT.find(item=>item.id==='lu-bu-xiapi-198');
    expect(xiapi?.source).toContain('《後漢書》卷九建安三年十二月癸酉');
    expect(HISTORY_CONTENT.filter(item=>item.id==='lu-bu-xiapi-198'&&!item.retired)).toHaveLength(1);
  });

  it('v350 舊模型升版保留事件帳前綴，跨年至 198 年可觸發新增記事',()=>{
    const legacy=createPhase4Model(197,1,persons,'phase4-scenario-350');
    const prefix=structuredClone(legacy.eventLedger);
    const upgraded=upgradePhase4Content(legacy,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,365);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(advanced.nodes.find(node=>node.contentId==='lu-bu-xiapi-198')?.status).toBe('triggered');
  });

  it('198 年或更晚的舊存檔升版不回補新增記事',()=>{
    for(const year of [198,199]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-350'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:198});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
