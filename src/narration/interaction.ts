import type {GameState} from '../engine';
import type {Phase2Person} from '../phase2';
import {answerKnownHistoricalEventQuestion,answerKnownRulerQuestion,answerKnownSunQuanBiographyQuestion,answerKnownTrendQuestion,currentAge,currentRulerFact,lifeChoices,localInteraction,type InteractionResult} from '../life';

export interface DialogueExchange {speakerId:string;speakerName:string;playerText:string;npcText:string;}

function dialogueTarget(text:string,state:GameState):{error:string}|{target:Phase2Person;line:string}{
  const phrase=text.trim().match(/^(?:(?:我)?(?:想要|想|要)\s*)?(?:對|向|跟|與)\s*(.+?)\s*(?:說|問|道|講|詢問|表示)[：:\s]*/s);
  const people=(state.phase2?.persons??[]).filter(person=>person.id!=='protagonist'&&person.alive&&state.phase2?.scene.presentIds.includes(person.id));
  let target;
  if(phrase){const name=phrase[1].trim().replace(/[「」“”\"'：:，,。！？!?]+$/g,'');const matches=people.filter(person=>name===person.name||name===person.role);if(matches.length===1)target=matches[0];}
  else if(/^[「“\"]/.test(text.trim())&&people.length===1)target=people[0];
  if(!target){
    if(phrase){const named=(state.phase2?.persons??[]).find(person=>person.id!=='protagonist'&&(phrase[1].trim()===person.name||phrase[1].trim()===person.role));if(named&&!named.alive)return{error:`${named.name}已不在世，無法與他對話。`};if(named&&!people.some(person=>person.id===named.id))return{error:`${named.name}目前不在場，不能直接回話。`};}
    return{error:people.length?`請明確指定一位在場對象：${people.map(person=>person.name).join('、')}。`: '眼前沒有可直接交談的人物。'};
  }
  const line=phrase?text.trim().slice(phrase[0].length).replace(/^[「“\"]|[」”\"]$/g,'').trim():text.trim().replace(/^[「“\"]|[」”\"]$/g,'').trim();
  if(!line)return{error:`請補上想對${target.name}說的內容。`};
  return{target,line};
}

async function answerDialogue(text:string,state:GameState,signal:AbortSignal,history:DialogueExchange[]):Promise<InteractionResult>{
  const resolved=dialogueTarget(text,state);
  if('error'in resolved)return{kind:'dialogue',answer:resolved.error,choiceIds:[],questions:[],source:'在場人物檢查'};
  const {target,line}=resolved,observations=state.phase2?.observations??[],knownFacts=observations.filter(item=>item.witnessId===target.id).flatMap(item=>item.known).slice(-20);
  try{
    const conversation=history.filter(turn=>turn.speakerId===target.id).slice(-4).flatMap(turn=>[{role:'player' as const,text:turn.playerText},{role:'npc' as const,text:turn.npcText}]);
    const response=await fetch('/api/dialogue',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({text:line,history:conversation,protagonist:{name:state.character.name,age:currentAge(state),ageMonths:Math.max(0,state.world.month-1)},scene:{location:state.phase2?.scene.location??state.character.home},npc:{id:target.id,name:target.name,age:Math.max(0,state.world.year-target.birthYear),role:target.role,office:target.office,knownFacts}})});
    const result=await response.json();if(!response.ok)throw new Error(result.error??'人物暫時無法回話');
    if(result.speakerId!==target.id||typeof result.text!=='string'||!result.text.trim()||result.text.length>1000)throw new Error('人物回應未通過檢查');
    const provider=response.headers.get('X-Narration-Provider');
    return{kind:'dialogue',answer:result.text,choiceIds:[],questions:['本頁保留最近四次與此人物的交談供延續話題；不寫入存檔、不推進時間，也不改變人物關係。'],source:provider==='chatgpt'?'ChatGPT 訂閱對話':provider==='openai'?'AI 對話':'本機對話範本',speakerName:target.name,speakerId:target.id};
  }catch(error){if(signal.aborted)throw error;return{kind:'dialogue',answer:`${target.name}沒有回話：${error instanceof Error?error.message:'對話服務暫時無法使用'}。沒有推進時間或改變存檔。`,choiceIds:[],questions:[],source:'對話服務未完成',speakerName:target.name};}
}
export async function understandInput(text:string,state:GameState,signal:AbortSignal,history:DialogueExchange[]=[]):Promise<InteractionResult>{
  const local=localInteraction(text,state);
  if(local.kind==='dialogue')return answerDialogue(text,state,signal,history);
  if(local.source==='重大操作保護'||local.source==='重大操作專用入口')return local;
  const biographyAnswer=answerKnownSunQuanBiographyQuestion(text);
  if(biographyAnswer)return {...biographyAnswer,source:biographyAnswer.source??'已核對的《三國志》生平資料'};
  const factualAnswer=answerKnownRulerQuestion(text,state);
  if(factualAnswer)return {...factualAnswer,source:'已核對的遊戲年表'};
  const trendAnswer=answerKnownTrendQuestion(text,state);
  if(trendAnswer)return {...trendAnswer,source:'目前世界線的天下來報'};
  const eventAnswer=answerKnownHistoricalEventQuestion(text,state);
  if(eventAnswer)return {...eventAnswer,source:'已核對的遊戲年表'};
  const deterministic=local;
  if(deterministic.kind==='action')return {...deterministic,source:'已辨識的明確生活行動；確認後執行'};
  const choices=lifeChoices(state);
  try{
    const health=await fetch('/api/health',{signal});if(!health.ok)throw new Error('無法連線');
    const {provider}=await health.json();if(provider==='mock'){const local=localInteraction(text,state);return local.kind==='dialogue'?await answerDialogue(text,state,signal,history):{...local,source:'本機理解'};}
    const context={age:state.character.age,monthAge:Math.max(0,state.world.month-1),year:state.world.year,currentRulerFact:currentRulerFact(state.world.year),currentTrend:state.trend,location:state.phase2?.scene.location??state.character.home,presentNames:(state.phase2?.persons??[]).filter(p=>p.id!=='protagonist'&&p.alive&&state.phase2?.scene.presentIds.includes(p.id)).map(p=>p.name)};
    const response=await fetch('/api/interaction',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({text,context,choices:choices.map(({id,label,description,days})=>({id,label,description,days}))})});
    const result=await response.json();if(!response.ok)throw new Error(result.error??'理解服務失敗');
    if(!['question','objection','dialogue','action','mixed','unclear'].includes(result.kind)||typeof result.answer!=='string'||!Array.isArray(result.choiceIds)||result.choiceIds.some((id:unknown)=>!choices.some(c=>c.id===id))||!Array.isArray(result.questions)||result.questions.some((q:unknown)=>typeof q!=='string')||result.kind!=='action'&&result.choiceIds.length)throw new Error('互動回覆格式無效');
    const conservative=localInteraction(text,state);
    if(result.kind==='action'&&['question','objection','dialogue','mixed'].includes(conservative.kind))return{...conservative,source:'本機意圖保護：未採用 AI 的行動建議'};
    if(result.kind==='dialogue')return answerDialogue(text,state,signal,history);
    return{...result,source:provider==='chatgpt'?'ChatGPT 訂閱':'AI 理解'};
  }catch(e){if(signal.aborted)throw e;return{...localInteraction(text,state),source:`本機回退：${e instanceof Error?e.message:'服務失敗'}`};}
}
