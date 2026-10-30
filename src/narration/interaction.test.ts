import {afterEach,describe,expect,it,vi} from 'vitest';
import {createOpeningFacts,dispatch,ENGINE_VERSION} from '../engine';
import {HISTORY_CONTENT} from '../phase4';
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
  it('逐年核對孫權 182–252 年問答，只列有來源節點或明示缺口',async()=>{
    const current=state(),fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);const before=structuredClone(current);
    for(let year=182;year<=252;year++){
      const result=await understandInput(`孫權在 ${year} 年做了什麼？`,current,new AbortController().signal);
      expect(result).toMatchObject({kind:'question',source:'已核對的遊戲年表'});
      const records=HISTORY_CONTENT.filter(item=>!item.retired&&item.kind==='event'&&item.source.startsWith('《')&&item.startYear<=year&&item.endYear>=year&&/(孫權|孫仲謀)/.test(`${item.title} ${item.description} ${item.source}`));
      if(records.length){for(const record of records)expect(result.answer).toContain(record.title);}
      else expect(result.answer).toContain('未收錄');
      if(year===225)expect(result.answer).toContain('孫權在位期間：孫邵去世、顧雍繼任吳丞相');
      if(year===230)expect(result.answer).toContain('孫權遣衛溫、諸葛直浮海求夷洲');
      if(year===231)expect(result.answer).toContain('孫權遣潘濬率眾征武陵');
      if(year===235)expect(result.answer).toContain('孫權遣呂岱討伐廬陵李桓等');
      if(year===197)expect(result.answer).toContain('不表示該年沒有事情發生');
      if(year===220){expect(result.answer).not.toContain('魏文帝受禪');expect(result.answer).not.toContain('稱藩');expect(result.answer).not.toContain('征張繡');}
    }
    expect(fetchMock).not.toHaveBeenCalled();expect(current).toEqual(before);expect(current.turn).toBe(0);expect(current.world.year).toBe(184);
  });
  it('孫權生平問題用有來源的精度回答；未記載的日常不送模型也不推進時間',async()=>{
    const current=state(),before=structuredClone(current),fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
    const office=await understandInput('孫權幾歲任陽羨長？',current,new AbortController().signal);
    expect(office).toMatchObject({kind:'question',source:'《三國志》卷四十七〈吳主傳〉'});expect(office.answer).toContain('年十五');expect(office.answer).toContain('不將年齡反推成特定年份');
    const undatedOffice=await understandInput('孫權幾歲任奉義校尉？',current,new AbortController().signal);
    expect(undatedOffice.answer).toContain('不能把十五歲套用到它們');
    const earlyOffices=await understandInput('孫權早年做過哪些官？',current,new AbortController().signal);
    expect(earlyOffices.answer).toContain('行奉義校尉');
    const lifespan=await understandInput('孫權幾歲去世？',current,new AbortController().signal);
    expect(lifespan).toMatchObject({kind:'question',source:'《三國志》卷四十八〈吳書·三嗣主傳〉'});expect(lifespan.answer).toContain('時年七十一');
    const routine=await understandInput('孫權每天幾時小便出恭？',current,new AbortController().signal);
    expect(routine).toMatchObject({kind:'question',source:'《三國志》卷四十七〈吳主傳〉；日常細節未記載'});expect(routine.answer).toContain('我不能用模擬補造時辰或行程');
    for(const text of ['孫權平時作息如何？','孫權平常的生活習慣是什麼？','孫權活著的71年裡每天每日幾時幾刻小便出恭？','孫權一天上幾次大號？','孫仲謀早上方便幾時？','孫權夜裡幾點解手？','孫權小號時間是什麼？','孫權每天幾點睡覺？']){
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
  it('對話請求只帶同一人物最近四次、每句最多 240 字的前文',async()=>{
    const current=state(),history=[
      ...Array.from({length:5},(_,index)=>({speakerId:'example-clerk',speakerName:'縣亭佐吏',playerText:`舊問${index}。`.padEnd(260,'問'),npcText:`舊答${index}。`.padEnd(260,'答')})),
      {speakerId:'opening-father',speakerName:'父親',playerText:'父親的私下談話',npcText:'不應送給佐吏'},
    ];
    const fetchMock=vi.fn(async(_input:RequestInfo|URL,init?:RequestInit)=>{
      const payload=JSON.parse(String(init?.body));
      expect(payload.history).toHaveLength(8);
      expect(payload.history[0].text).toMatch(/^舊問1。問+…$/);
      expect(payload.history[0].text).toHaveLength(240);
      expect(payload.history.every((turn:{text:string})=>turn.text.length<=240)).toBe(true);
      expect(JSON.stringify(payload)).not.toContain('父親的私下談話');
      expect(JSON.stringify(payload).length).toBeLessThanOrEqual(5600);
      return new Response(JSON.stringify({speakerId:'example-clerk',text:'我只記得與你談過的事。'}),{status:200,headers:{'Content-Type':'application/json'}});
    });vi.stubGlobal('fetch',fetchMock);
    const result=await understandInput('對縣亭佐吏說：請接續上次的話。',current,new AbortController().signal,history);
    expect(result.kind).toBe('dialogue');expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('玩家本次對話超過 1,200 字時不呼叫服務且不改變狀態',async()=>{
    const current=state(),before=structuredClone(current),fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
    const result=await understandInput(`對縣亭佐吏說：${'請聽我說。'.repeat(241)}`,current,new AbortController().signal);
    expect(result).toMatchObject({kind:'dialogue',source:'對話長度檢查'});
    expect(result.answer).toContain('沒有呼叫對話服務或保存內容');
    expect(fetchMock).not.toHaveBeenCalled();expect(current).toEqual(before);
  });
  it('送往對話服務的是主角實際年齡及關係粗略分檔，不含原始關係數值',async()=>{
    const base=state();
    const current={...base,world:{...base.world,year:185,month:6},character:{...base.character,birthYear:184},phase2:{...base.phase2!,relationships:base.phase2!.relationships.map(record=>record.personId==='example-clerk'?{...record,trust:82,loyalty:20,fear:75}:record)}};
    const fetchMock=vi.fn(async(_input:RequestInfo|URL,init?:RequestInit)=>{
      const payload=JSON.parse(String(init?.body));
      expect(payload.protagonist).toMatchObject({age:1,ageMonths:5});
      expect(payload.relationship).toEqual({trust:'信任較高',loyalty:'忠誠較低',fear:'畏懼較高'});
      expect(JSON.stringify(payload)).not.toMatch(/(?:82|20|75)/);
      return new Response(JSON.stringify({speakerId:'example-clerk',text:'請你再說明今日所指何事。'}),{status:200,headers:{'Content-Type':'application/json'}});
    });vi.stubGlobal('fetch',fetchMock);
    const result=await understandInput('對縣亭佐吏說：我想請教一件事。',current,new AbortController().signal);
    expect(result).toMatchObject({kind:'dialogue',speakerId:'example-clerk'});expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
