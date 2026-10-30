import {useEffect,useRef,useState} from 'react';
import {inspectActionPlan,type GameCommand,type GameState} from '../engine';
import {currentAge,lifeChoices,lifeStage,inspectLifePlan,type InteractionResult} from '../life';
import {understandInput,type DialogueExchange} from '../narration/interaction';

export function LifeActionPanel({state,busy,onRun}:{state:GameState;busy:boolean;onRun:(command:GameCommand)=>Promise<boolean>}){
  const [selected,setSelected]=useState<string[]>([]),[text,setText]=useState(''),[reply,setReply]=useState<InteractionResult|null>(null),[review,setReview]=useState<string[]|null>(null),[error,setError]=useState(''),[pending,setPending]=useState(false);
  const [paceDays,setPaceDays]=useState(1);
  const lock=useRef(false),abort=useRef<AbortController|null>(null),reviewHeading=useRef<HTMLHeadingElement|null>(null),primaryAction=useRef<HTMLButtonElement|null>(null),restorePlanFocus=useRef(false);const choices=lifeChoices(state),age=currentAge(state),dialogueHistory:DialogueExchange[]=state.phase2?.dialogueHistory??[];
  useEffect(()=>()=>abort.current?.abort(),[]);
  useEffect(()=>{if(review)reviewHeading.current?.focus();else if(restorePlanFocus.current){primaryAction.current?.focus();restorePlanFocus.current=false;}},[review]);
  useEffect(()=>{abort.current?.abort();setReview(null);setReply(null);setSelected([]);if(age>=15)setPaceDays(1);},[state.turn,state.worldlineId,age]);
  const previousDialogue=reply?.speakerId?dialogueHistory.filter(turn=>turn.speakerId===reply.speakerId).slice(0,-1).slice(-3):[];
  const effective=review??[],plan=inspectLifePlan(state,effective,paceDays),adultConflicts=age>=15?inspectActionPlan(plan.choices.map(c=>c.intent!)).conflicts:[];
  async function submit(){
    if(lock.current||busy)return;setError('');setReview(null);setReply(null);
    if(!text.trim()){if(selected.length)setReview([...selected]);else setError('請勾選項目或輸入想說的話。');return;}
    lock.current=true;setPending(true);const controller=new AbortController();abort.current=controller;
    try{const spoken=text.trim(),result=await understandInput(spoken,state,controller.signal,dialogueHistory);if(controller.signal.aborted)return;if(result.kind==='dialogue'&&result.speakerId&&result.speakerName&&result.source!=='對話服務未完成'){const saved=await onRun({version:5,commandId:crypto.randomUUID(),expectedRevision:state.revision,worldlineId:state.worldlineId,type:'Phase2Action',action:{type:'RecordDialogueExchange',exchange:{speakerId:result.speakerId,speakerName:result.speakerName,turn:state.turn,playerText:result.playerText??spoken,npcText:result.answer}}});if(!saved){setReply({...result,questions:[...result.questions,'這次回覆未能保存到存檔；之後重新整理將不會保留這段對話。']});return;}}setReply(result);if(result.kind==='action'&&!result.questions.length)setReview([...new Set([...result.choiceIds,...selected])]);else if(selected.length)setReview([...selected]);}
    catch{setError('已取消理解；文字與勾選保留，沒有執行行動。');}finally{lock.current=false;setPending(false);}
  }
  async function confirm(){
    if(lock.current||busy||!review||plan.errors.length||adultConflicts.length)return;
    lock.current=true;setPending(true);setError('');
    try{const ok=await onRun({version:5,commandId:crypto.randomUUID(),expectedRevision:state.revision,worldlineId:state.worldlineId,type:'SubmitLifePlan',choiceIds:[...review],supplement:text.trim(),paceDays});if(ok){setSelected([]);setText('');setReply(null);setReview(null);}else setError('保存或結算失敗；原文仍保留，請檢查頁面提示。');}
    finally{lock.current=false;setPending(false);}
  }
  return <article className="panel intents"><div className="panel-heading"><div><div className="section-kicker">{lifeStage(age)}・此刻的選擇</div><h2 id="life-action-heading">你想怎麼做？</h2></div><span className="round">第 {state.turn} 回合</span></div>
    <div className="intent-grid" role="group" aria-labelledby="life-action-heading">{choices.map(c=><label key={c.id} className={`intent ${selected.includes(c.id)?'selected':''}`}><input type="checkbox" checked={selected.includes(c.id)} disabled={busy||pending} onChange={e=>{setSelected(s=>e.target.checked?[...s,c.id]:s.filter(x=>x!==c.id));setReview(null);setReply(null);}}/><span><strong>{c.label}</strong><small>{c.description}・{age<15?paceDays:c.days} 日</small></span></label>)}</div>
    {age<15&&<label>每項日常安排的時間<select disabled={busy||pending} value={paceDays} onChange={e=>{setPaceDays(Number(e.target.value));setReview(null);}}>{[1,7,30,90].map(d=><option value={d} key={d}>{d} 日</option>)}</select></label>}
    <label className="supplement-label">行動、詢問或想說的話<textarea aria-describedby="action-input-help" rows={4} value={text} disabled={busy||pending} onChange={e=>{setText(e.target.value);setReview(null);setReply(null);}} placeholder="例如：對在場人物說「今日可好？」／我想觀察眼前。"/></label>
    <p id="action-input-help" className="caption">詢問與質疑不推進時間。行動會先列出內容與耗時，確認後才執行。人物對話會把本次文字與同一人物最多最近四次對話送至目前設定的對話服務（mock 模式使用本機範本）；較長前文會節錄或略去較舊輪次。成功往返會存入此世界線；不推進時間或改變關係。天生技仍可由專用操作台使用。</p>
    {dialogueHistory.length>0&&<details className="dialogue-history"><summary>此世界線的人物對話（最近 {dialogueHistory.length} 次）</summary><ol>{dialogueHistory.map((exchange,index)=><li key={`${exchange.speakerId}-${exchange.turn}-${index}`}><p className="dialogue-meta">第 {exchange.turn} 回合・{exchange.speakerName}</p><p><b>你：</b>{exchange.playerText}</p><p><b>{exchange.speakerName}：</b>{exchange.npcText}</p></li>)}</ol><p className="caption">此紀錄只屬於目前世界線；每人最多保留最近四次，全體最多四十次。</p></details>}
    {reply&&<section className="plan-review" aria-live="polite"><b>{reply.speakerName?`${reply.speakerName}回應`:({question:'回應你的詢問',objection:'回應你的質疑',dialogue:'對話內容',action:'理解你的行動',mixed:'需要拆開確認',unclear:'需要說明'} as const)[reply.kind]}</b>{previousDialogue.map((turn,index)=><div className="conversation-turn" key={`${turn.speakerId}-${index}`}><p><b>你：</b>{turn.playerText}</p><p><b>{turn.speakerName}：</b>{turn.npcText}</p></div>)}<p>{reply.answer}</p>{reply.questions.map((q,i)=><p key={i}>{q}</p>)}{reply.kind!=='action'&&selected.length>0&&<p>你勾選的「{choices.filter(c=>selected.includes(c.id)).map(c=>c.label).join('、')}」已列入下方待確認計畫；確認前不會執行。</p>}{reply.kind!=='action'&&selected.length===0&&<p>{reply.kind==='dialogue'&&reply.speakerId?'沒有執行勾選項目；這段對話已保存，但時間與人物關係未變。':'沒有執行勾選項目，時間與存檔未變更。'}</p>}<details><summary>回應來源</summary>{reply.source}</details></section>}
    {review&&<section className="plan-review" role="region" aria-labelledby="plan-review-title"><h3 id="plan-review-title" ref={reviewHeading} tabIndex={-1}>確認這份行動計畫</h3><p>{plan.choices.map(c=>c.label).join(' → ')}</p><p>預計推進 {plan.days} 日，共一個回合；重大事件可能中斷安排。</p>{[...plan.errors,...adultConflicts].map((m,i)=><p key={i} className="conflict">{m}</p>)}<button className="primary" disabled={busy||pending||!!plan.errors.length||!!adultConflicts.length} onClick={()=>void confirm()}>確認執行</button><button className="quiet" disabled={busy||pending} onClick={()=>{restorePlanFocus.current=true;setReview(null);}}>返回調整</button></section>}
    {!review&&<button ref={primaryAction} className="primary wide" disabled={busy||pending||(!text.trim()&&!selected.length)} onClick={()=>void submit()}>{pending?'理解中…':text.trim()?'送出文字，先理解意思':'檢視勾選計畫'}</button>}
    {pending&&!busy&&<button className="quiet" onClick={()=>abort.current?.abort()}>取消理解</button>}
    {error&&<p role="alert" className="notice">{error}</p>}
  </article>;
}
