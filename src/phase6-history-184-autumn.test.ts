import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION,replay} from './engine';
import {toJson,verifySave} from './storage';

const ids=['dong-zhuo-fails-attack-zhang-jiao-184','zhang-xiu-ba-commander-revolt-184','henan-yin-xu-guan-dies-in-prison-184','huangfu-song-cangting-captures-yellow-turban-leader-184','huangfu-song-north-campaign-edict-184','anping-king-xu-executed-state-abolished-184'] as const;
const persons:PersonRef[]=[];

describe('A713 補列 184 年下半年戰事與政局記事',()=>{
  it('逐項保留原文、日期精度及不推演界線',()=>{
    const entries=ids.map(id=>HISTORY_CONTENT.find(item=>item.id===id));
    expect(entries.map(item=>item?.kind)).toEqual(['event','event','death','event','event','event']);
    expect(entries.every(item=>item?.startYear===184&&item.endYear===184&&item.precision==='year'&&item.introducedRevision===336)).toBe(true);
    expect(entries[0]?.source).toContain('董卓攻張角，不剋');
    expect(entries[1]?.source).toContain('巴郡妖巫張脩反，寇郡縣');
    expect(entries[2]?.source).toContain('河南尹徐灌下獄死');
    expect(entries[3]?.source).toContain('戰於倉亭，獲其帥');
    expect(entries[3]?.source).toContain('卜已');
    expect(entries[4]?.source).toContain('乙巳，詔皇甫嵩北討張角');
    expect(entries[5]?.source).toContain('安平王續有罪誅，國除');
    expect(entries[1]?.sourceDateNote).toContain('秋七月');
    expect(entries[2]?.sourceDateNote).toContain('秋七月');
    expect(entries[3]?.sourceDateNote).toContain('八月');
    expect(entries[4]?.sourceDateNote).toContain('乙巳');
    expect(entries[5]?.sourceDateNote).toContain('九月');
    expect(entries.every(item=>item?.description&&!/每日|時辰/.test(item.description))).toBe(true);
  });

  it('v335 舊存檔升版保留帳目、跨年觸發並避免同年或晚年回補',()=>{
    const old=createPhase4Model(183,1,persons,'phase4-scenario-335');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,360);
    for(const id of ids){
      const node=advanced.nodes.find(node=>node.contentId===id);
      expect(node?.status,id).toBe(id===ids[2]?'resolved':'triggered');
    }
    expect(advanced.eventLedger.some(event=>event.type==='死亡硬節點觸發'&&event.source===HISTORY_CONTENT.find(item=>item.id===ids[2])?.source)).toBe(true);
    for(const year of [184,185]){
      const late=upgradePhase4Content(createPhase4Model(year,1,persons,'phase4-scenario-335'),PHASE4_CONTENT_VERSION);
      for(const id of ids){
        expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:184});
        const source=HISTORY_CONTENT.find(item=>item.id===id)!.source;
        expect(late.eventLedger.some(event=>event.type==='史實事件形成'&&event.source===source)).toBe(false);
      }
    }
  });

  it('舊 v6 匯入後可升至 v336、續玩並重播',()=>{
    const seed=713;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a713-v6-start',expectedRevision:0,type:'StartGame',name:'A713 存檔驗收',seed,facts:createOpeningFacts(seed,183,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A713 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-335'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A713 驗收存檔');
    const imported=verifySave(toJson({format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState}));
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    const continued=advancePhase4(imported.state.phase4!,360);
    for(const id of ids){
      const node=continued.nodes.find(node=>node.contentId===id);
      expect(node?.status,id).toBe(id===ids[2]?'resolved':'triggered');
    }
    expect(replay(imported.events)).toEqual(imported.state);
  });
});
