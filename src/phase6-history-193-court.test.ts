import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=[
  'han-eclipse-chuping-4-193','han-amnesty-chuping-4-193','yuan-shu-kills-chen-wen-seizes-huainan-193',
  'chang-an-xuanping-gate-collapse-193','unclouded-thunder-193-may','fufeng-wind-hail-193','huashan-collapse-193',
  'zhou-zhong-dismissed-zhu-jun-taiwei-193','que-xuan-claims-emperor-193','rainwater-record-193',
  'prison-review-light-detainees-193','heavenly-dog-northwest-193','imperial-taixue-ceremony-193',
  'luoyang-earthquake-october-193','comet-tiangeshi-193','yang-biao-dismissed-zhao-wen-sikong-193',
  'earthquake-december-193','zhao-wen-dismissed-zhang-xi-sikong-193','langya-prince-rong-dies-193',
] as const;
const persons:PersonRef[]=[];

describe('A723 補列 193 年初平四年記事',()=>{
  it('分列本紀年內記事並保留原文精度及重複事件界線',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries).toHaveLength(19);
    expect(entries.every(item=>item?.kind==='event'&&item.startYear===193&&item.endYear===193&&item.precision==='year'&&item.introducedRevision===346&&item.sourceDateNote)).toBe(true);
    expect(entries.every(item=>item?.historicalPersonId===undefined)).toBe(true);
    expect(entries.find(item=>item?.id==='yuan-shu-kills-chen-wen-seizes-huainan-193')?.source).toContain('袁術殺揚州刺史陳溫、據淮南');
    expect(entries.find(item=>item?.id==='rainwater-record-193')?.description).toContain('不推定其含義');
    expect(HISTORY_CONTENT.filter(item=>item.id==='liu-yu-defeated-and-killed-193')).toHaveLength(1);
    expect(HISTORY_CONTENT.filter(item=>item.id==='cao-invades-xuzhou-193')).toHaveLength(1);
  });

  it('v345 舊模型升版保留事件帳前綴，跨年至 193 年可觸發新增記事',()=>{
    const legacy=createPhase4Model(192,1,persons,'phase4-scenario-345');
    const legacyPrefix=structuredClone(legacy.eventLedger);
    const upgraded=upgradePhase4Content(legacy,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,legacyPrefix.length)).toEqual(legacyPrefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,365);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('193 年或更晚的舊存檔升版不回補新增記事',()=>{
    for(const year of [193,194]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-345'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:193});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
