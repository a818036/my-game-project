import {describe,it,expect} from 'vitest';
import {createOpeningFacts,dispatch,ENGINE_VERSION,replay,type GameCommand,type GameEvent} from './engine';
import {answerKnownSunQuanBiographyQuestion,inspectLifePlan,lifeChoices,localInteraction} from './life';
import {toJson,parseSave,migrateSaveFile} from './storage';
function start(){const facts=createOpeningFacts(81,184,{regions:[],surnames:[]});return dispatch(null,{version:ENGINE_VERSION,type:'StartGame',name:'測試',seed:81,facts,commandId:'life-start',expectedRevision:0});}
describe('人生情境計畫',()=>{
  it('嬰兒沒有成人選項；成年有不同選項；偽造成人 ID 被引擎拒絕',()=>{
    const state=start().state!;expect(lifeChoices(state).map(c=>c.id)).toEqual(['observe','listen','reflect','rest']);
    expect(lifeChoices({...state,world:{...state.world,year:state.character.birthYear+15}}).map(c=>c.id)).toContain('adult-trade');
    expect(()=>dispatch(state,{version:5,type:'SubmitLifePlan',worldlineId:state.worldlineId,expectedRevision:state.revision,commandId:'bad',choiceIds:['adult-trade'],supplement:''})).toThrow('情境');
    expect(inspectLifePlan(state,['observe','observe']).errors).not.toEqual([]);
  });
  it('四項複選一次結算，時間可追溯，無收入、外出、代辦、成熟五維或虛構訪客',()=>{
    const state=start().state!,before=structuredClone(state);
    const command:GameCommand={version:5,type:'SubmitLifePlan',worldlineId:state.worldlineId,expectedRevision:state.revision,commandId:'four',choiceIds:['observe','listen','reflect','rest'],supplement:'我想慢慢觀察'};
    const {state:next,event}=dispatch(state,command);expect(next!.turn).toBe(1);expect(next!.phase4!.day-state.phase4!.day).toBe(4);
    expect(next!.character.money).toBe(state.character.money);expect(next!.accounts).toEqual(state.accounts);expect(next!.ledger).toEqual(state.ledger);
    expect(next!.phase2!.scene.location).toBe(state.phase2!.scene.location);expect(next!.phase2!.scene.enteredIds).toEqual([]);expect(next!.phase2!.scene.speeches).toEqual([]);
    expect(next!.phase2!.stats).toBeNull();expect(next!.character.growth.study).toBe(2);expect(next!.backend.historyChecks).toBe(1);
    expect(state).toEqual(before);expect(event!.type).toBe('LifePlanResolved');expect(dispatch(next!,command).duplicate).toBe(true);
    expect(()=>dispatch(next!,{...command,choiceIds:['rest']})).toThrow('commandId');
    expect(()=>dispatch(next!,{...command,commandId:'stale'})).toThrow('版本');
  });
  it('保留舊事件前綴，新增情境事件可重播及匯出再載入，第五回合有摘要',()=>{
    const initial=start(),events:GameEvent[]=[initial.event!];let state=initial.state!;
    const legacy=dispatch(state,{version:5,type:'SubmitActionPlan',worldlineId:state.worldlineId,expectedRevision:state.revision,commandId:'old',intents:['耕讀自持'],supplement:''});state=legacy.state!;events.push(legacy.event!);
    const prefix=JSON.stringify(events);
    for(let i=0;i<4;i++){const next=dispatch(state,{version:5,type:'SubmitLifePlan',worldlineId:state.worldlineId,expectedRevision:state.revision,commandId:`life-${i}`,choiceIds:['rest'],supplement:''});state=next.state!;events.push(next.event!);}
    expect(JSON.stringify(events.slice(0,2))).toBe(prefix);expect(replay(events)).toEqual(state);expect(state.summaries.at(-1)?.turn).toBe(5);
    expect(migrateSaveFile(parseSave(toJson({format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events,state}))).state).toEqual(state);
  });
  it('詢問、質疑、對話、否定與混合句均不產生行動，不修改狀態',()=>{
    const state=start().state!,before=structuredClone(state);
    for(const text of ['我才幾歲就叫我經商？','我能做什麼？','對母親說你好','我幾歲？然後再去經商','不要觀察眼前']){const r=localInteraction(text,state);expect(r.kind).not.toBe('action');expect(r.choiceIds).toEqual([]);}
    expect(localInteraction('對父親說：不要擔心',state).kind).toBe('dialogue');
    expect(localInteraction('我要觀察眼前',state).choiceIds).toEqual(['observe']);expect(state).toEqual(before);
  });
  it('孫權生平問題保留史料精度；無來源的日常時辰明確回答未記載',()=>{
    const appointed=answerKnownSunQuanBiographyQuestion('孫權幾歲任陽羨長？');
    expect(appointed?.answer).toContain('年十五');expect(appointed?.answer).toContain('沒有在此處給出確切公元年份');
    const died=answerKnownSunQuanBiographyQuestion('孫權幾歲去世？');expect(died?.answer).toContain('時年七十一');
    const routine=answerKnownSunQuanBiographyQuestion('孫權每天幾時小便出恭？');expect(routine?.answer).toContain('不是逐日生活日誌');expect(routine?.answer).toContain('我不能用模擬補造');
    expect(localInteraction('孫權每天幾時小便出恭？',start().state!).kind).toBe('question');
  });
  it('孫權日常作息的不同問法都走本機史料界線回答，不交模型猜測',()=>{
    for(const text of ['孫權平時作息如何？','孫權平常的生活習慣是什麼？','孫權每天幾點上廁所？']){
      const result=localInteraction(text,start().state!);
      expect(result.kind).toBe('question');
      expect(result.answer).toContain('不是逐日生活日誌');
      expect(result.answer).toContain('我不能用模擬補造時辰或行程');
      expect(result.source).toContain('日常細節未記載');
    }
  });
  it('孫權一生問題整理現有來源節點，不把空白年份或日常作息編成史實',()=>{
    const biography=answerKnownSunQuanBiographyQuestion('請整理孫權七十一年生平年表');
    expect(biography?.kind).toBe('question');
    expect(biography?.answer).toContain('孫權約 182 年至 252 年（享年七十一）');
    expect(biography?.answer).toContain('年十五時任陽羨長');
    expect(biography?.answer).toContain('未給出可換算的確切公元年份');
    expect(biography?.answer).toContain('孫權隨孫策征劉勳');
    expect(biography?.answer).toContain('孫權之弟、丹楊太守翊遇害');
    expect(biography?.answer).toContain('孫權遣賀齊討上饒');
    expect(biography?.answer).toContain('孫權分置鄱陽、漢昌二郡並任魯肅');
    expect(biography?.answer).toContain('孫權再征黃祖、克其城並分置新都郡');
    expect(biography?.answer).toContain('孫權征皖城、克城並獲朱光');
    expect(biography?.answer).toContain('孫權於庱亭射虎');
    expect(biography?.answer).toContain('趙咨使魏、孫權辭魏封孫登而立為太子');
    expect(biography?.answer).toContain('孫權去世、孫亮即位');
    expect(biography?.answer).toContain('未列年份不代表沒有事情發生');
    expect(biography?.answer).not.toContain('197年・');
    expect(localInteraction('請整理孫權七十一年生平年表',start().state!).answer).toBe(biography?.answer);
  });
  it('能力命令不經普通人生階段選項過濾',()=>{
    const state=start().state!;expect(inspectLifePlan(state,['軒轅閃']).errors.length).toBeGreaterThan(0);
    const next=dispatch(state,{version:5,type:'InnateAction',worldlineId:state.worldlineId,expectedRevision:state.revision,commandId:'flash-baby',action:{type:'Flash',location:'庭院另一側',bringIds:[]}}).state!;
    expect(next.phase2!.scene.location).toBe('庭院另一側');expect(next.character.age).toBe(0);
    const rested=dispatch(next,{version:5,type:'SubmitLifePlan',worldlineId:next.worldlineId,expectedRevision:next.revision,commandId:'rest-there',choiceIds:['rest'],supplement:''}).state!;
    expect(rested.phase2!.scene.location).toBe('庭院另一側');expect(rested.phase4!.playerLocation).toBe('庭院另一側');
  });
  it('長期日常可跨年，逐日遇死亡節點中斷，未完成項目不給經驗',()=>{
    let state=start().state!;
    state=dispatch(state,{version:5,type:'Phase4Action',worldlineId:state.worldlineId,expectedRevision:state.revision,commandId:'near-node',action:{type:'AdvanceDays',days:7*360-1}}).state!;
    const before=state.character.growth.study;
    const next=dispatch(state,{version:5,type:'SubmitLifePlan',worldlineId:state.worldlineId,expectedRevision:state.revision,commandId:'long',choiceIds:['observe','rest'],supplement:'',paceDays:90}).state!;
    expect(next.actions.at(-1)?.elapsedDays).toBe(1);expect(next.actions.at(-1)?.interruptions?.length).toBe(1);expect(next.character.growth.study).toBe(before);
    expect(next.character.age).toBe(7);expect(next.phase4!.nodes.find(n=>n.contentId==='sun-jian-death-191')?.status).toBe('triggered');
    const arrived=dispatch(next,{version:5,type:'InnateAction',worldlineId:next.worldlineId,expectedRevision:next.revision,commandId:'rescue-arrive',action:{type:'Flash',location:'長江中游（節點資料）',bringIds:[]}}).state!;
    const healed=dispatch(arrived,{version:5,type:'InnateAction',worldlineId:arrived.worldlineId,expectedRevision:arrived.revision,commandId:'rescue-heal',action:{type:'Heal',targetId:'sun-jian'}}).state!;
    expect(healed.phase4!.nodes.find(n=>n.contentId==='sun-jian-death-191')?.status).toBe('broken');
    expect(()=>dispatch(next,{version:5,type:'SubmitLifePlan',worldlineId:next.worldlineId,expectedRevision:next.revision,commandId:'bad-pace',choiceIds:['rest'],supplement:'',paceDays:999})).toThrow('時間');
  });
});
