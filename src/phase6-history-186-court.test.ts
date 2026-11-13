import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const ids=['eating-spouse-reports-186','taiwei-guo-xi-dismissed-wenren-xi-appointed-186','sikong-liu-xiao-dismissed-qiao-xuan-appointed-186','dong-chong-dies-in-prison-186','jinan-revolt-dongpingling-186'] as const;
const persons:PersonRef[]=[];

describe('A716 補列 186 年朝政、災異與地方記事',()=>{
  it('保留《後漢書》原文範圍、月份精度與一般事件分類',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries.map(item=>item?.kind)).toEqual(ids.map(()=> 'event'));
    expect(entries.every(item=>item?.startYear===186&&item.endYear===186&&item.precision==='year'&&item.introducedRevision===339)).toBe(true);
    expect(entries[0]?.source).toContain('河內人婦食夫，河南人夫食婦');
    expect(entries[1]?.source).toContain('夏四月');
    expect(entries[2]?.source).toContain('秋七月');
    expect(entries[2]?.source).toContain('八月');
    expect(entries[3]?.source).toContain('九月');
    expect(entries[4]?.source).toContain('冬');
    expect(entries.every(item=>item?.sourceDateNote&&!/每日|時辰/.test(item.sourceDateNote))).toBe(true);
  });

  it('v338 舊 v6 存檔升版保留前綴，跨年至 186 年觸發且可重播',()=>{
    const seed=716;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a716-v6-start',expectedRevision:0,type:'StartGame',name:'A716 存檔驗收',seed,facts:createOpeningFacts(seed,184,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A716 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-338'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A716 驗收存檔');
    const legacyPrefix=legacyState.phase4!.eventLedger;
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.state.phase4?.eventLedger.slice(0,legacyPrefix.length)).toEqual(legacyPrefix);
    for(const id of ids)expect(imported.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(imported.state.phase4!,720);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(replay(imported.events)).toEqual(imported.state);
  });

  it('186 年與晚年存檔不補發記事；董寵之死不形成玩家死亡硬節點',()=>{
    for(const year of [186,187]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-338'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:186});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
    const fresh=createPhase4Model(186,1,persons,PHASE4_CONTENT_VERSION);
    for(const id of ids){
      const source=HISTORY_CONTENT.find(item=>item.id===id)?.source;
      expect(fresh.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
      expect(fresh.eventLedger.some(event=>event.type==='史實事件形成'&&event.source===source)).toBe(true);
    }
    expect(fresh.eventLedger.some(event=>event.type==='死亡硬節點觸發'&&ids.some(id=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source))).toBe(false);
  });
});
