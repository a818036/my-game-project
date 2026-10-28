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
