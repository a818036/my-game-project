import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=[
  'dong-cheng-conspiracy-executed-200','nanyang-prince-feng-enfeoffed-200','nanyang-prince-feng-dies-200',
  'solar-eclipse-jianan-5-200','filial-recommendation-edict-jianan-5-200','comet-daliang-200','donghai-prince-zhi-dies-200',
] as const;
const persons:PersonRef[]=[];

describe('A730 補列 200 年建安五年記事',()=>{
  it('分列密詔事洩、封爵與死訊、日食詔令及星孛記事',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries).toHaveLength(7);
    expect(entries.every(item=>item?.kind==='event'&&item.startYear===200&&item.endYear===200&&item.precision==='year'&&item.introducedRevision===353&&item.sourceDateNote)).toBe(true);
    expect(entries[0]?.source).toContain('壬午');
    expect(entries[1]?.source).toContain('立皇子馮為南陽王');
    expect(entries[2]?.source).toContain('南陽王馮薨');
    expect(entries[3]?.source).toContain('庚午朔');
    expect(entries[4]?.source).toContain('上封事');
    expect(entries[5]?.description).toContain('不推算現代天文位置');
    expect(entries[6]?.source).toContain('東海王祗薨');
  });

  it('v352 舊模型升版保留事件帳前綴，跨年至 200 年可觸發新增記事',()=>{
    const legacy=createPhase4Model(199,1,persons,'phase4-scenario-352');
    const prefix=structuredClone(legacy.eventLedger);
    const upgraded=upgradePhase4Content(legacy,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,365);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('200 年或更晚的舊存檔升版不回補新增記事',()=>{
    for(const year of [200,201]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-352'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:200});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
