import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content} from './phase4';

describe('A247 219 年荊州戰局來源補充',()=>{
  const id='guan-yu-falls-219';
  it('以同一個年級節點補列來源序列，舊存檔升級只追加註記並保留狀態與事件前綴',()=>{
    const content=HISTORY_CONTENT.find(item=>item.id===id)!;
    expect(content).toMatchObject({startYear:219,endYear:219,precision:'year'});
    expect(content.source).toContain('遣呂蒙襲公安');
    expect(content.source).toContain('南郡太守糜芳降');
    expect(content.source).toContain('陸遜取宜都');
    expect(content.source).toContain('十二月於臨沮被獲');
    expect(content.source).toContain('卷三十六');
    expect(content.sourceDateNote).toContain('閏月');
    expect(content.sourceDateNote).toContain('十二月');
    const before=advancePhase4(createPhase4Model(218,1,[],'phase4-scenario-131'),360);
    const first=before.eventLedger.filter(item=>item.type==='史實事件形成'&&item.detail.includes(content.title));
    expect(first).toHaveLength(1);
    expect(first[0].source).toContain('遣呂蒙襲公安');

    const oldPending=createPhase4Model(218,1,[],'phase4-scenario-131');
    const prefix=structuredClone(oldPending.eventLedger);
    const upgraded=upgradePhase4Content(oldPending,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.eventLedger.at(-1)).toMatchObject({type:'史實來源補充'});
    expect(upgraded.nodes.find(node=>node.contentId===id)).toMatchObject({status:'pending',evidence:[expect.stringContaining('史料補充')]});
    const continued=advancePhase4(upgraded,360);
    expect(continued.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(continued.eventLedger.filter(item=>item.type==='史實事件形成'&&item.detail.includes(content.title))).toHaveLength(1);

    const oldResolved=createPhase4Model(219,1,[],'phase4-scenario-131');
    const previous=oldResolved.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes(content.title))!;
    previous.source='舊存檔既有來源文字';
    const resolvedPrefix=structuredClone(oldResolved.eventLedger);
    const resolvedUpgrade=upgradePhase4Content(oldResolved,PHASE4_CONTENT_VERSION);
    expect(resolvedUpgrade.eventLedger.slice(0,resolvedPrefix.length)).toEqual(resolvedPrefix);
    expect(resolvedUpgrade.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(resolvedUpgrade.eventLedger.filter(item=>item.type==='史實事件形成'&&item.detail.includes(content.title))).toHaveLength(1);
    const repeated=upgradePhase4Content(resolvedUpgrade,PHASE4_CONTENT_VERSION);
    expect(repeated.eventLedger).toEqual(resolvedUpgrade.eventLedger);
  });
});
