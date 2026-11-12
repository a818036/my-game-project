import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['hua-xin-appointed-yushi-dafu-217','comet-northeast-jianan-22-217'];
const persons:PersonRef[]=[];

describe('A747 補列 217 年建安二十二年記事',()=>{
  it('按來源精度登錄華歆任命與冬季東北方星孛，並合併同年疫癘來源',()=>{
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-406');
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(674);
    const hua=HISTORY_CONTENT.find(item=>item.id===ids[0]);
    expect(hua).toMatchObject({startYear:217,endYear:217,precision:'year',introducedRevision:370,sourceDateNote:expect.stringContaining('夏六月')});
    expect(hua?.source).toContain('華歆為御史大夫');
    const comet=HISTORY_CONTENT.find(item=>item.id===ids[1]);
    expect(comet).toMatchObject({startYear:217,endYear:217,precision:'year',introducedRevision:370,sourceDateNote:expect.stringContaining('冬')});
    expect(comet?.source).toContain('有星孛於東北');
    const epidemic=HISTORY_CONTENT.find(item=>item.id==='jianan-epidemic-217');
    expect(HISTORY_CONTENT.filter(item=>item.id==='jianan-epidemic-217')).toHaveLength(1);
    expect(epidemic?.source).toContain('去冬天降疫癘');
    expect(epidemic?.source).toContain('《後漢書》卷九');
  });

  it('v369 存檔升至 v370 保留事件帳前綴，跨年至 217 年觸發新增節點',()=>{
    const prior=createPhase4Model(216,1,persons,'phase4-scenario-369');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(node=>node.contentId==='jianan-epidemic-217')?.evidence.join(' ')).toContain('是歲大疫');
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('已到 217 年或更晚的存檔升版不回補新任命與天象記事',()=>{
    for(const year of [217,218]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-369'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:217});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
