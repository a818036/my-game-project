import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content} from './phase4';

const id='era-name-changes-to-yankang-220';

describe('A751 補列 220 年三月改元延康',()=>{
  it('依《後漢書》卷九保留三月註記並按年級觸發',()=>{
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-427');
    expect(HISTORY_CONTENT.filter(item=>item.kind==='event'&&!item.retired)).toHaveLength(694);
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({
      startYear:220,
      endYear:220,
      precision:'year',
      introducedRevision:374,
      sourceDateNote:expect.stringContaining('三月'),
    });
    expect(HISTORY_CONTENT.find(item=>item.id===id)?.source).toContain('改元延康');
  });

  it('v373 舊存檔遷移保留事件帳前綴，219 年續玩可跨年至 220 年觸發',()=>{
    const prior=createPhase4Model(219,1,[],'phase4-scenario-373');
    const prefix=structuredClone(prior.eventLedger);
    const upgraded=upgradePhase4Content(prior,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,360);
    expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(advanced.eventLedger.filter(event=>event.type==='史實事件形成'&&event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toHaveLength(1);
  });

  it('已到 220 年或更晚的 v373 存檔升級不回補改元記事',()=>{
    for(const year of [220,221]){
      const upgraded=upgradePhase4Content(createPhase4Model(year,1,[],'phase4-scenario-373'),PHASE4_CONTENT_VERSION);
      expect(upgraded.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:220});
      expect(upgraded.eventLedger.some(event=>event.type==='史實事件形成'&&event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
    }
  });
});
