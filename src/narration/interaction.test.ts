import {afterEach,describe,expect,it,vi} from 'vitest';
import {createOpeningFacts,dispatch,ENGINE_VERSION} from '../engine';
import {understandInput} from './interaction';

function state(){
  const facts=createOpeningFacts(19,184,{regions:[],surnames:[]});
  const base=dispatch(null,{version:ENGINE_VERSION,commandId:'dialogue-start',expectedRevision:0,type:'StartGame',name:'主角',seed:19,facts}).state!;
  const people=base.phase2!.persons.map(person=>person.id==='example-clerk'?{...person,name:'縣亭佐吏',role:'縣亭佐吏'}:person);
  people.push({id:'opening-father',name:'父親',role:'父親',birthYear:159,deathYear:null,alive:true,office:'白身',gender:'男'},{id:'opening-mother',name:'母親',role:'母親',birthYear:160,deathYear:null,alive:true,office:'白身',gender:'女'});
  return {...base,trend:'玩家才知道的天下來報',phase2:{...base.phase2!,persons:people,scene:{...base.phase2!.scene,presentIds:['protagonist','example-clerk','opening-father']},observations:[{id:'clerk-observation',witnessId:'example-clerk',turn:1,observation:'親見庭院',known:['今日家中有人來訪'],unknown:['主角所知的天下消息']}]}};
}
afterEach(()=>vi.unstubAllGlobals());
describe('即時人物對話',()=>{
  it('明確指定在場人物後由對話端點回話，回合與遊戲資料不變',async()=>{
    const current=state(),before=structuredClone(current),fetchMock=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
      expect(String(input)).toBe('/api/dialogue');const payload=JSON.parse(String(init?.body));
      expect(payload.npc).toMatchObject({id:'example-clerk',knownFacts:['今日家中有人來訪']});
      expect(JSON.stringify(payload)).not.toContain('玩家才知道的天下來報');expect(JSON.stringify(payload)).not.toContain('主角所知的天下消息');
      return new Response(JSON.stringify({speakerId:'example-clerk',text:'佐吏拱手答道：「今日有人來訪。」'}),{status:200,headers:{'X-Narration-Provider':'chatgpt','Content-Type':'application/json'}});
    });vi.stubGlobal('fetch',fetchMock);
    const result=await understandInput('對縣亭佐吏說：今日家中有何事？',current,new AbortController().signal);
    expect(result).toMatchObject({kind:'dialogue',speakerName:'縣亭佐吏',answer:'佐吏拱手答道：「今日有人來訪。」',source:'ChatGPT 訂閱對話'});
    expect(fetchMock).toHaveBeenCalledTimes(1);expect(current).toEqual(before);expect(current.turn).toBe(0);
  });
  it('不明確或不在場的對象不呼叫模型',async()=>{
    const current=state(),fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
    const unclear=await understandInput('「你好」',current,new AbortController().signal);expect(unclear.answer).toContain('縣亭佐吏');expect(fetchMock).not.toHaveBeenCalled();
    const absent=await understandInput('對母親說：你好',current,new AbortController().signal);expect(absent.answer).toContain('目前不在場');expect(fetchMock).not.toHaveBeenCalled();
  });
  it('玩家詢問指定年份的史實時直接引用年表，不必連線模型或推進回合',async()=>{
    const current=state(),fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
    const result=await understandInput('西元 206 年發生了什麼事？',current,new AbortController().signal);
    expect(result).toMatchObject({kind:'question',source:'已核對的遊戲年表'});expect(result.answer).toContain('高幹敗走與壺關平定');expect(result.answer).toContain('《三國志》卷一');expect(fetchMock).not.toHaveBeenCalled();expect(current.turn).toBe(0);expect(current.world.year).toBe(184);
  });
  it('指定人物詢問未收錄年份時明說資料缺口，不拿其他事件代答',async()=>{
    const current=state(),fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
    const result=await understandInput('孫權在 197 年做了什麼？',current,new AbortController().signal);
    expect(result).toMatchObject({kind:'question',source:'已核對的遊戲年表'});expect(result.answer).toContain('未收錄');expect(result.answer).toContain('不表示該年沒有事情發生');expect(result.answer).not.toContain('征張繡');
    expect(fetchMock).not.toHaveBeenCalled();expect(current.turn).toBe(0);expect(current.world.year).toBe(184);
  });
  it('孫權生平問題用有來源的精度回答；未記載的日常不送模型也不推進時間',async()=>{
    const current=state(),before=structuredClone(current),fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
    const office=await understandInput('孫權幾歲任陽羨長？',current,new AbortController().signal);
    expect(office).toMatchObject({kind:'question',source:'《三國志》卷四十七〈吳主傳〉'});expect(office.answer).toContain('年十五');expect(office.answer).toContain('不換算成某一年的觸發事件');
    const lifespan=await understandInput('孫權幾歲去世？',current,new AbortController().signal);
    expect(lifespan).toMatchObject({kind:'question',source:'《三國志》卷四十八〈吳書·三嗣主傳〉'});expect(lifespan.answer).toContain('時年七十一');
    const routine=await understandInput('孫權每天幾時小便出恭？',current,new AbortController().signal);
    expect(routine).toMatchObject({kind:'question',source:'《三國志》卷四十七〈吳主傳〉；日常細節未記載'});expect(routine.answer).toContain('我不能用模擬補造時辰或行程');
    for(const text of ['孫權平時作息如何？','孫權平常的生活習慣是什麼？']){
      const variant=await understandInput(text,current,new AbortController().signal);
      expect(variant).toMatchObject({kind:'question',source:'《三國志》卷四十七〈吳主傳〉；日常細節未記載'});
    }
    expect(fetchMock).not.toHaveBeenCalled();expect(current).toEqual(before);expect(current.turn).toBe(0);
  });
  it('重大能力救援、戰爭與主權指令走專用入口，不送到模型或轉成生活行動',async()=>{
    const current=state(),fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
    const result=await understandInput('請直接治療已經死亡的孫堅，並批准永久割讓潁川郡。',current,new AbortController().signal);
    expect(result).toMatchObject({kind:'unclear',choiceIds:[],source:'重大操作保護'});expect(result.answer).toContain('沒有建立任何行動候選');expect(fetchMock).not.toHaveBeenCalled();expect(current.turn).toBe(0);
    const question=await understandInput('可以用天生技救援孫堅嗎？',current,new AbortController().signal);
    expect(question).toMatchObject({kind:'question',choiceIds:[],source:'重大操作專用入口'});expect(fetchMock).not.toHaveBeenCalled();
  });
  it('同一在場人物的後續對話只帶入該人物最近的短期交談前文',async()=>{
    const current=state(),history=[{speakerId:'example-clerk',speakerName:'縣亭佐吏',playerText:'今日可好？',npcText:'今日尚好。'}];
    const fetchMock=vi.fn(async(_input:RequestInfo|URL,init?:RequestInit)=>{
      const payload=JSON.parse(String(init?.body));expect(payload.history).toEqual([{role:'player',text:'今日可好？'},{role:'npc',text:'今日尚好。'}]);
      expect(JSON.stringify(payload)).not.toContain('opening-father');
      return new Response(JSON.stringify({speakerId:'example-clerk',text:'尚可。'}),{status:200,headers:{'X-Narration-Provider':'chatgpt','Content-Type':'application/json'}});
    });vi.stubGlobal('fetch',fetchMock);
    const result=await understandInput('對縣亭佐吏說：那你近來忙些什麼？',current,new AbortController().signal,history);
    expect(result).toMatchObject({kind:'dialogue',speakerId:'example-clerk',speakerName:'縣亭佐吏',answer:'尚可。'});expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
