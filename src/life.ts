import type {GameState,Intent} from './engine';
import {HISTORY_CONTENT} from './phase4';

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
export interface InteractionResult {kind:InputKind;answer:string;choiceIds:string[];questions:string[];source?:string;speakerName?:string;speakerId?:string;playerText?:string;}
const sunQuanRoutinePattern=/(?:小便|大便|大小便|出恭|如廁|如厕|解手|入廁|入厕|上廁所|上厕所|廁所|厕所|茅廁|茅厕|便溺|排泄|尿尿|撒尿|拉屎|大號|大号|小號|小号|作息|起居|生活習慣|生活习惯|私生活|(?:何時|何时|幾時|几时|幾點|几点).{0,3}(?:方便|更衣)|(?:方便|更衣).{0,3}(?:時間|时间|時辰|时辰|幾時|几时|幾點|几点|幾次|几次)|早上.{0,4}(?:廁所|厕所|大小便|小便|大便|方便)|上午.{0,4}(?:廁所|厕所|大小便|小便|大便|方便)|中午.{0,4}(?:廁所|厕所|大小便|小便|大便|方便)|晚上.{0,4}(?:廁所|厕所|大小便|小便|大便|方便)|夜裡.{0,4}(?:廁所|厕所|大小便|小便|大便|方便)|一天.{0,5}(?:幾次|几次|幾回|几回)|(?:每天|每日|日常|平時|平时|平常).{0,8}(?:起床|睡覺|睡觉|就寢|就寝|吃飯|吃饭|用膳|上朝|入寢|入寝|休息|固定時間|固定时间))/;
function protectMajorAction(clean:string):InteractionResult|null{
  const mentionsMajor=/(天生技|死亡窗口|救援|救治|治療(?:.{0,8}(?:孫堅|亡者|死人|已故))?|復活|救活|調兵|出兵|攻城|戰役|永久割地|割地|割讓|條約|主權|宣告獨立|臣服)/.test(clean);
  if(!mentionsMajor)return null;
  if(/[?？]|能不能|可不可以|可否|如何|怎麼|是否|請問/.test(clean))return{kind:'question',answer:'天生技救援、戰爭和主權條約屬重大操作，請分別使用天生技操作台或軍政面板查看與確認；一般文字詢問不會替你批准或執行。',choiceIds:[],questions:[],source:'重大操作專用入口'};
  if(/使用|施展|治療|救治|復活|救活|救援|調兵|出兵|攻城|戰役|批准|同意|割地|割讓|簽訂|締結|臣服|獨立|命令|幫我|我要|我想|請/.test(clean))return{kind:'unclear',answer:'這段文字涉及天生技救援、戰爭或主權條約等重大操作，不能轉成一般生活行動，也沒有建立任何行動候選。請改用對應的天生技操作台或軍政面板。',choiceIds:[],questions:['你可以在專用介面查看條件並明確確認；這次文字不會推進時間或改變存檔。'],source:'重大操作保護'};
  return null;
}
export function currentRulerFact(year:number):string|null{
  if(year>=168&&year<=188)return `西元 ${year} 年，東漢皇帝是漢靈帝劉宏（《後漢書·孝靈帝紀》）。`;
  if(year===189)return '西元 189 年內皇位數度更替：先是漢少帝劉辯即位，後為漢獻帝劉協。本原型只用年級史實與簡化月曆，無法據此判定模型中的當下是哪位皇帝。資料見《後漢書·孝靈帝紀》《孝獻帝紀》。';
  if(year>=190&&year<220)return `西元 ${year} 年，東漢皇帝是漢獻帝劉協（《後漢書·孝獻帝紀》）。`;
  if(year===220)return '西元 220 年，漢獻帝劉協禪位於魏王曹丕，漢魏政權更替；本原型只記年級節點，不表示遊戲模型月對應禪代日期。資料見《三國志》卷二〈魏書·文帝紀〉。';
  if(year===221)return '西元 221 年，劉備於成都即皇帝位，建立蜀漢政權；本原型只記年級節點，不表示遊戲模型月對應即位日期。資料見《三國志》卷三十二〈蜀書·先主傳〉。';
  if(year===229)return '西元 229 年，孫權於南郊即皇帝位，建立孫吳帝制；本原型只記年級節點，不表示遊戲模型月對應即位日期。資料見《三國志》卷四十七〈吳主傳〉。';
  return null;
}
export function answerKnownRulerQuestion(text:string,state:GameState):InteractionResult|null{
  const clean=text.trim();
  if(!/(皇帝|天子|君主)/.test(clean)||!/(誰|何人|哪位|是誰)/.test(clean)||/(然後|接著|再去)/.test(clean))return null;
  const fact=currentRulerFact(state.world.year);
  return {kind:'question',answer:fact??`目前是西元 ${state.world.year} 年；這份原型的史實年表尚未涵蓋該年的皇帝資料，我不臆測答案。`,choiceIds:[],questions:[]};
}
export function answerKnownTrendQuestion(text:string,state:GameState):InteractionResult|null{
  if(!/(天下大勢|天下局勢|時局|政局|外面.{0,4}消息|最近.{0,4}消息)/.test(text))return null;
  return {kind:'question',answer:`目前畫面上的天下來報是：「${state.trend}」這是原型每回合更新的示例消息，不是完整史實資料；沒有提供更多遠方詳情。`,choiceIds:[],questions:[]};
}
export function answerKnownSunQuanBiographyQuestion(text:string):InteractionResult|null{
  const asksRoutine=sunQuanRoutinePattern.test(text);
  if(!/孫權|孫仲謀/.test(text)||!/(幾歲|年齡|多大|什麼時候|何時|哪一年|一生|生平|年表|完整經歷|七十一年|71年|職務|職位|官職|做過.{0,4}官|擔任|任過|任職)/.test(text)&&!asksRoutine)return null;
  if(asksRoutine)return {kind:'question',answer:'《三國志》卷四十七〈吳主傳〉保存的是孫權任官、政軍與外交等事件記載，不是逐日生活日誌；現有來源沒有記下他平時的起居作息，也沒有記錄每天何時如廁等細節。我不能用模擬補造時辰或行程。若你想看可核實的內容，我可以整理目前收錄的生平年表。',choiceIds:[],questions:[],source:'《三國志》卷四十七〈吳主傳〉；日常細節未記載'};
  if(/(?:孝廉|茂才|奉義校尉)/.test(text)&&/(幾歲|年齡|何時|哪一年|哪年|什麼時候)/.test(text))return {kind:'question',answer:'《三國志》卷四十七〈吳主傳〉同段記孫權年十五任陽羨長，並載郡察孝廉、州舉茂才、行奉義校尉；但未分別記後三者發生時的年齡或可換算公元年份，不能把十五歲套用到它們。',choiceIds:[],questions:[],source:'《三國志》卷四十七〈吳主傳〉'};
  if(/陽羨|任官|做官|當官|官職|職務|職位|做過.{0,4}官|擔任|任過|任職/.test(text))return {kind:'question',answer:'《三國志》卷四十七〈吳主傳〉記孫權年十五時任陽羨長，同段續載郡察孝廉、州舉茂才、行奉義校尉。原文沒有提供這些任官可換算的確切公元年份、月日或到任時刻，因此本原型不將年齡反推成特定年份，也不補造任官日期。',choiceIds:[],questions:[],source:'《三國志》卷四十七〈吳主傳〉'};
  if(/去世|逝世|死亡|享年/.test(text))return {kind:'question',answer:'《三國志》卷四十八〈吳書·三嗣主傳〉記孫權於 252 年去世，時年七十一。原文沒有記下確切月日；其約 182 年出生是依享年回推的年級推定。',choiceIds:[],questions:[],source:'《三國志》卷四十八〈吳書·三嗣主傳〉'};
  if(/一生|生平|年表|完整經歷|七十一年|71年/.test(text)){
    const records=HISTORY_CONTENT.filter(item=>!item.retired&&item.kind==='event'&&item.source.startsWith('《')&&item.startYear>=182&&item.endYear<=252&&/(孫權|孫仲謀)/.test(`${item.title} ${item.description} ${item.carrier} ${item.source}`)).sort((a,b)=>a.startYear-b.startYear||a.id.localeCompare(b.id));
    const chronology=records.map(item=>`${item.startYear}年${item.id==='sun-quan-inferred-birth-182'?'（約）':''}・${item.title}：${item.description}〔${item.source}〕`).join('\n');
    const coveredYears=new Set<number>();for(const item of records)for(let year=item.startYear;year<=item.endYear;year++)coveredYears.add(year);
    const missingRanges: Array<[number, number]> = [];for(let year=182;year<=252;year++){if(coveredYears.has(year))continue;const last=missingRanges.at(-1);if(last&&last[1]===year-1)last[1]=year;else missingRanges.push([year,year]);}
    const coverageGaps=missingRanges.map(([start,end])=>start===end?`${start}`:`${start}–${end}`).join('、')||'無';
    return {kind:'question',answer:`現有史料節點整理出孫權約 182 年至 252 年（享年七十一）的 ${records.length} 筆可考年級紀錄，分布於 ${coveredYears.size} 個年次：\n${chronology}\n\n目前索引未收錄孫權相關節點的年次：${coverageGaps}。這些是資料覆蓋缺口，不代表他當年沒有活動。\n\n另有一項不繫公元年的年齡記載：《三國志》卷四十七記孫權年十五時任陽羨長，同段續載郡察孝廉、州舉茂才、行奉義校尉；原文未給出這些任官可換算的公元年份或任官日期，故不列入上述年級節點。\n\n這是本遊戲目前收錄的來源節點，不是逐年完整傳記；原史未記的日常時辰也不能用模擬補成史實。`,choiceIds:[],questions:[],source:'《三國志》卷四十七、四十八及已核對的年表節點'};
  }
  return null;
}
export function answerKnownHistoricalEventQuestion(text:string,state:GameState):InteractionResult|null{
  if(!/(發生|事件|大事|史實|何事|什麼|哪些)/.test(text))return null;
  const explicitYear=text.match(/(?:西元|公元)?\s*([1-9]\d{2,3})\s*年/);
  const asksCurrentYear=/(今年|這年|這一年|目前這年|當年|現在這年)/.test(text);
  if(!explicitYear&&!asksCurrentYear)return null;
  const year=explicitYear?Number(explicitYear[1]):state.world.year;
  const records=HISTORY_CONTENT.filter(item=>!item.retired&&item.kind==='event'&&item.source.startsWith('《')&&item.startYear<=year&&item.endYear>=year&&(!/(孫權|孫仲謀)/.test(text)||/(孫權|孫仲謀)/.test(`${item.title} ${item.description} ${item.source}`)));
  if(/孫權|孫仲謀/.test(text)&&!records.length)return {kind:'question',answer:`目前內容包未收錄西元 ${year} 年有來源支持的孫權生平節點；這不表示該年沒有事情發生，我不以其他人物事件代答，也不臆測。`,choiceIds:[],questions:[]};
  const answer=records.length
    ? `西元 ${year} 年已收錄的史實年級節點：${records.map(item=>`${item.title}。${item.description} 資料：${item.source}`).join('；')}`
    : `目前年表尚未涵蓋西元 ${year} 年的具體史實；我不臆測。`;
  const yuanShuChronologyNote=year===197&&!/(孫權|孫仲謀)/.test(text)?' 另，《資治通鑑》卷六十二將袁術稱帝繫於建安二年（197）；《三國志》卷六則繫於興平二年冬（195）。本內容包將兩者視為同一事件的紀年異說，只在 195 年結算一次，不代表 197 年再次稱帝。':'';
  return {kind:'question',answer:`${answer}${yuanShuChronologyNote}`,choiceIds:[],questions:[]};
}
export function localInteraction(text:string,state:GameState):InteractionResult{
  const clean=text.trim(),catalog=lifeChoices(state);
  if(/^(?:(?:我)?(?:想要|想|要)\s*)?(對|向|跟|與).*(說|問|道|講|詢問|表示)|^「|^"/.test(clean))return{kind:'dialogue',answer:'已辨識為對話。',choiceIds:[],questions:[]};
  const major=protectMajorAction(clean);if(major)return major;
  if((/[?？]/.test(clean)&&/然後|接著|再去/.test(clean))||/不要|先別|不去|不做|除非|如果|若是/.test(clean))return{kind:'mixed',answer:'這段話包含條件、否定或不同用途，需要先拆開確認，沒有執行任何一部分。',choiceIds:[],questions:['請先說明要查詢的問題，或單獨列出這次確定要做的行動。']};
  const biographyAnswer=answerKnownSunQuanBiographyQuestion(clean);if(biographyAnswer)return biographyAnswer;
  const rulerAnswer=answerKnownRulerQuestion(clean,state);if(rulerAnswer)return rulerAnswer;
  if(/幾歲|年齡|多大/.test(clean)&&!/(然後|接著|再去)/.test(clean))return {kind:/才|怎麼|為什麼|不合理/.test(clean)?'objection':'question',answer:`你目前 ${currentAge(state)} 歲 ${Math.max(0,state.world.month-1)} 個月。現代記憶不代表身體成年，普通生活選項會依當下階段安排；天生技仍依各自規則處理。`,choiceIds:[],questions:[]};
  if(/不合理|沒邏輯|有問題|怎麼會|為什麼/.test(clean))return{kind:'objection',answer:'這是對情境的質疑，並非行動指令。我會保留目前狀態；請指出不合理的人物、行動或結果。',choiceIds:[],questions:[]};
  if(/[?？]|能不能|可不可以|可以嗎|在哪|現在能|能做什麼/.test(clean))return{kind:'question',answer:`目前在${state.phase2?.scene.location??state.character.home}。可確認的生活選項：${catalog.map(c=>c.label).join('、')}。其他能力請使用天生技操作台；詢問不會執行已勾選行動。`,choiceIds:[],questions:[]};
  const stripped=clean.replace(/^(我想|我要|我決定|我選擇|請幫我|幫我|請|我)/,'').replace(/^(先|去|做|進行)/,'').replace(/[。！!\s]/g,'');
  const choices=catalog.filter(c=>stripped===c.label||stripped===`一下${c.label}`||stripped===`去${c.label}`);
  if(choices.length===1)return{kind:'action',answer:'已辨識具體行動，確認後才執行。',choiceIds:choices.map(c=>c.id),questions:[]};
  return{kind:'unclear',answer:'目前無法可靠判斷這段話的意思，未執行任何行動。',choiceIds:[],questions:['請說明是在詢問、對話，還是要採取哪項行動。']};
}
