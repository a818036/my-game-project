import type {GameState,Intent} from './engine';

export interface LifeChoice {id:string;label:string;description:string;days:number;growth:'study'|'practice'|'social'|null;intent?:Intent;}
// Versioned prototype policy, not biological or canonical ability limits.
export const LIFE_POLICY_VERSION=1;
export function currentAge(state:GameState){return Math.max(0,state.world.year-state.character.birthYear);}
export function lifeStage(age:number){return age<2?'嬰幼兒':age<6?'幼童':age<15?'少年學習期':'一般生活';}
export function lifeChoices(state:GameState):LifeChoice[]{
  const age=currentAge(state),location=state.phase2?.scene.location??state.character.home;
  if(age>=15)return [
    {id:'adult-study',label:'耕讀自持',description:'耕作讀書，依既有家計規則結算',days:30,growth:'study',intent:'耕讀自持'},
    {id:'adult-talent',label:'訪求人才',description:'尋訪地方人才，不保證招攬成功',days:7,growth:'social',intent:'訪求人才'},
    {id:'adult-trade',label:'經商營生',description:'市集交易，可能盈利或虧損',days:10,growth:'practice',intent:'經商營生'},
    {id:'adult-travel',label:'遊歷鄉里',description:'外出遊歷，依路程與盤纏結算',days:14,growth:'social',intent:'遊歷鄉里'}];
  return [
    {id:'observe',label:age<2?'觀察眼前':age<6?'辨認周遭':'觀察地方生活',description:`留在${location}，留心眼前的人與物，不獲得遠方情報`,days:1,growth:'study'},
    {id:'listen',label:age<2?'聆聽周遭':'聆聽與學習',description:'留心當場聲音；沒有對話時不虛構交談內容',days:1,growth:'social'},
    {id:'reflect',label:age<6?'整理記憶':'溫習所知',description:'回想已有知識，不憑空獲得材料、熟練技能或成熟五維',days:1,growth:'study'},
    {id:'rest',label:'安靜休息',description:'留在原處休息，不自動治癒傷病，也不讓他人代辦事情',days:1,growth:null}];
}
export function inspectLifePlan(state:GameState,ids:string[],paceDays=1):{choices:LifeChoice[];days:number;errors:string[]}{
  const age=currentAge(state),catalog=lifeChoices(state).map(c=>({...c,days:age<15?paceDays:c.days})),errors:string[]=[];
  if(![1,7,30,90].includes(paceDays)||age>=15&&paceDays!==1)errors.push('時間安排不符合目前情境。');
  if(!ids.length||ids.length>4||new Set(ids).size!==ids.length)errors.push('請選擇一至四個不重複項目。');
  const choices=ids.map(id=>catalog.find(c=>c.id===id)).filter((c):c is LifeChoice=>!!c);
  if(choices.length!==ids.length)errors.push('選項不符合目前年齡或情境，請重新選擇。');
  if(state.status!=='playing')errors.push('此段旅程已結束。');
  if(state.phase2?.persons.find(p=>p.id==='protagonist')?.alive===false)errors.push('主角已死亡，不能執行生活行動。');
  if(state.innate?.subjects.protagonist?.alive===false)errors.push('主角已死亡，不能執行生活行動。');
  return{choices,days:choices.reduce((n,c)=>n+c.days,0),errors};
}
export type InputKind='question'|'objection'|'dialogue'|'action'|'mixed'|'unclear';
export interface InteractionResult {kind:InputKind;answer:string;choiceIds:string[];questions:string[];source?:string;}
export function currentRulerFact(year:number):string|null{
  if(year>=168&&year<=188)return `西元 ${year} 年，東漢皇帝是漢靈帝劉宏（《後漢書·孝靈帝紀》）。`;
  if(year===189)return '西元 189 年內皇位數度更替：先是漢少帝劉辯即位，後為漢獻帝劉協。本原型只用年級史實與簡化月曆，無法據此判定模型中的當下是哪位皇帝。資料見《後漢書·孝靈帝紀》《孝獻帝紀》。';
  if(year>=190&&year<220)return `西元 ${year} 年，東漢皇帝是漢獻帝劉協（《後漢書·孝獻帝紀》）。`;
  return null;
}
export function answerKnownRulerQuestion(text:string,state:GameState):InteractionResult|null{
  const clean=text.trim();
  if(!/(皇帝|天子|君主)/.test(clean)||!/(誰|何人|哪位|是誰)/.test(clean)||/(然後|接著|再去)/.test(clean))return null;
  const fact=currentRulerFact(state.world.year);
  return {kind:'question',answer:fact??`目前是西元 ${state.world.year} 年；這份原型的史實年表尚未涵蓋該年的皇帝資料，我不臆測答案。`,choiceIds:[],questions:[]};
}
export function localInteraction(text:string,state:GameState):InteractionResult{
  const clean=text.trim(),catalog=lifeChoices(state);
  if((/[?？]/.test(clean)&&/然後|接著|再去/.test(clean))||/不要|先別|不去|不做|除非|如果|若是/.test(clean))return{kind:'mixed',answer:'這段話包含條件、否定或不同用途，需要先拆開確認，沒有執行任何一部分。',choiceIds:[],questions:['請先說明要查詢的問題，或單獨列出這次確定要做的行動。']};
  const rulerAnswer=answerKnownRulerQuestion(clean,state);if(rulerAnswer)return rulerAnswer;
  if(/幾歲|年齡|多大/.test(clean)&&!/(然後|接著|再去)/.test(clean))return {kind:/才|怎麼|為什麼|不合理/.test(clean)?'objection':'question',answer:`你目前 ${currentAge(state)} 歲 ${Math.max(0,state.world.month-1)} 個月。現代記憶不代表身體成年，普通生活選項會依當下階段安排；天生技仍依各自規則處理。`,choiceIds:[],questions:[]};
  if(/不合理|沒邏輯|有問題|怎麼會|為什麼/.test(clean))return{kind:'objection',answer:'這是對情境的質疑，並非行動指令。我會保留目前狀態；請指出不合理的人物、行動或結果。',choiceIds:[],questions:[]};
  if(/[?？]|能不能|可不可以|可以嗎|在哪|現在能|能做什麼/.test(clean))return{kind:'question',answer:`目前在${state.phase2?.scene.location??state.character.home}。可確認的生活選項：${catalog.map(c=>c.label).join('、')}。其他能力請使用天生技操作台；詢問不會執行已勾選行動。`,choiceIds:[],questions:[]};
  if(/^(對|向).*(說|問)|^「|^"/.test(clean))return{kind:'dialogue',answer:'已辨識為對話。這裡尚不直接代替 NPC 回話；請確認在場對象與想說的內容。對話不會被換成外出或經商。',choiceIds:[],questions:['目前先保留對話文字，未建立人物反應。']};
  const stripped=clean.replace(/^(我想|我要|請|我)/,'').replace(/[。！!\s]/g,'');
  const choices=catalog.filter(c=>stripped===c.label);
  if(choices.length===1)return{kind:'action',answer:'已辨識具體行動，確認後才執行。',choiceIds:choices.map(c=>c.id),questions:[]};
  return{kind:'unclear',answer:'目前無法可靠判斷這段話的意思，未執行任何行動。',choiceIds:[],questions:['請說明是在詢問、對話，還是要採取哪項行動。']};
}
