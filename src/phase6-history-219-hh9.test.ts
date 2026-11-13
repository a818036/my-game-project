import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['solar-eclipse-jianan-24-219','liu-bei-takes-hanzhong-219','liu-bei-proclaims-hanzhong-king-219','han-river-flood-219'];
const persons:PersonRef[]=[];

describe('A749 補列 219 年建安二十四年記事',()=>{
  it('依原典記錄日食、取漢中、稱漢中王及漢水溢，保留日期精度',()=>{
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-410');
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(678);
    const expected=[
      ['solar-eclipse-jianan-24-219','春二月壬子晦','日有食之'],
      ['liu-bei-takes-hanzhong-219','夏五月','劉備取漢中'],
      ['liu-bei-proclaims-hanzhong-king-219','秋七月庚子','劉備自稱漢中王'],
      ['han-river-flood-219','八月','漢水溢'],
    ];
    for(const [id,date,detail]of expected){
      const item=HISTORY_CONTENT.find(node=>node.id===id);
      expect(item).toMatchObject({startYear:219,endYear:219,precision:'year',introducedRevision:372,sourceDateNote:expect.stringContaining(date)});
      expect(item?.source).toContain(detail);
    }
  });

  it('v371 的 218 年存檔升級後跨年至 219 年觸發新增記事',()=>{
    const prior=createPhase4Model(218,1,persons,'phase4-scenario-371');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('已觸發的荊州節點只追加一次《後漢書》來源，晚年存檔不回補 219 年記事',()=>{
    const prior=createPhase4Model(219,1,persons,'phase4-scenario-371');
    const advanced=advancePhase4(prior,360);
    const existing=advanced.nodes.find(node=>node.contentId==='guan-yu-falls-219');
    expect(existing?.status).toBe('triggered');
    const upgraded=upgradePhase4Content(advanced,PHASE4_CONTENT_VERSION);
    const supplemental=upgraded.eventLedger.filter(event=>event.type==='史實來源補充'&&event.detail.includes('建安二十四年《後漢書》卷九冬十一月'));
    expect(supplemental).toHaveLength(1);
    expect(upgraded.nodes.find(node=>node.contentId==='guan-yu-falls-219')?.evidence.filter(item=>item.includes('建安二十四年《後漢書》卷九冬十一月'))).toHaveLength(1);
    for(const id of ids){
      expect(upgraded.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:219});
      expect(upgraded.eventLedger.some(event=>event.type==='史實事件形成'&&event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
    }
    const repeated=upgradePhase4Content(upgraded,PHASE4_CONTENT_VERSION);
    expect(repeated.eventLedger).toEqual(upgraded.eventLedger);
  });
});
