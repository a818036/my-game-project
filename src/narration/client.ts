import type { GameEvent, GameState, PlannedActionDetail } from '../engine';
import {currentAge} from '../life';
import {computeBattleVisibility} from '../battle-geometry';
import {HISTORY_CONTENT} from '../phase4';

export interface NarrationKnowledgeRecord { turn:number; observation:string; facts:string[]; }
export interface NarrationPayload {
  eventBatchId:string;
  protagonist?:{name:string;age:number;ageMonths:number;birthYear:number;modernMemory:boolean};
  /** Player-only memories derived from persisted, player-confirmed action records. */
  protagonistMemory?:Array<{turn:number;title:string;details:string}>;
  settledEvents:Array<{turn:number;title:string;details:string;resolvedActions?:PlannedActionDetail[]}>;
  playerView:{location:string;trend:string;knownFacts:NarrationKnowledgeRecord[]};
  visibleNpcs:Array<{id:string;name:string;age:number;office:string;present:true;knownFacts:NarrationKnowledgeRecord[]}>;
}
export interface NarrationResult { paragraphs:string[]; dialogue:Array<{speakerId:string;text:string}>; suggestions:string[]; source?:'mock'|'openai'|'chatgpt'|'template'; }
export function buildNarrationPayload(state:GameState,event:GameEvent):NarrationPayload{
  const observations=state.phase2?.observations??[];
  const knownFactsFor=(witnessId:string):NarrationKnowledgeRecord[]=>observations
    .filter(item=>item.witnessId===witnessId&&item.known.length>0)
    .sort((left,right)=>left.turn-right.turn)
    .slice(-3)
    .map(item=>({turn:item.turn,observation:item.observation.slice(0,120),facts:item.known.slice(0,3).map(fact=>fact.slice(0,180))}));
  const knownFacts=knownFactsFor('protagonist');
  const visibleNpcs=(state.phase2?.scene.presentIds??[]).filter(id=>id!=='protagonist').map(id=>{
    const npc=state.phase2!.persons.find(item=>item.id===id)!;
    return{id:npc.id,name:npc.name,age:Math.max(0,state.world.year-npc.birthYear),office:npc.office,present:true as const,knownFacts:knownFactsFor(id)};
  });
  const latest=state.actions.at(-1);let settledEvents:NarrationPayload['settledEvents']=[];
  if((event.type==='ActionPlanResolved'||event.type==='LifePlanResolved')&&latest)settledEvents=[{turn:latest.turn,title:latest.title,details:latest.supplement?latest.details.replaceAll(latest.supplement,'').replace(/；補充說明[^；]*/g,''):latest.details,...(latest.freeTextActions?{resolvedActions:latest.freeTextActions}:{})}];
  else if(event.type==='Phase4Changed'){
    const entry=state.phase4?.eventLedger.at(-1);
    if(entry){
      let details=entry.detail;
      const historicalContent=entry.source?HISTORY_CONTENT.find(content=>content.source===entry.source):undefined;
      if(historicalContent){details+=`；年表史料（不表示主角親見）：${historicalContent.source}；記載範圍：${historicalContent.description}${historicalContent.sourceDateNote?`；紀年註記：${historicalContent.sourceDateNote}`:''}`;}
      const battle=state.phase4?.battle;
      if(battle&&(event.payload.action.type==='BattleRound'||event.payload.action.type==='StartBattle')){
        const unitLedger=battle.units.map(unit=>`${unit.commanderName}率${unit.faction}：所在${unit.location}；地形${unit.terrain}；命令${unit.order}；現役${unit.strength}、預備${unit.reserve}、陣亡累計${unit.killed}、受傷累計${unit.wounded}、撤退${unit.routed}；士氣${unit.morale}、疲勞${unit.fatigue}、補給${unit.supply}`).join('；');
        const latestLog=battle.logs.at(-1);
        details+=`；戰場帳：${battle.location}；第 ${battle.rounds} 輪；主角${battle.protagonistPresent?'在場':'不在場'}${latestLog?`；回合紀錄：${latestLog}`:''}；各部狀態：${unitLedger}`;
      }
      if(battle?.scene){const scene=battle.scene,objects=scene.objects.map(object=>`${object.label}在${object.location}（${object.condition}${object.integrity!==undefined?`；完整度 ${object.integrity}`:''}）`).join('；'),links=scene.potentialChains.map(link=>{const from=scene.objects.find(object=>object.id===link.fromObjectId)?.label??link.fromObjectId,to=scene.objects.find(object=>object.id===link.toObjectId)?.label??link.toObjectId,settled=scene.settledChainIds?.includes(link.id);return `${from}→${to}：${settled?`已由引擎結算，作用距離 ${link.maxDistance}、指定部隊 ${link.affectedUnitIds.join('、')||'無'}`:`若${link.triggerCondition}，${link.possibleEffect}；尚未觸發或結算`}；涉及部隊 ${link.affectedUnitIds.join('、')||'未指定'}`;}).join('；'),observers=scene.observers.map(observer=>{const visibility=computeBattleVisibility(scene,observer,battle.units);if(visibility===null)return `${observer.side}在${observer.location}：${observer.visibility}（舊存檔文字視線記錄）`;const observed=visibility.length?visibility.map(item=>item.visible?`${item.targetLabel}可見（平面距離 ${item.distance}）`:item.reason==='occluded'?`${item.targetLabel}被${item.blockedBy}遮擋（平面距離 ${item.distance}）`:`${item.targetLabel}超出視距（平面距離 ${item.distance}）`).join('；'):'沒有可用座標的目標';return `${observer.side}在${observer.location}：依示例平面座標計算，視距 ${observer.sightRange}；${observed}`;}).join('；');details+='；場景預置'+(scene.example?'（示例）':'')+'：'+objects+'；物件因果鏈（標記已結算者與未觸發條件）：'+links+'；觀察位置與視線：'+observers;}
      settledEvents=[{turn:state.turn+1,title:entry.type,details}];
    }
  }
  else if(event.type==='InnateChanged'){const consequence=state.innate?.consequences.at(-1);if(consequence)settledEvents=[{turn:state.turn+1,title:consequence.title,details:[...consequence.direct,...consequence.secondary].join('；')}];}
  else if(event.type==='Phase2Changed')settledEvents=[{turn:state.turn+1,title:'人物與家產變更',details:'人物、關係或家產命令已由規則引擎結算；未公開欄位不提供給敘事。'}];
  const actionResolution=event.type==='ActionPlanResolved'||event.type==='LifePlanResolved';
  const protagonistMemory=state.actions
    .filter(action=>!actionResolution||action!==latest)
    .slice(-5)
    .map(action=>({turn:action.turn,title:action.title.slice(0,160),details:(action.supplement?action.details.replaceAll(action.supplement,'').replace(/；補充說明[^；]*/g,''):action.details).slice(0,800)}));
  return{eventBatchId:event.eventId,protagonist:{name:state.character.name,age:currentAge(state),ageMonths:Math.max(0,state.world.month-1),birthYear:state.character.birthYear,modernMemory:state.character.profile.modernMemory},protagonistMemory,settledEvents,playerView:{location:state.phase2?.scene.location??state.character.home,trend:state.trend,knownFacts},visibleNpcs};
}
export function templateNarration(payload:NarrationPayload):NarrationResult{
  const action=payload.settledEvents.at(-1);
  return{paragraphs:[action?.details??'行動結果已依規則結算。'],dialogue:[],suggestions:['查看眼前人物與地方消息','安排下一段可行行動'],source:'template'};
}
export function validateNarrationResult(value:unknown,payload:NarrationPayload):NarrationResult{
  if(!value||typeof value!=='object')throw new Error('敘事資料格式無效');
  const result=value as Partial<NarrationResult>;
  if(Object.keys(value).some(key=>!['paragraphs','dialogue','suggestions'].includes(key))||!Array.isArray(result.paragraphs)||!result.paragraphs.every(item=>typeof item==='string')||!Array.isArray(result.suggestions)||!result.suggestions.every(item=>typeof item==='string')||!Array.isArray(result.dialogue))throw new Error('敘事資料格式無效');
  const allowed=new Set(payload.visibleNpcs.map(person=>person.id));
  if(result.dialogue.some(line=>!line||typeof line.speakerId!=='string'||!allowed.has(line.speakerId)||typeof line.text!=='string'))throw new Error('敘事提及不在場或未知的發言者');
  const privateMemory=[...(payload.protagonistMemory??[]).flatMap(item=>[item.title,item.details]),...payload.playerView.knownFacts.flatMap(record=>record.facts)].filter(secret=>secret.trim().length>=5);
  if(result.dialogue.some(line=>privateMemory.some(secret=>line.text.includes(secret.trim()))))throw new Error('NPC 對話洩漏主角的私人回憶');
  const facts=JSON.stringify([payload.settledEvents,payload.protagonist,payload.protagonistMemory]),numbers=new Set(facts.match(/\d+(?:\.\d+)?/g)??[]),text=[...result.paragraphs,...result.suggestions,...result.dialogue.map(line=>line.text)].join('\n');
  if((text.match(/\d+(?:\.\d+)?/g)??[]).some(number=>!numbers.has(number)))throw new Error('敘事包含結算紀錄中不存在的數字事實');
  return result as NarrationResult;
}
export async function fetchNarration(payload:NarrationPayload,signal:AbortSignal):Promise<NarrationResult>{
  const response=await fetch('/api/narration',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(typeof body.error==='string'?body.error:`敘事代理回應 ${response.status}`);}
  const provider=response.headers.get('X-Narration-Provider');
  return {...validateNarrationResult(await response.json(),payload),source:provider==='chatgpt'?'chatgpt':provider==='openai'?'openai':'mock'};
}

