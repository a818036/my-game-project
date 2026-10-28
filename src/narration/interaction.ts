import type {GameState} from '../engine';
import {answerKnownRulerQuestion,currentRulerFact,lifeChoices,localInteraction,type InteractionResult} from '../life';
export async function understandInput(text:string,state:GameState,signal:AbortSignal):Promise<InteractionResult>{
  const factualAnswer=answerKnownRulerQuestion(text,state);
  if(factualAnswer)return {...factualAnswer,source:'已核對的遊戲年表'};
  const choices=lifeChoices(state);
  try{
    const health=await fetch('/api/health',{signal});if(!health.ok)throw new Error('無法連線');
    const {provider}=await health.json();if(provider==='mock')return{...localInteraction(text,state),source:'本機理解'};
    const context={age:state.character.age,monthAge:Math.max(0,state.world.month-1),year:state.world.year,currentRulerFact:currentRulerFact(state.world.year),location:state.phase2?.scene.location??state.character.home,presentNames:(state.phase2?.persons??[]).filter(p=>p.id!=='protagonist'&&p.alive&&state.phase2?.scene.presentIds.includes(p.id)).map(p=>p.name)};
    const response=await fetch('/api/interaction',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({text,context,choices:choices.map(({id,label,description,days})=>({id,label,description,days}))})});
    const result=await response.json();if(!response.ok)throw new Error(result.error??'理解服務失敗');
    if(!['question','objection','dialogue','action','mixed','unclear'].includes(result.kind)||typeof result.answer!=='string'||!Array.isArray(result.choiceIds)||result.choiceIds.some((id:unknown)=>!choices.some(c=>c.id===id))||!Array.isArray(result.questions)||result.questions.some((q:unknown)=>typeof q!=='string')||result.kind!=='action'&&result.choiceIds.length)throw new Error('互動回覆格式無效');
    const conservative=localInteraction(text,state);
    if(result.kind==='action'&&['question','objection','dialogue','mixed'].includes(conservative.kind))return{...conservative,source:'本機意圖保護：未採用 AI 的行動建議'};
    return{...result,source:provider==='chatgpt'?'ChatGPT 訂閱':'AI 理解'};
  }catch(e){if(signal.aborted)throw e;return{...localInteraction(text,state),source:`本機回退：${e instanceof Error?e.message:'服務失敗'}`};}
}
