import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const ids=['huangfu-song-appointed-left-chariot-general-184','beigong-boyu-xianling-revolt-184','court-rations-and-stable-horses-issued-to-army-184','amnesty-and-zhongping-era-begins-184','xiapi-prince-yi-dies-without-heir-184','reports-of-unusual-plants-184'] as const;
const persons:PersonRef[]=[];

describe('A714 補列 184 年冬季及年末記事',()=>{
  it('逐項保留原典文字、來源日期粒度與一般事件分類',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries.map(item=>item?.kind)).toEqual(ids.map(()=> 'event'));
    expect(entries.every(item=>item?.startYear===184&&item.endYear===184&&item.precision==='year'&&item.introducedRevision===337)).toBe(true);
    expect(entries[0]?.source).toContain('以皇甫嵩為左車騎將軍');
    expect(entries[1]?.source).toContain('北宮伯玉與先零羌叛');
    expect(entries[1]?.source).toContain('攻殺護羌校尉伶徵、金城太守陳懿');
    expect(entries[2]?.source).toContain('廄馬非郊祭之用，悉出給軍');
    expect(entries[3]?.source).toContain('十二月己巳');
    expect(entries[4]?.source).toContain('下邳王意薨，無子，國除');
    expect(entries[5]?.source).toContain('郡國生異草');
    expect(entries.every(item=>item?.sourceDateNote&&!/每日|時辰/.test(item.sourceDateNote))).toBe(true);
  });

  it('v336 舊 v6 存檔升版保留事件帳，跨年後觸發新增節點並可重播',()=>{
    const seed=714;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a714-v6-start',expectedRevision:0,type:'StartGame',name:'A714 存檔驗收',seed,facts:createOpeningFacts(seed,183,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A714 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-336'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A714 驗收存檔');
    const legacyPrefix=legacyState.phase4!.eventLedger;
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.state.phase4?.eventLedger.slice(0,legacyPrefix.length)).toEqual(legacyPrefix);
    const upgraded=imported.state.phase4!;
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids)expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    expect(replay(imported.events)).toEqual(imported.state);
  });

  it('184 年及晚年存檔不回補；玩家新局依年級記錄史實、不形成死亡硬節點',()=>{
    for(const year of [184,185]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-336'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:184});
        expect(late.eventLedger.some(event=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(false);
      }
    }
    const fresh=createPhase4Model(184,1,persons,PHASE4_CONTENT_VERSION);
    for(const id of ids){
      expect(fresh.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
      expect(fresh.eventLedger.some(event=>event.type==='史實事件形成'&&event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source)).toBe(true);
    }
    expect(fresh.eventLedger.some(event=>event.type==='死亡硬節點觸發'&&ids.some(id=>event.source===HISTORY_CONTENT.find(item=>item.id===id)?.source))).toBe(false);
  });
});
