import type {GameState} from '../engine';
import type {Phase2Person} from '../phase2';
import {answerKnownHistoricalEventQuestion,answerKnownHistoricalPersonTimelineQuestion,answerKnownRulerQuestion,answerKnownSunQuanBiographyQuestion,answerKnownTrendQuestion,currentAge,currentRulerFact,lifeChoices,localInteraction,type InteractionResult} from '../life';

export interface DialogueExchange {speakerId:string;speakerName:string;turn?:number;playerText:string;npcText:string;}

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
  const {target,line}=resolved;
  if(line.length>1200)return{kind:'dialogue',answer:'這段對話超過 1,200 字，請縮短後再送。沒有呼叫對話服務或保存內容。',choiceIds:[],questions:[],source:'對話長度檢查',speakerName:target.name};
  const observations=state.phase2?.observations??[],knownFacts=observations.filter(item=>item.witnessId===target.id).flatMap(item=>item.known).slice(-6).map(fact=>fact.slice(0,160));
  const relation=state.phase2?.relationships.find(item=>item.personId===target.id);
  const tone=(value:number,low:string,high:string)=>value<=30?low:value>=70?high:'普通';
  try{
    const conversation=history.filter(turn=>turn.speakerId===target.id).slice(-4).flatMap(turn=>[{role:'player' as const,text:turn.playerText},{role:'npc' as const,text:turn.npcText}]).map(turn=>({...turn,text:turn.text.length>240?`${turn.text.slice(0,239)}…`:turn.text}));
    const payload={text:line,history:conversation,protagonist:{name:state.character.name.slice(0,120),age:currentAge(state),ageMonths:Math.max(0,state.world.month-1)},scene:{location:(state.phase2?.scene.location??state.character.home).slice(0,200)},npc:{id:target.id,name:target.name.slice(0,120),age:Math.max(0,state.world.year-target.birthYear),role:target.role.slice(0,120),office:target.office.slice(0,120),knownFacts},relationship:relation?{trust:tone(relation.trust,'信任較低','信任較高'),loyalty:tone(relation.loyalty,'忠誠較低','忠誠較高'),fear:tone(relation.fear,'畏懼較低','畏懼較高')}:undefined};
    while(JSON.stringify(payload).length>5600&&payload.history.length)payload.history.splice(0,2);
    while(JSON.stringify(payload).length>5600&&payload.npc.knownFacts.length)payload.npc.knownFacts.shift();
    if(JSON.stringify(payload).length>6000)return{kind:'dialogue',answer:'這段對話情境仍超過服務上限，請縮短本次文字後再送。沒有呼叫對話服務或保存內容。',choiceIds:[],questions:[],source:'對話情境長度檢查',speakerName:target.name};
    const response=await fetch('/api/dialogue',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const result=await response.json();if(!response.ok)throw new Error(result.error??'人物暫時無法回話');
    if(result.speakerId!==target.id||typeof result.text!=='string'||!result.text.trim()||result.text.length>1000)throw new Error('人物回應未通過檢查');
    const provider=response.headers.get('X-Narration-Provider');
    return{kind:'dialogue',answer:result.text,choiceIds:[],questions:['對話會把本次文字、主角年齡與所在地、指定人物身份及其已知內容、同一人物最多最近四次交談，以及目前關係的粗略語氣提示送至所選服務；成功往返會寫入此世界線。對話不推進時間，也不改變人物關係。'],source:provider==='chatgpt'?'ChatGPT 訂閱對話':provider==='openai'?'AI 對話':'本機對話範本',speakerName:target.name,speakerId:target.id,playerText:line};
  }catch(error){if(signal.aborted)throw error;return{kind:'dialogue',answer:`${target.name}沒有回話：${error instanceof Error?error.message:'對話服務暫時無法使用'}。沒有推進時間或改變存檔。`,choiceIds:[],questions:[],source:'對話服務未完成',speakerName:target.name};}
}
export async function understandInput(text:string,state:GameState,signal:AbortSignal,history:DialogueExchange[]=[]):Promise<InteractionResult>{
  const local=localInteraction(text,state);
  if(local.kind==='dialogue')return answerDialogue(text,state,signal,history);
  if(local.source==='重大操作保護'||local.source==='重大操作專用入口')return local;
  const biographyAnswer=answerKnownSunQuanBiographyQuestion(text);
  if(biographyAnswer)return {...biographyAnswer,source:biographyAnswer.source??'已核對的《三國志》生平資料'};
  const personTimelineAnswer=answerKnownHistoricalPersonTimelineQuestion(text);
  if(personTimelineAnswer)return {...personTimelineAnswer,source:'已核對的遊戲年表'};
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
