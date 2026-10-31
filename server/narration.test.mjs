import {describe,it,expect} from 'vitest';
import {mockNarration,openAiInterpretation,openAiNarration,validateInterpretationOutput,validateNarrationOutput,validateNarrationPayload} from './narration.mjs';

const payload={eventBatchId:'event-1',settledEvents:[{turn:1,title:'經商營生',details:'市集營生收入錢 5'}],playerView:{location:'家宅',trend:'僅玩家可見的天下消息',knownFacts:[]},visibleNpcs:[{id:'person-1',name:'示例人物',age:20,office:'白身',present:true,knownFacts:[{turn:1,observation:'親見市集',facts:['親眼所見市集往來']}]}]};
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
    const result=await openAiNarration(payload,{apiKey:'test-only',fetchImpl:async(_url,options)=>{const {instructions}=JSON.parse(options.body);expect(instructions).toContain('沒有條件就寫正劇');expect(instructions).toContain('不得臆造人物動機、誤讀、成本、傳聞、記憶');expect(instructions).toContain('同類回彈需要輸入中有相關前情');expect(instructions).toContain('按 turn 排列的已保存觀察紀錄');expect(instructions).toContain('不能推導消息已傳給他人');expect(instructions).toContain('嚴肅傷亡與創傷保留重量');return new Response(JSON.stringify({output_text:JSON.stringify(mockNarration(payload))}),{status:200});}});
    expect(result).toEqual(mockNarration(payload));
  });
  it('v3.17 戰場演出遵循已結算因果，非殺傷行動不追加傷亡',async()=>{
    const battle={...payload,settledEvents:[{turn:7,title:'霸者橫攔・撼陣',details:'引擎記錄：敵軍隊形受撼、士氣下降、軍令中斷；未虛構傷亡。主角所在位置：渡口北側。'}]};
    const result=await openAiNarration(battle,{apiKey:'test-only',fetchImpl:async(_url,options)=>{const {instructions,input}=JSON.parse(options.body);expect(instructions).toContain('先交代有形危險及相對位置');expect(instructions).toContain('用不同遠近鏡頭呈現逐拍轉折');expect(instructions).toContain('具體描寫其血腥後果');expect(instructions).toContain('把每一環連回戰術目的');expect(instructions).toContain('按主角與各目擊者的視距分開呈現反應');expect(instructions).toContain('區分殺傷與非殺傷');expect(instructions).toContain('讓傷亡、救護、軍械與其他已知後效和結算帳一致');expect(instructions).toContain('不得為滿足文風而補造物件、位置、因果、目擊、傷亡或後效');expect(instructions).toContain('資料沒有提供某項細節時');expect(instructions).toContain('未由引擎結算的觸發、效果與受影響者不得寫成已發生');expect(instructions).toContain('不得憑空增加危險物件、連鎖、傷亡');expect(instructions).toContain('明確非殺傷的萬解、繳械、投降者、平民與未參戰者');expect(JSON.parse(input).settledEvents[0].details).toContain('未虛構傷亡');return new Response(JSON.stringify({output_text:JSON.stringify(mockNarration(battle))}),{status:200});}});
    expect(result).toEqual(mockNarration(battle));
  });
  it('觀察回憶帶回合與明確知情內容；拒絕未知欄位與缺失時間',()=>{
    expect(()=>validateNarrationPayload(payload)).not.toThrow();
    expect(()=>validateNarrationPayload({...payload,visibleNpcs:[{...payload.visibleNpcs[0],knownFacts:[{turn:1,observation:'親見市集',facts:['親眼所見市集往來'],unknown:['未曾得知'] }]}]})).toThrow('個別知識');
    expect(()=>validateNarrationPayload({...payload,playerView:{...payload.playerView,knownFacts:[{observation:'缺少回合',facts:['某事']} ]}})).toThrow('玩家視野');
  });
  it('NPC 對話可用自己的觀察，但不能照搬只屬於主角的觀察',()=>{
    const ids=validateNarrationPayload(payload);
    expect(()=>validateNarrationOutput({paragraphs:[],dialogue:[{speakerId:'person-1',text:'我親眼所見市集往來'}],suggestions:[]},ids,payload)).not.toThrow();
    const privatePayload={...payload,playerView:{...payload.playerView,knownFacts:[{turn:2,observation:'主角獨自所得',facts:['主角私下得知的密報代碼']} ]}};
    const privateIds=validateNarrationPayload(privatePayload);
    expect(()=>validateNarrationOutput({paragraphs:[],dialogue:[{speakerId:'person-1',text:'主角私下得知的密報代碼'}],suggestions:[]},privateIds,privatePayload)).toThrow('洩漏');
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

