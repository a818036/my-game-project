import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,type PersonRef,upgradePhase4Content} from './phase4';

const ids=['comet-chunwei-207','yellow-turbans-kill-jinan-prince-yun-207'] as const;
const persons:PersonRef[]=[];

describe('A737 補列 207 年建安十二年記事',()=>{
  it('補列星孛與濟南王遇害，並把袁氏兄弟記事月份併入既有節點',()=>{
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(682);
    for(const id of ids){
      const content=HISTORY_CONTENT.find(item=>item.id===id);
      expect(content).toMatchObject({kind:'event',startYear:207,endYear:207,precision:'year',introducedRevision:360});
      expect(content?.sourceDateNote).toBeTruthy();
    }
    const comet=HISTORY_CONTENT.find(item=>item.id===ids[0]);
    expect(comet?.source).toContain('冬十月辛卯');
    expect(comet?.description).toContain('不推測天體辨識');
    const prince=HISTORY_CONTENT.find(item=>item.id===ids[1]);
    expect(prince?.source).toContain('冬十月乙巳');
    expect(prince?.source).toContain('河閒孝王五代孫');
    const whiteWolf=HISTORY_CONTENT.find(item=>item.id==='white-wolf-mountain-207');
    expect(whiteWolf?.source).toContain('《後漢書》卷九');
    expect(whiteWolf?.source).toContain('冬十一月公孫康殺袁尚、袁熙');
    expect(whiteWolf?.sourceDateNote).toContain('秋八月');
    expect(whiteWolf?.sourceDateNote).toContain('冬十一月');
  });

  it('v359 舊 v6 存檔升至 v360 保留事件帳前綴並可跨年觸發',()=>{
    const prior=createPhase4Model(206,1,persons,'phase4-scenario-359');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,'phase4-scenario-360');
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });

  it('已到 207 年與 208 年的存檔升版不補發新增記事',()=>{
    for(const year of [207,208]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-359'),'phase4-scenario-360');
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:207});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
  });
});
