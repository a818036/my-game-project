import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=[
  'yuan-shao-captures-gongsun-zan-yijing-199','dong-cheng-appointed-chariot-general-199',
  'yuan-shu-dies-199','wuling-woman-revives-after-fourteen-days-199',
] as const;
const persons:PersonRef[]=[];

describe('A729 補列 199 年建安四年記事',()=>{
  it('分列易京記事、董承任官、袁術死訊與武陵異聞',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries).toHaveLength(4);
    expect(entries.every(item=>item?.kind==='event'&&item.startYear===199&&item.endYear===199&&item.precision==='year'&&item.introducedRevision===352&&item.sourceDateNote)).toBe(true);
    expect(entries[0]?.source).toContain('春三月');
    expect(entries[2]?.source).toContain('夏六月');
    expect(entries[3]?.description).toContain('不宣稱現象已驗證');
    expect(HISTORY_CONTENT.filter(item=>item.id==='yuan-shu-dies-199'&&!item.retired)).toHaveLength(1);
  });

  it('v351 舊模型升版保留事件帳前綴，跨年至 199 年可觸發新增記事',()=>{
    const legacy=createPhase4Model(198,1,persons,'phase4-scenario-351');
    const prefix=structuredClone(legacy.eventLedger);
    const upgraded=upgradePhase4Content(legacy,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,365);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('199 年或更晚的舊存檔升版不回補新增記事',()=>{
    for(const year of [199,200]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-351'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:199});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
