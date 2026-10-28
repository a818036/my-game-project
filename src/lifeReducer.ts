import type {GameEvent,GameState} from './engine';
import {inspectLifePlan,LIFE_POLICY_VERSION} from './life';
import {advancePhase2} from './phase2';
import {advancePhase4} from './phase4';
import {advanceInnate} from './innate';
import {runPersonnelEngine,runTalentEngine,trendForTurn} from './systems';

export function resolveYoungLife(state:GameState,event:Extract<GameEvent,{type:'LifePlanResolved'}>):GameState{
  if(event.payload.policyVersion!==LIFE_POLICY_VERSION)throw new Error('不支援的人生情境版本');
  const plan=inspectLifePlan(state,event.payload.choiceIds,event.payload.paceDays);
  if(plan.errors.length)throw new Error(plan.errors.join(' '));
  if(state.character.age>=15||!state.phase4||!state.phase2)throw new Error('幼年生活情境資料不符');
  if(state.turn>=120)throw new Error('本段旅程已結束');
  let phase4=structuredClone(state.phase4),elapsedDays=0;const completed:typeof plan.choices=[],interruptions:string[]=[];
  outer:for(const choice of plan.choices){
    for(let i=0;i<choice.days;i++){
      const n=phase4.eventLedger.length;phase4=advancePhase4(phase4,1);elapsedDays++;
      const major=phase4.eventLedger.slice(n).find(e=>['死亡硬節點觸發','死亡硬節點落實','史實事件形成','史實事件取消'].includes(e.type));
      if(major){interruptions.push(major.detail);break outer;}
    }
    completed.push(choice);
  }
  const turn=state.turn+1,character=structuredClone(state.character);
  character.age=phase4.year-character.birthYear;
  for(const choice of completed)if(choice.growth)character.growth[choice.growth]++;
  const location=state.phase2.scene.location;
  let phase2=advancePhase2(state.phase2,turn,phase4.year,'日常見聞',character.money,event.eventId,elapsedDays);
  // Do not manufacture a visiting adult or move the protagonist on a passive action.
  const presentIds=state.phase2.scene.presentIds.filter(id=>phase2.persons.some(p=>p.id===id&&p.alive));
  phase2.scene={turn,location,presentIds,enteredIds:[],leftIds:state.phase2.scene.presentIds.filter(id=>!presentIds.includes(id)),speeches:[]};
  const descriptions:Record<string,string>={observe:`你留在${location}，留心眼前的形影。`,listen:`你留在${location}，留心耳邊的聲響。`,reflect:`你留在${location}，默默整理已有的記憶。`,rest:`你留在${location}安靜休息。`};
  const details=completed.map(c=>descriptions[c.id]).join('')+(interruptions.length?'日常安排因重大消息而中斷。':'');
  for(const choice of completed)phase2.practiceLog.push({turn,focus:choice.label,note:'記錄一次生活經驗；不增加成熟五維、財產或熟練技能。'});
  const actions=[...state.actions,{turn,intent:'幼年日常' as const,intents:[],title:completed.map(c=>c.label).join('、')||'日常安排中斷',details,supplement:event.payload.supplement,elapsedDays,interruptions,lifeChoices:completed.map(c=>c.id)}];
  const personnel=runPersonnelEngine(state.backend.personnel,turn),talents=runTalentEngine(state.backend.talents,state.world.seed,turn);
  return {...state,turn,revision:event.revision,status:turn===120?'complete':'playing',character,world:{...state.world,year:phase4.year,month:phase4.month,eventCount:state.world.eventCount+1},phase4,phase2,
    ...(state.innate?{innate:advanceInnate(state.innate,turn,elapsedDays,phase4.year)}:{}),actions,trend:trendForTurn(state.world.seed,turn),
    backend:{personnelChecks:state.backend.personnelChecks+1,talentChecks:state.backend.talentChecks+1,historyChecks:state.backend.historyChecks+1,trendChecks:state.backend.trendChecks+1,personnel:personnel.messages.length?personnel.messages:state.backend.personnel,talents:talents.names},
    appliedCommands:{...state.appliedCommands,[event.commandId]:event.commandHash}};
}
