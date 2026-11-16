import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=[
  'yuan-shao-assumes-grand-general-197','locusts-197','han-river-flood-197',
  'jianghuai-famine-197','yuan-shu-kills-chen-prince-chong-197','sun-ce-envoy-pays-tribute-197',
] as const;
const persons:PersonRef[]=[];

describe('A727 補列 197 年建安二年記事',()=>{
  it('分列本紀記事，並避免重複結算袁術稱帝異繫年',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries).toHaveLength(6);
    expect(entries.every(item=>item?.kind==='event'&&item.startYear===197&&item.endYear===197&&item.precision==='year'&&item.introducedRevision===350&&item.sourceDateNote)).toBe(true);
    expect(entries.every(item=>item?.historicalPersonId===undefined)).toBe(true);
    expect(entries.find(item=>item?.id==='jianghuai-famine-197')?.description).toContain('不改變玩家糧食或人口');
    expect(HISTORY_CONTENT.filter(item=>item.id==='yuan-shu-proclaims-emperor-195'&&!item.retired)).toHaveLength(1);
  });

  it('v349 舊模型升版保留事件帳前綴，跨年至 197 年可觸發新增記事',()=>{
    const legacy=createPhase4Model(196,1,persons,'phase4-scenario-349');
    const prefix=structuredClone(legacy.eventLedger);
    const upgraded=upgradePhase4Content(legacy,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,365);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('197 年或更晚的舊存檔升版不回補新增記事',()=>{
    for(const year of [197,198]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-349'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:197});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
