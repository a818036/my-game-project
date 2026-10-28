import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createChatGptSession,chatGptFetchAdapter} from './chatgpt.mjs';
import {mockNarration,openAiInterpretation,openAiNarration,validateInterpretationPayload,validateNarrationOutput,validateNarrationPayload} from './narration.mjs';

try{for(const line of readFileSync('.env','utf8').split(/\r?\n/)){const match=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(match&&!match[1].startsWith('#')&&process.env[match[1]]===undefined)process.env[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2');}}catch{}
export function createNarrationServer(options={}){
const PROVIDER=options.provider??process.env.NARRATION_PROVIDER??'mock',MODEL=options.model??process.env.NARRATION_MODEL??'gpt-4.1-mini',API_KEY=options.apiKey??process.env.OPENAI_API_KEY,FETCH=options.fetchImpl??fetch,MAX_OUTPUT_TOKENS=Number(options.maxOutputTokens??process.env.NARRATION_MAX_OUTPUT_TOKENS??900),MAX_PROVIDER_REQUESTS=Number(options.maxProviderRequests??process.env.NARRATION_MAX_PROVIDER_REQUESTS??10);
if(!['mock','openai','chatgpt'].includes(PROVIDER))throw new Error('NARRATION_PROVIDER 僅支援 mock、openai 或 chatgpt');
if(!Number.isInteger(MAX_OUTPUT_TOKENS)||MAX_OUTPUT_TOKENS<128||MAX_OUTPUT_TOKENS>4000)throw new Error('NARRATION_MAX_OUTPUT_TOKENS 必須介於 128 與 4000');
if(!Number.isInteger(MAX_PROVIDER_REQUESTS)||MAX_PROVIDER_REQUESTS<1||MAX_PROVIDER_REQUESTS>100)throw new Error('NARRATION_MAX_PROVIDER_REQUESTS 必須介於 1 與 100');
const batches=new Map();
const inFlight=new Map();
let providerRequests=0;
const limitedFetch=(...args)=>{if(providerRequests>=MAX_PROVIDER_REQUESTS)throw new Error('本次代理程序的真實供應者請求上限已達；重新啟動前不會再發出請求。');providerRequests++;return FETCH(...args);};
const chatgpt=PROVIDER==='chatgpt'?(options.chatgptSession??createChatGptSession({fetchImpl:FETCH})):null;
const providerOptions=signal=>({apiKey:PROVIDER==='chatgpt'?'oauth-managed-in-server':API_KEY,model:MODEL,maxOutputTokens:MAX_OUTPUT_TOKENS,signal,fetchImpl:chatgpt?chatGptFetchAdapter(chatgpt,limitedFetch):limitedFetch});
return http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  // Protect loopback services from browser cross-origin requests and DNS rebinding.
  const host=req.headers.host??'';
  const allowedHosts=new Set([`127.0.0.1:${req.socket.localPort}`,`localhost:${req.socket.localPort}`]);
  const allowedOrigins=new Set((process.env.NARRATION_ALLOWED_ORIGINS??'http://localhost:5173,http://127.0.0.1:5173').split(','));
  allowedOrigins.add(`http://127.0.0.1:${req.socket.localPort}`);allowedOrigins.add(`http://localhost:${req.socket.localPort}`);
  if(!allowedHosts.has(host)||(req.headers.origin&&!allowedOrigins.has(req.headers.origin))||(req.method==='POST'&&!req.headers['content-type']?.startsWith('application/json'))){res.writeHead(403);res.end(JSON.stringify({error:'拒絕非本機或非授權來源的請求'}));return;}
  const requestUrl=new URL(req.url,'http://127.0.0.1');
  if(requestUrl.pathname==='/auth/callback'){
    res.setHeader('Content-Type','text/plain; charset=utf-8');res.setHeader('Referrer-Policy','no-referrer');
    try{if(!chatgpt||req.method!=='GET')throw new Error('目前未啟用 ChatGPT 登入');await chatgpt.callback(requestUrl.searchParams);batches.clear();res.writeHead(200);res.end('ChatGPT 登入完成。請關閉此分頁，回遊戲按「重新整理連線」並取得可用模型。');}catch{res.writeHead(400);res.end('ChatGPT 登入未完成或驗證失敗。請回到遊戲重新登入；現有遊戲存檔不受影響。');}return;
  }
  if(requestUrl.pathname.startsWith('/api/chatgpt/')){
    try{
      if(!chatgpt)throw new Error('請以 NARRATION_PROVIDER=chatgpt 啟動代理。');
      let result;
      if(req.method==='GET'&&requestUrl.pathname==='/api/chatgpt/status')result=await chatgpt.status();
      else if(req.method==='POST'){
        let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2048)throw new Error('登入請求過長');}const body=JSON.parse(raw||'{}');
        if(requestUrl.pathname==='/api/chatgpt/start')result=await chatgpt.start({accountId:body.accountId,redirectUri:`http://127.0.0.1:${req.socket.localPort}/auth/callback`});
        else if(requestUrl.pathname==='/api/chatgpt/models')result={models:await chatgpt.listModels()};
        else if(requestUrl.pathname==='/api/chatgpt/select'){await chatgpt.select(body);batches.clear();result=await chatgpt.status();}
        else if(requestUrl.pathname==='/api/chatgpt/logout'){result=await chatgpt.logout();batches.clear();}
        else throw new Error('找不到登入操作');
      }else throw new Error('不支援的登入操作');
      res.writeHead(200);res.end(JSON.stringify(result));
    }catch(error){res.writeHead(400);res.end(JSON.stringify({error:error instanceof Error?error.message:'登入操作失敗'}));}return;
  }
  if(req.method==='GET'&&req.url==='/api/health'){res.writeHead(200);res.end(JSON.stringify({ok:true,provider:PROVIDER,model:PROVIDER==='mock'?'mock':PROVIDER==='chatgpt'?'account-selected':MODEL,remainingProviderRequests:Math.max(0,MAX_PROVIDER_REQUESTS-providerRequests),maxOutputTokens:PROVIDER==='chatgpt'?null:MAX_OUTPUT_TOKENS}));return;}
  if(req.method==='POST'&&req.url==='/api/interpret'){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(new Error('行動解析逾時')),30000);res.on('close',()=>{if(!res.writableEnded)controller.abort(new Error('玩家已取消行動解析'));});
    try{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>12000)throw new Error('行動解析文字超過安全上限');}const payload=JSON.parse(raw);validateInterpretationPayload(payload);if(PROVIDER==='mock')throw new Error('目前為 mock 模式；行動由本機確定性解析器處理。');const result=await openAiInterpretation(payload,providerOptions(controller.signal));res.setHeader('X-Action-Parser',PROVIDER);res.writeHead(200);res.end(JSON.stringify(result));}
    catch(error){const aborted=controller.signal.aborted;res.writeHead(aborted?504:400);res.end(JSON.stringify({error:aborted?'行動解析逾時或已取消。':error instanceof Error?error.message:'行動解析失敗'}));}
    finally{clearTimeout(timeout);}return;
  }
  if(req.method!=='POST'||req.url!='/api/narration'){res.writeHead(404);res.end(JSON.stringify({error:'找不到此 API'}));return;}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(new Error('敘事服務逾時')),30000);res.on('close',()=>{if(!res.writableEnded)controller.abort(new Error('玩家已取消敘事請求'));});
  let activeBatch,ownsBatch=false;
  try{
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>26000)throw new Error('敘事請求超過安全上限');}
    const payload=JSON.parse(raw),speakers=validateNarrationPayload(payload);activeBatch=`${chatgpt?.cacheKey()??PROVIDER}:${payload.eventBatchId}`;
    const hash=createHash('sha256').update(raw).digest('hex'),previous=batches.get(activeBatch);if(previous){if(previous.hash!==hash)throw new Error('同一事件批次不可搭配不同敘事資料');res.setHeader('X-Narration-Provider',PROVIDER);res.writeHead(200);res.end(JSON.stringify(previous.result));return;}
    let pending=inFlight.get(activeBatch);
    if(pending&&pending.hash!==hash)throw new Error('同一事件批次已有不同內容的敘事請求');
    if(!pending){const promise=(async()=>{const candidate=PROVIDER!=='mock'?await openAiNarration(payload,providerOptions(controller.signal)):mockNarration(payload);const result=validateNarrationOutput(candidate,speakers,payload);batches.set(activeBatch,{hash,result});if(batches.size>200)batches.delete(batches.keys().next().value);return result;})();pending={hash,promise};inFlight.set(activeBatch,pending);ownsBatch=true;}
    const result=await pending.promise;
    res.setHeader('X-Narration-Provider',PROVIDER);res.writeHead(200);res.end(JSON.stringify(result));
  }catch(error){const aborted=controller.signal.aborted;res.writeHead(aborted?504:400);res.end(JSON.stringify({error:aborted?'敘事請求已逾時或取消；已結算遊戲不受影響。':error instanceof Error?error.message:'敘事服務失敗'}));}
  finally{clearTimeout(timeout);if(activeBatch&&ownsBatch)inFlight.delete(activeBatch);}
});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
if(process.argv.includes('--chatgpt'))process.env.NARRATION_PROVIDER='chatgpt';
const PORT=Number(process.env.NARRATION_PORT??8787),PROVIDER=process.env.NARRATION_PROVIDER??'mock';
const server=createNarrationServer();server.listen(PORT,'127.0.0.1',()=>process.stdout.write(`Narration proxy listening on http://127.0.0.1:${PORT} (${PROVIDER})\n`));
}

