import {describe,it,expect} from 'vitest';
import {mockNarration,openAiInterpretation,openAiNarration,validateInterpretationOutput,validateNarrationOutput,validateNarrationPayload} from './narration.mjs';

const payload={eventBatchId:'event-1',settledEvents:[{turn:1,title:'經商營生',details:'市集營生收入錢 5'}],playerView:{location:'家宅',trend:'僅玩家可見的天下消息',knownFacts:[]},visibleNpcs:[{id:'person-1',name:'示例人物',age:20,office:'白身',present:true,knownFacts:['親眼所見市集往來']}]};
describe('第五階段・伺服器敘事代理',()=>{
  it('年齡上下文可驗證且不漏過額外秘密欄位；空 output_text 仍可讀取正式 output',async()=>{
    const current={...payload,protagonist:{name:'主角',age:0,ageMonths:2,birthYear:184,modernMemory:true}};
    expect(()=>validateNarrationPayload(current)).not.toThrow();
    expect(()=>validateNarrationPayload({...current,protagonist:{...current.protagonist,secret:'hidden'}})).toThrow('年齡');
    const output={paragraphs:['主角 0 歲 2 個月。'],dialogue:[],suggestions:[]};
    expect(validateNarrationOutput(output,validateNarrationPayload(current),current)).toEqual(output);
    const result=await openAiNarration(current,{apiKey:'test-only',fetchImpl:async(_url,options)=>{expect(JSON.parse(options.body).instructions).toContain('不等於身體成年');return new Response(JSON.stringify({output_text:'',output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]}));}});
    expect(result).toEqual(output);
  });
  it('v3.16 喜劇文風只在有根據時啟用，保留記憶、悲劇與資訊防火牆',async()=>{
    const result=await openAiNarration(payload,{apiKey:'test-only',fetchImpl:async(_url,options)=>{const {instructions}=JSON.parse(options.body);expect(instructions).toContain('沒有條件就寫正劇');expect(instructions).toContain('不得臆造人物動機、誤讀、成本、傳聞、記憶');expect(instructions).toContain('同類回彈需要輸入中有相關前情');expect(instructions).toContain('嚴肅傷亡與創傷保留重量');return new Response(JSON.stringify({output_text:JSON.stringify(mockNarration(payload))}),{status:200});}});
    expect(result).toEqual(mockNarration(payload));
  });
  it('只把保存的主角回憶作為私人敘事上下文，NPC 不得引用',async()=>{
    const remembered={...payload,protagonistMemory:[{turn:3,title:'庭院讀書舊事',details:'主角曾讀完一卷兵書'}]};
    expect(()=>validateNarrationPayload(remembered)).not.toThrow();
    expect(()=>validateNarrationPayload({...remembered,protagonistMemory:[{turn:-1,title:'x',details:'y'}]})).toThrow('主角回憶');
    const output={paragraphs:['主角想起庭院讀書舊事。'],dialogue:[],suggestions:[]};
    const result=await openAiNarration(remembered,{apiKey:'test-only',fetchImpl:async(_url,options)=>{expect(JSON.parse(options.body).instructions).toContain('protagonistMemory 是由已保存、玩家確認行動紀錄');return new Response(JSON.stringify({output_text:JSON.stringify(output)}),{status:200});}});
    expect(result).toEqual(output);
    const ids=validateNarrationPayload(remembered);
    expect(()=>validateNarrationOutput({paragraphs:[],dialogue:[{speakerId:'person-1',text:'我也記得庭院讀書舊事'}],suggestions:[]},ids,remembered)).toThrow('洩漏');
  });
  it('mock 只根據已結算事件形成範本且不洩漏玩家視野給人物',()=>{
    const ids=validateNarrationPayload(payload),output=validateNarrationOutput(mockNarration(payload),ids,payload);
    expect(output.paragraphs[0]).toContain('收入錢 5');
    expect(output.dialogue).toEqual([]);
  });
  it('拒絕不在場發言、虛構數字與未授權狀態修改欄位',()=>{
    const ids=validateNarrationPayload(payload);
    expect(()=>validateNarrationOutput({paragraphs:[],dialogue:[{speakerId:'not-here',text:'我來了'}],suggestions:[]},ids,payload)).toThrow('發言者');
    expect(()=>validateNarrationOutput({paragraphs:['本次折損 900 人'],dialogue:[],suggestions:[]},ids,payload)).toThrow('不存在');
    expect(()=>validateNarrationOutput({paragraphs:[],dialogue:[],suggestions:[],statePatch:{}},ids,payload)).toThrow('未授權');
    expect(()=>validateNarrationOutput({paragraphs:[],dialogue:[{speakerId:'person-1',text:'密報顯示：僅主角所知的天下暗線'}],suggestions:[]},ids,{...payload,playerView:{...payload.playerView,trend:'僅主角所知的天下暗線'}})).toThrow('洩漏');
  });
  it('OpenAI 代理有限重試服務端暫時錯誤，重試不接觸遊戲引擎',async()=>{
    let calls=0;const fake=async()=>{calls++;return calls===1?new Response('',{status:503}):new Response(JSON.stringify({output_text:JSON.stringify(mockNarration(payload))}),{status:200,headers:{'Content-Type':'application/json'}});};
    const before=structuredClone(payload);const result=await openAiNarration(payload,{apiKey:'test-only',signal:new AbortController().signal,fetchImpl:fake});
    expect(calls).toBe(2);expect(result).toEqual(mockNarration(payload));expect(payload).toEqual(before);
  });
  it('取消訊號傳給 provider；相同 eventBatchId 可供安全重試而不重新結算',async()=>{
    const controller=new AbortController();controller.abort();let caught=false;
    try{await openAiNarration(payload,{apiKey:'test-only',signal:controller.signal,fetchImpl:async(_url,options)=>{expect(options.signal.aborted).toBe(true);throw new Error('aborted');}});}catch{caught=true;}
    expect(caught).toBe(true);expect(payload.eventBatchId).toBe('event-1');
  });
  it('OpenAI 結構化行動解析只回傳白名單候選，不呼叫遊戲規則或修改狀態',async()=>{
    const actionPayload={text:'先讀兵書，再到市集做生意',selectedIntents:[],targets:[]};
    const candidate={actions:[{intent:'耕讀自持',order:1,targetId:null,targetName:null,method:'讀兵書',condition:null},{intent:'經商營生',order:2,targetId:null,targetName:null,method:'做生意',condition:null}],questions:[],unsupported:[],unparsedText:''};
    let request;
    const result=await openAiInterpretation(actionPayload,{apiKey:'test-only',fetchImpl:async(_url,options)=>{request=JSON.parse(options.body);return new Response(JSON.stringify({output_text:JSON.stringify(candidate)}),{status:200});}});
    expect(result).toEqual(candidate);expect(request.text.format.name).toBe('shenzhou_action_candidate');expect(request.input).toContain(actionPayload.text);expect(request.max_output_tokens).toBe(900);
    const allowed=new Map();expect(()=>validateInterpretationOutput({...candidate,actions:[{...candidate.actions[0],intent:'永久割地'}]},allowed)).toThrow('未允許');
  });
});

