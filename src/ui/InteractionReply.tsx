import type {InteractionResult} from '../life';
import type {DialogueExchange} from '../narration/interaction';

function replyTitle(reply:InteractionResult):string{
  if(reply.speakerName)return `${reply.speakerName}回應`;
  return ({question:'回應你的詢問',objection:'回應你的質疑',dialogue:'對話內容',action:'理解你的行動',mixed:'需要拆開確認',unclear:'需要說明'} as const)[reply.kind];
}

function announcementText(reply:InteractionResult):string{
  const answer=reply.answer.trim().replace(/\s+/g,' ');
  const concise=answer.length>220?`${answer.slice(0,220).trimEnd()}…`:answer;
  return concise?`${replyTitle(reply)}：${concise}`:replyTitle(reply);
}

export function InteractionReply({reply,previousDialogue,selectedChoiceLabels}:{reply:InteractionResult;previousDialogue:DialogueExchange[];selectedChoiceLabels:string[]}){
  return <>
    <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{announcementText(reply)}</p>
    <section className="plan-review" role="region" aria-labelledby="interaction-reply-title">
      <h3 id="interaction-reply-title">{replyTitle(reply)}</h3>
      {previousDialogue.map((turn,index)=><div className="conversation-turn" key={`${turn.speakerId}-${index}`}><p><b>你：</b>{turn.playerText}</p><p><b>{turn.speakerName}：</b>{turn.npcText}</p></div>)}
      <p>{reply.answer}</p>
      {reply.questions.map((question,index)=><p key={index}>{question}</p>)}
      {reply.kind!=='action'&&selectedChoiceLabels.length>0&&<p>你勾選的「{selectedChoiceLabels.join('、')}」已列入下方待確認計畫；確認前不會執行。</p>}
      {reply.kind!=='action'&&selectedChoiceLabels.length===0&&<p>{reply.kind==='dialogue'&&reply.speakerId?'沒有執行勾選項目；這段對話已保存，但時間與人物關係未變。':'沒有執行勾選項目，時間與存檔未變更。'}</p>}
      <details><summary>回應來源</summary>{reply.source}</details>
    </section>
  </>;
}
