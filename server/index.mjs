import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {mockNarration,openAiNarration,validateNarrationOutput,validateNarrationPayload} from './narration.mjs';

try{for(const line of readFileSync('.env','utf8').split(/\r?\n/)){const match=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(match&&!match[1].startsWith('#')&&process.env[match[1]]===undefined)process.env[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2');}}catch{}
export function createNarrationServer(options={}){
const PROVIDER=options.provider??process.env.NARRATION_PROVIDER??'mock',MODEL=options.model??process.env.NARRATION_MODEL??'gpt-4.1-mini',API_KEY=options.apiKey??process.env.OPENAI_API_KEY,FETCH=options.fetchImpl??fetch,MAX_OUTPUT_TOKENS=Number(options.maxOutputTokens??process.env.NARRATION_MAX_OUTPUT_TOKENS??900);
if(!['mock','openai'].includes(PROVIDER))throw new Error('NARRATION_PROVIDER 僅支援 mock 或 openai');
if(!Number.isInteger(MAX_OUTPUT_TOKENS)||MAX_OUTPUT_TOKENS<128||MAX_OUTPUT_TOKENS>4000)throw new Error('NARRATION_MAX_OUTPUT_TOKENS 必須介於 128 與 4000');
const batches=new Map();
const inFlight=new Map();
return http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='GET'&&req.url==='/api/health'){res.writeHead(200);res.end(JSON.stringify({ok:true,provider:PROVIDER==='mock'?'mock':'openai',model:PROVIDER==='mock'?'mock':MODEL}));return;}
  if(req.method!=='POST'||req.url!='/api/narration'){res.writeHead(404);res.end(JSON.stringify({error:'找不到此 API'}));return;}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(new Error('敘事服務逾時')),30000);res.on('close',()=>{if(!res.writableEnded)controller.abort(new Error('玩家已取消敘事請求'));});
  let activeBatch,ownsBatch=false;
  try{
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>26000)throw new Error('敘事請求超過安全上限');}
    const payload=JSON.parse(raw),speakers=validateNarrationPayload(payload);activeBatch=payload.eventBatchId;
    const hash=createHash('sha256').update(raw).digest('hex'),previous=batches.get(payload.eventBatchId);if(previous){if(previous.hash!==hash)throw new Error('同一事件批次不可搭配不同敘事資料');res.writeHead(200);res.end(JSON.stringify(previous.result));return;}
    let pending=inFlight.get(payload.eventBatchId);
    if(pending&&pending.hash!==hash)throw new Error('同一事件批次已有不同內容的敘事請求');
    if(!pending){const promise=(async()=>{const candidate=PROVIDER==='openai'?await openAiNarration(payload,{apiKey:API_KEY,model:MODEL,maxOutputTokens:MAX_OUTPUT_TOKENS,signal:controller.signal,fetchImpl:FETCH}):mockNarration(payload);const result=validateNarrationOutput(candidate,speakers,payload);batches.set(payload.eventBatchId,{hash,result});if(batches.size>200)batches.delete(batches.keys().next().value);return result;})();pending={hash,promise};inFlight.set(payload.eventBatchId,pending);ownsBatch=true;}
    const result=await pending.promise;
    res.setHeader('X-Narration-Provider',PROVIDER);res.writeHead(200);res.end(JSON.stringify(result));
  }catch(error){const aborted=controller.signal.aborted;res.writeHead(aborted?504:400);res.end(JSON.stringify({error:aborted?'敘事請求已逾時或取消；已結算遊戲不受影響。':error instanceof Error?error.message:'敘事服務失敗'}));}
  finally{clearTimeout(timeout);if(activeBatch&&ownsBatch)inFlight.delete(activeBatch);}
});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
const PORT=Number(process.env.NARRATION_PORT??8787),PROVIDER=process.env.NARRATION_PROVIDER??'mock';
const server=createNarrationServer();server.listen(PORT,'127.0.0.1',()=>process.stdout.write(`Narration proxy listening on http://127.0.0.1:${PORT} (${PROVIDER})\n`));
}
