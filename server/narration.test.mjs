import {describe,it,expect} from 'vitest';
import {mockNarration,openAiNarration,validateNarrationOutput,validateNarrationPayload} from './narration.mjs';

const payload={eventBatchId:'event-1',settledEvents:[{turn:1,title:'經商營生',details:'市集營生收入錢 5'}],playerView:{location:'家宅',trend:'僅玩家可見的天下消息',knownFacts:[]},visibleNpcs:[{id:'person-1',name:'示例人物',age:20,office:'白身',present:true,knownFacts:['親眼所見市集往來']}]};
describe('第五階段・伺服器敘事代理',()=>{
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
});
