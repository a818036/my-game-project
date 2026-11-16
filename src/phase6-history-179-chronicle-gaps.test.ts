import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,HISTORY_CONTENT,PHASE4_CONTENT_VERSION,upgradePhase4Content,type PersonRef} from './phase4';
import {applyEvent,createOpeningFacts,dispatch,ENGINE_VERSION} from './engine';
import {replay} from './engine';
import {toJson,verifySave} from './storage';

const persons:PersonRef[]=[];
const ids=[
  'jingzhao-earthquake-179',
  'solar-eclipse-guanghe-2-179',
  'wang-fu-duan-jiong-die-in-prison-179',
  'dongping-prince-duan-dies-179',
  'liu-kuan-appointed-taiwei-179',
  'zhang-xiu-dies-in-prison-179',
  'liu-he-chen-qiu-conspiracy-deaths-179',
  'yang-ci-appointed-situ-179',
  'hejian-prince-li-dies-179',
  'luoyang-infant-two-heads-four-arms-report-179',
] as const;

describe('A704 補列 179 年光和二年本紀記事',()=>{
  it('十項新增記事保留來源日期精度及史料未載界線',()=>{
    for(const id of ids){
      const content=HISTORY_CONTENT.find(item=>item.id===id);
      expect(content).toMatchObject({startYear:179,endYear:179,precision:'year',introducedRevision:327});
      expect(content?.source).toContain('《後漢書》卷八');
      expect(content?.sourceDateNote).toBeTruthy();
    }
    expect(HISTORY_CONTENT.find(item=>item.id===ids[0])?.description).toContain('不推測震央');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[5])?.source).toContain('注文');
    expect(HISTORY_CONTENT.find(item=>item.id===ids[9])?.description).toContain('不視為已驗證現象');
    expect(HISTORY_CONTENT.find(item=>item.id==='xianbei-raids-bingzhou-179')?.source).toContain('幽并二州');
  });

  it('v326 舊存檔可跨年至 179 年觸發新增記事，既有事件帳只追加範圍勘誤',()=>{
    const before=createPhase4Model(179,1,persons,'phase4-scenario-326');
    before.nodes.find(node=>node.contentId==='xianbei-raids-bingzhou-179')!.status='triggered';
    before.eventLedger.push({id:'legacy-xianbei-event',day:1,year:179,month:1,dayOfMonth:1,type:'史實事件形成',detail:'鮮卑寇并州',source:'《後漢書》卷八'});
    const prefix=structuredClone(before.eventLedger);
    const upgraded=upgradePhase4Content(before,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.eventLedger.some(event=>event.type==='史實資料勘誤'&&event.detail.includes('鮮卑寇幽并二州'))).toBe(true);
    expect(upgraded.nodes.find(node=>node.contentId==='xianbei-raids-bingzhou-179')?.evidence.join(' ')).toContain('幽、并二州');
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:179});
  });

  it('v326 的 178 年存檔升版後可續玩觸發，保留事件帳前綴且不重複勘誤',()=>{
    const old=createPhase4Model(178,1,persons,'phase4-scenario-326');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger).toEqual(prefix);
    for(const id of ids)expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    const continued=advancePhase4(upgraded,360);
    for(const id of ids){
      expect(continued.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
      expect(continued.eventLedger.find(event=>event.detail.includes(HISTORY_CONTENT.find(item=>item.id===id)!.title))?.source).toContain('《後漢書》卷八');
    }
    const repeated=upgradePhase4Content(upgraded,PHASE4_CONTENT_VERSION);
    expect(repeated.eventLedger).toEqual(upgraded.eventLedger);
    const late=upgradePhase4Content(createPhase4Model(180,1,persons,'phase4-scenario-326'),PHASE4_CONTENT_VERSION);
    for(const id of ids){
      expect(late.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:179});
      expect(late.eventLedger.some(event=>event.detail.includes(HISTORY_CONTENT.find(item=>item.id===id)!.title))).toBe(false);
    }
  });

  it('A704 舊 v6 JSON 載入後升至 v327，重播仍一致且新記事可續玩',()=>{
    const seed=704;
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a704-v6-start',expectedRevision:0,type:'StartGame',name:'A704 存檔驗收',seed,facts:createOpeningFacts(seed,178,{regions:[],surnames:[]})});
    if(!started.event||started.event.type!=='WorldCreated')throw new Error('無法建立 A704 v6 驗收存檔');
    const legacyEvent={...started.event,payload:{...started.event.payload,phase4ContentVersion:'phase4-scenario-326'}};
    const legacyState=applyEvent(null,legacyEvent);
    if(!legacyState)throw new Error('無法重播 A704 v6 驗收存檔');
    const legacy={format:'shenzhou-save' as const,version:6 as const,worldlineId:legacyState.worldlineId,events:[legacyEvent],state:legacyState};
    const imported=verifySave(toJson(legacy));
    const prefix=legacyState.phase4!.eventLedger;
    expect(imported.state.phase4?.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(imported.state.phase4?.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const id of ids)expect(imported.state.phase4?.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    expect(replay(imported.events)).toEqual(imported.state);
    const continued=advancePhase4(imported.state.phase4!,360);
    for(const id of ids)expect(continued.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
  });
});
