import {describe,it,expect} from 'vitest';
import {createNarrationServer} from './index.mjs';

const sample={eventBatchId:'integration-event',settledEvents:[{turn:1,title:'市集營生',details:'收入錢 5'}],playerView:{location:'家宅',trend:'天下消息只供玩家查看',knownFacts:[]},visibleNpcs:[]};
describe('第五階段 HTTP mock 整合',()=>{
  it('health、mock narration 與相同批次重試可用，不產生遊戲副作用',async()=>{
    const server=createNarrationServer({provider:'mock'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('test server did not bind');const root=`http://127.0.0.1:${address.port}`;
    try{
      expect(await (await fetch(`${root}/api/health`)).json()).toMatchObject({ok:true,provider:'mock'});
      const first=await fetch(`${root}/api/narration`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sample)});const result=await first.json();expect(first.status).toBe(200);expect(result.paragraphs[0]).toContain('收入錢 5');
      const retry=await fetch(`${root}/api/narration`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sample)});expect(await retry.json()).toEqual(result);
    }finally{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
  });
  it('同一事件批次併發重試只送出一次供應者請求',async()=>{
    let calls=0;const output={paragraphs:['收入錢 5 已記錄'],dialogue:[],suggestions:[]};const fakeFetch=async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,40));return new Response(JSON.stringify({output_text:JSON.stringify(output)}),{status:200,headers:{'Content-Type':'application/json'}});};
    const server=createNarrationServer({provider:'openai',apiKey:'test-only',fetchImpl:fakeFetch});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('test server did not bind');const url=`http://127.0.0.1:${address.port}/api/narration`;
    try{const post=()=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sample)});const [a,b]=await Promise.all([post(),post()]);expect(a.status).toBe(200);expect(b.status).toBe(200);expect(calls).toBe(1);}finally{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
  });
});
