import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const ids=['zhu-jun-defeated-by-bocai-184','runnan-yellow-turbans-defeat-zhao-qian-184','jia-cong-suppresses-jiaozhi-mutiny-184'] as const;
const persons:PersonRef[]=[];

describe('A711 分列 184 年黃巾戰事與交阯屯兵記事',()=>{
  it('三項事件各自表述原典結果與限制，不混成單一戰線',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries.map(item=>item?.title)).toEqual(['朱儁先為波才所敗','汝南黃巾於邵陵擊敗太守趙謙','交阯屯兵拘執刺史、合浦太守，賈琮討平']);
    for(const entry of entries)expect(entry).toMatchObject({startYear:184,endYear:184,kind:'event',precision:'year',introducedRevision:334});
    expect(entries[0]?.source).toContain('朱儁為黃巾波才所敗');
    expect(entries[1]?.source).toContain('汝南黃巾敗太守趙謙於邵陵');
    expect(entries[2]?.source).toContain('遣交阯刺史賈琮討平之');
    expect(entries.every(entry=>entry?.sourceDateNote===undefined)).toBe(true);
    expect(entries[0]?.description).toContain('不與後續長社戰局合併');
  });

  it('v333 舊存檔保留事件帳；183 年續玩可觸發，184 年與晚年不回補',()=>{
    const old=createPhase4Model(183,1,persons,'phase4-scenario-333');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    for(const year of [184,185]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-333'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:184});
        const source=HISTORY_CONTENT.find(item=>item.id===id)!.source;
        expect(late.eventLedger.some(event=>event.type==='史實事件形成'&&event.source===source)).toBe(false);
      }
    }
  });

  it('v6 匯入升至 v334 後事件可重播且不改寫舊事件',()=>{
    const seed=711;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a711-v6-start',expectedRevision:0,type:'StartGame',name:'A711 存檔驗收',seed,facts:createOpeningFacts(seed,183,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A711 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-333'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A711 驗收存檔');
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.events[0]).toEqual(legacyEvent);
    expect(replay(imported.events)).toEqual(imported.state);
    const advanced=advancePhase4(imported.state.phase4!,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });
});
