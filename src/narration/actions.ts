import { INTENTS, inspectActionPlan, type Intent, type PlannedActionDetail } from '../engine';

export interface ActionTarget { id: string; name: string; alive: boolean; present: boolean; recruitable?: boolean; }
export interface ResolvedFreeAction extends PlannedActionDetail {}
export interface FreeTextCandidate {
  actions: ResolvedFreeAction[];
  conflicts: string[];
  questions: string[];
  unsupported: string[];
  understood: string;
  needsConfirmation: boolean;
  interpretationSource?: string;
}

const WORDS: Array<{ intent: Intent; words: string[]; methods: string[] }> = [
  { intent:'耕讀自持', words:['耕讀自持','耕讀','讀書','讀兵書','讀經','抄書','耕田','耕作','農事'], methods:['讀書','讀兵書','讀經','抄書','耕作','耕田'] },
  { intent:'訪求人才', words:['訪求人才','訪賢','尋訪人才','尋才','招攬','延請'], methods:['登門延請','訪問'] },
  { intent:'經商營生', words:['經商營生','經商','做生意','買賣','交易','擺攤','市集'], methods:['市集買賣','做生意','買賣','交易','擺攤','探價交易'] },
  { intent:'遊歷鄉里', words:['遊歷鄉里','遊歷','走訪','遊訪','探訪','拜訪','探望','出門走走'], methods:['走訪','拜訪','探望'] },
];

type Mention={intent:Intent;index:number;word:string;method?:string;order:number;targetId?:string;targetName?:string;condition?:'目標仍在場'};
function extractMentions(text:string):Mention[]{
  const found:Mention[] = [];
  for(const group of WORDS) for(const word of group.words){
    let from=0; while(true){const index=text.indexOf(word,from);if(index<0)break;const end=index+word.length;const overlaps=found.some(item=>index<item.index+item.word.length&&item.index<end);if(!overlaps){found.push({intent:group.intent,index,word,order:found.length+1,...(group.methods.includes(word)?{method:word}:{})});}from=end;}
  }
  return found.sort((a,b)=>a.index-b.index);
}

export function interpretFreeText(text:string, selected:Intent[], targets:ActionTarget[]):FreeTextCandidate {
  const clean=text.trim(), questions:string[]=[], unsupported:string[]=[], conflicts:string[]=[];
  if(!clean)return{actions:[],conflicts,questions:['請輸入補充說明，或勾選至少一項行動。'],unsupported,understood:'尚未提供行動文字。',needsConfirmation:true};
  const mentions=extractMentions(clean);
  if(/不要|先別|不去|不做|取消|除非/.test(clean)&&mentions.length)questions.push('文字含有否定或例外語句；請明確說明哪些行動要執行。');
  const byStart:Mention[]=mentions.map((item,index)=>({...item,order:index+1}));
  const targetPattern=/(?:拜訪|探望|走訪|探訪|延請|招攬|邀請|找尋|尋訪)\s*([\p{Script=Han}]{2,4})/gu;
  for(const match of clean.matchAll(targetPattern)){
    const name=match[1];
    const action=byStart.find(item=>Math.abs(item.index-match.index!)<14);
    if(!action)continue;
    const matches=targets.filter(target=>target.alive&&(target.name===name||target.name.startsWith(name)||target.name.split('・')[0]===name));
    if(matches.length!==1){questions.push(matches.length===0?`「${name}」不是目前可辨識的在世對象；請選擇已知人物，或移除目標。`:`「${name}」對應多名人物，請指定其中一位。`);continue;}
    const target=matches[0];
    if(action.intent==='訪求人才'&&!target.recruitable){unsupported.push(`目前沒有可招攬的人才資料對應「${name}」；不會假稱已向其招攬。`);continue;}
    if(action.intent==='遊歷鄉里'&&!target.present){questions.push(`「${name}」目前不在眼前場景；此原型不能把拜訪當成立即同場。請改用已到達的對象或另行安排旅程。`);continue;}
    action.targetId=target.id;action.targetName=target.name;
    if(/若|如果|假使/.test(clean)&&/仍在場|人在場/.test(clean)){if(!target.present)questions.push(`目前資料不能判定「${name}」是否仍在場；請移除條件或改選有場景資料的人物。`);else action.condition='目標仍在場';}
  }
  const actions:ResolvedFreeAction[]=[];
  for(const item of byStart){
    const existing=actions.find(action=>action.intent===item.intent);
    if(!existing)actions.push({intent:item.intent,order:actions.length+1,...(item.method?{method:item.method}:{}),...(item.targetId?{targetId:item.targetId,targetName:item.targetName}:{}),...(item.condition?{condition:item.condition}:{})});
    else if(!existing.method&&item.method)existing.method=item.method;
    if(existing&&item.targetId){existing.targetId=item.targetId;existing.targetName=item.targetName;}
    if(existing&&item.condition)existing.condition=item.condition;
  }
  const merged:Intent[]=[...selected];for(const action of actions)if(!merged.includes(action.intent))merged.push(action.intent);
  conflicts.push(...inspectActionPlan(merged).conflicts);
  const recognized=mentions.map(item=>item.word);
  const residual=clean.replace(/先|再|然後|之後|接著|並且|而後|若|如果|假使|仍在場|人在場|時|就|則|今日|明日|我想|我要|請|先去|到|前往|以|方式|並|同時|、|，|。|；|！|？|\s/g,'');
  const knownWords=[...recognized,...targets.map(target=>target.name)];let remaining=residual;for(const word of knownWords)remaining=remaining.replaceAll(word,'');
  if(remaining.length>0&&mentions.length===0)unsupported.push(`這段文字含有尚未支援的行動「${clean}」；不會推進時間或消耗資源。`);
  else if(remaining.length>2&&mentions.length>0)questions.push(`已辨識行動，但「${remaining}」尚未轉成可驗證條件。請確認只執行候選行動，或返回修改文字。`);
  if(!selected.length&&!actions.length&&!unsupported.length)questions.push('目前無法可靠辨識可結算的行動；可改用四項行動或只保存備註。');
  const understood=actions.length?actions.map((action,index)=>`${index+1}. ${action.intent}${action.targetName?`（目標：${action.targetName}）`:''}${action.method?`・方式：${action.method}`:''}${action.condition?`・條件：${action.condition}`:''}`).join('；'):'沒有可結算的文字行動';
  return{actions,conflicts,questions:[...new Set(questions)],unsupported:[...new Set(unsupported)],understood,needsConfirmation:true};
}

