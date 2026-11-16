import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=[
  'jianan-amnesty-anyi-196','han-xian-attacks-dong-cheng-196','cao-cao-assumes-sili-command-196',
  'cao-cao-kills-tai-chong-feng-shuo-196','yang-biao-zhang-xi-dismissed-196','cao-cao-appointed-sikong-196',
] as const;
const persons:PersonRef[]=[];

describe('A726 補列 196 年建安元年記事',()=>{
  it('分列本紀未納入既有遷都節點的朝廷記事',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries).toHaveLength(6);
    expect(entries.every(item=>item?.kind==='event'&&item.startYear===196&&item.endYear===196&&item.precision==='year'&&item.introducedRevision===349&&item.sourceDateNote)).toBe(true);
    expect(entries.every(item=>item?.historicalPersonId===undefined)).toBe(true);
    expect(entries.find(item=>item?.id==='cao-cao-kills-tai-chong-feng-shuo-196')?.description).toContain('不推測案情');
    expect(HISTORY_CONTENT.filter(item=>item.id==='emperor-relocates-xu-196')).toHaveLength(1);
  });

  it('v348 舊模型升版保留事件帳前綴，跨年至 196 年可觸發新增記事',()=>{
    const legacy=createPhase4Model(195,1,persons,'phase4-scenario-348');
    const prefix=structuredClone(legacy.eventLedger);
    const upgraded=upgradePhase4Content(legacy,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,365);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('196 年或更晚的舊存檔升版不回補新增記事',()=>{
    for(const year of [196,197]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-348'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:196});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
