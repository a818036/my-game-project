import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=[
  'xingping-amnesty-era-change-194','emperor-coming-of-age-ceremony-194','empress-wang-posthumous-title-reburial-194',
  'emperor-plows-ancestral-field-194','changping-observatory-battle-194','yongzhou-created-from-western-liangzhou-194',
  'earthquakes-changping-194','eclipse-and-five-day-court-pause-194','locusts-194',
  'taiwei-zhu-jun-dismissal-yang-biao-appointment-194','drought-and-relief-measures-194','fengyi-qiang-revolt-defeated-194',
  'mulberry-fruit-famine-relief-194','situ-chunyu-jia-dismissed-194','chang-an-market-gate-collapse-194',
  'zhao-wen-appointed-situ-194','xinping-commandery-established-194','sun-ce-defeats-liu-yao-qu-e-194','ma-rifu-dies-shouchun-194',
] as const;
const persons:PersonRef[]=[];

describe('A724 補列 194 年興平元年記事',()=>{
  it('分列本紀記事並保留來源、日期及玩家狀態界線',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries).toHaveLength(19);
    expect(entries.every(item=>item?.kind==='event'&&item.startYear===194&&item.endYear===194&&item.precision==='year'&&item.introducedRevision===347&&item.sourceDateNote)).toBe(true);
    expect(entries.every(item=>item?.historicalPersonId===undefined)).toBe(true);
    expect(entries.find(item=>item?.id==='drought-and-relief-measures-194')?.description).toContain('不改動玩家資源');
    expect(entries.find(item=>item?.id==='ma-rifu-dies-shouchun-194')?.description).toContain('不推測死因');
    expect(HISTORY_CONTENT.filter(item=>item.id==='tao-qian-dies-liu-bei-leads-xuzhou-194')).toHaveLength(1);
    expect(HISTORY_CONTENT.filter(item=>item.id==='zhang-miao-revolt-yanzhou-194')).toHaveLength(1);
  });

  it('v346 舊模型升版保留事件帳前綴，跨年至 194 年可觸發新增記事',()=>{
    const legacy=createPhase4Model(193,1,persons,'phase4-scenario-346');
    const legacyPrefix=structuredClone(legacy.eventLedger);
    const upgraded=upgradePhase4Content(legacy,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,legacyPrefix.length)).toEqual(legacyPrefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,365);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('194 年或更晚的舊存檔升版不回補新增記事',()=>{
    for(const year of [194,195]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-346'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:194});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