export function validateFreeTextCandidate(candidate:FreeTextCandidate,selected:Intent[],targets:ActionTarget[]):void{
  const all=[...selected,...candidate.actions.map(action=>action.intent)];
  if(candidate.questions.length||candidate.unsupported.length)throw new Error('自由文字行動仍有待澄清或未支援內容');
  const invalid=candidate.actions.some(action=>!INTENTS.includes(action.intent)||action.order<1||action.targetId&&!targets.some(target=>target.id===action.targetId&&target.alive&&target.name===action.targetName)||action.intent==='訪求人才'&&action.targetId&&!targets.some(target=>target.id===action.targetId&&target.recruitable)||action.intent==='遊歷鄉里'&&action.targetId&&!targets.some(target=>target.id===action.targetId&&target.present));
  if(invalid)throw new Error('自由文字候選行動未通過規則驗證');
  const conflicts=inspectActionPlan([...new Set(all)]).conflicts;
  if(conflicts.length)throw new Error(conflicts.join(' '));
}

export async function interpretWithConfiguredProvider(text:string,selected:Intent[],targets:ActionTarget[],signal:AbortSignal):Promise<FreeTextCandidate>{
  const local=()=>interpretFreeText(text,selected,targets);
  try{
    const health=await fetch('/api/health',{signal});if(!health.ok)throw new Error('無法確認行動解析服務狀態');
    const status=await health.json() as {provider?:string};
    if(!['openai','chatgpt'].includes(status.provider??''))return {...local(),interpretationSource:'本機確定性解析（mock 模式）'};
    const response=await fetch('/api/interpret',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({text,selectedIntents:selected,targets})});
    const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(typeof result.error==='string'?result.error:`解析服務回應 ${response.status}`);
    if(!result||typeof result!=='object'||Object.keys(result).some(key=>!['actions','questions','unsupported','unparsedText'].includes(key))||!Array.isArray(result.actions)||!Array.isArray(result.questions)||!Array.isArray(result.unsupported)||typeof result.unparsedText!=='string')throw new Error('供應者行動解析格式無效');
    const actions:ResolvedFreeAction[]=result.actions.map((item:Record<string,unknown>)=>{
      if(typeof item.intent!=='string'||!INTENTS.includes(item.intent as Intent)||!Number.isInteger(item.order))throw new Error('供應者提出無效意圖候選');
      const action:ResolvedFreeAction={intent:item.intent as Intent,order:item.order as number};
      if(item.targetId!==null&&item.targetId!==undefined){if(typeof item.targetId!=='string'||typeof item.targetName!=='string')throw new Error('供應者提出無效目標');const target=targets.find(entry=>entry.id===item.targetId&&entry.name===item.targetName&&entry.alive);if(!target)throw new Error('供應者提出不在允許目標清單中的人物');action.targetId=target.id;action.targetName=target.name;}
      else if(item.targetName!==null&&item.targetName!==undefined)throw new Error('供應者提供了沒有對應人物識別碼的目標');
      if(item.method!==null&&item.method!==undefined){if(typeof item.method!=='string'||item.method.length>50)throw new Error('供應者提出無效方式');action.method=item.method;}
      if(item.condition!==null&&item.condition!==undefined){if(item.condition!=='目標仍在場'||!action.targetId||!targets.some(target=>target.id===action.targetId&&target.present))throw new Error('供應者提出無法驗證的行動條件');action.condition='目標仍在場';}
      return action;
    });
    if(result.questions.some((value:unknown)=>typeof value!=='string')||result.unsupported.some((value:unknown)=>typeof value!=='string'))throw new Error('供應者回傳無效澄清內容');
    const questions=[...result.questions];if(result.unparsedText.trim())questions.push(`尚未解析的文字：「${result.unparsedText.trim()}」；請澄清，或選擇只執行已勾選行動。`);
    const conflicts=inspectActionPlan([...selected,...actions.map(action=>action.intent)]).conflicts;
    const understood=actions.length?actions.slice().sort((a,b)=>a.order-b.order).map(action=>`${action.order}. ${action.intent}${action.targetName?`（目標：${action.targetName}）`:''}${action.method?`・方式：${action.method}`:''}${action.condition?`・條件：${action.condition}`:''}`).join('；'):'沒有可結算的文字行動';
    return {actions,conflicts,questions,unsupported:result.unsupported,understood,needsConfirmation:true,interpretationSource:'OpenAI 結構化候選（仍待玩家確認）'};
  }catch(error){
    if(signal.aborted)throw error;
    const candidate=local();candidate.interpretationSource=`本機確定性回退（AI 解析失敗：${error instanceof Error?error.message:'未知錯誤'}）`;return candidate;
  }
}

