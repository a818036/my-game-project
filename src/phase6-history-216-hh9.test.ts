import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['han-eclipse-jianan-21-216','southern-xiongnu-chanyu-court-216','langya-prince-xi-killed-216'];
const persons:PersonRef[]=[];

describe('A746 補列 216 年建安二十一年記事',()=>{
  it('保留原典日食、南單于來朝與琅邪王熙遇害記事的日期精度',()=>{
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-376');
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(648);
    const eclipse=HISTORY_CONTENT.find(item=>item.id===ids[0]);
    expect(eclipse).toMatchObject({startYear:216,endYear:216,precision:'year',introducedRevision:369,sourceDateNote:expect.stringContaining('五月己亥朔')});
    expect(eclipse?.source).toContain('五月己亥朔記日食');
    const chanyu=HISTORY_CONTENT.find(item=>item.id===ids[1]);
    expect(chanyu).toMatchObject({startYear:216,endYear:216,precision:'year',introducedRevision:369,sourceDateNote:expect.stringContaining('秋七月')});
    expect(chanyu?.source).toContain('匈奴南單于來朝');
    const prince=HISTORY_CONTENT.find(item=>item.id===ids[2]);
    expect(prince).toMatchObject({startYear:216,endYear:216,precision:'year',introducedRevision:369,sourceDateNote:expect.stringContaining('是歲')});
    expect(prince?.source).toContain('琅邪王熙、國除');
    expect(prince?.source).toContain('謀欲渡江');
  });

  it('同一曹操進爵節點並列《三國志》與《後漢書》不同敘述',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id==='cao-crowned-king-of-wei-216');
    expect(HISTORY_CONTENT.filter(item=>item.id==='cao-crowned-king-of-wei-216')).toHaveLength(1);
    expect(node?.source).toContain('天子進公爵為魏王');
    expect(node?.source).toContain('夏四月甲午曹操自進號魏王');
    expect(node?.source).toContain('敘述不同，並列原文而不裁定');
  });

  it('v368 存檔升至 v369 保留事件帳前綴、跨年至 216 年可觸發',()=>{
    const prior=createPhase4Model(215,1,persons,'phase4-scenario-368');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('已到 216 年或更晚的存檔升版不回補新增記事',()=>{
    for(const year of [216,217]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-368'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:216});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
