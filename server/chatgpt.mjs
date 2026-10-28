import {randomBytes, randomUUID, createHash} from 'node:crypto';
import {mkdir, readFile, writeFile, rename} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {createRemoteJWKSet, jwtVerify} from 'jose';

const AUTH='https://auth.openai.com';
const RESOURCE='https://api.openai.com/v1';
const SCOPE='openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
const random=()=>randomBytes(32).toString('base64url');
const timeout=()=>AbortSignal.timeout(15000);
export async function validateChatGptIdToken(token,key,clientId,nonce){
  const {payload}=await jwtVerify(token,key,{issuer:AUTH,audience:clientId,algorithms:['RS256'],requiredClaims:['exp','sub','iat']});
  if(payload.nonce!==nonce)throw new Error('登入 nonce 驗證失敗');return payload;
}
const messageFor=code=>({
  subscription_sharing_usage_limit_exceeded:'ChatGPT 訂閱可用額度已達上限，請到 ChatGPT 用量設定查看；不會改用付費 API。',
  subscription_sharing_usage_unavailable:'此帳戶目前無法使用 ChatGPT 訂閱授權，請檢查方案與應用程式權限。',
  invalid_grant:'ChatGPT 授權已失效，請重新登入。',
  insufficient_quota:'目前帳戶額度不足；不會自動改用付費 API。',
  rate_limit_exceeded:'ChatGPT 暫時限制請求頻率，請稍後再試。',
}[code]??'ChatGPT 請求失敗，請稍後重試或重新登入。');
export async function checkedJson(response){
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(`${messageFor(data.error?.code??data.error)}（HTTP ${response.status}）`);
  return data;
}

// Persist only registration metadata. All access/refresh/ID tokens stay in process memory.
export function createRegistrationStore(directory=join(process.env.LOCALAPPDATA??join(homedir(),'.config'),'ShenzhouThreeKingdoms')){
  const path=join(directory,'chatgpt-registrations.json');
  return {
    async load(){try{return JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code!=='ENOENT')throw new Error('ChatGPT 登入資料無法讀取，請檢查本機資料目錄。');return {hostId:`urn:uuid:${randomUUID()}`,accounts:[]};}},
    async save(value){await mkdir(directory,{recursive:true,mode:0o700});const tmp=`${path}.${randomUUID()}.tmp`;await writeFile(tmp,JSON.stringify(value),{mode:0o600});await rename(tmp,path);},
  };
}

export function createChatGptSession({fetchImpl=fetch,store=createRegistrationStore(),verifyToken}={}){
  let metadata,pending,activeId,model='',epoch=0,lastMessage='',discovery;
  const sessions=new Map();
  const requests=new Set();
  function invalidate(){epoch++;for(const controller of requests)controller.abort(new Error('ChatGPT 帳戶或模型已變更'));requests.clear();}
  let initializing;
  const init=()=>initializing??=(async()=>{metadata=await store.load();if(!metadata.hostId||!Array.isArray(metadata.accounts))throw new Error('登入登錄資料格式錯誤');await store.save(metadata);})();
  const discover=async()=>{
    if(!discovery){const d=await checkedJson(await fetchImpl(`${AUTH}/.well-known/openid-configuration`,{signal:timeout()}));
      if(d.issuer!==AUTH||new URL(d.jwks_uri).origin!==AUTH||(d.revocation_endpoint&&new URL(d.revocation_endpoint).origin!==AUTH))throw new Error('登入探索資料不符合官方來源');discovery=d;}
    return discovery;
  };
  const verify=verifyToken??(async(token,clientId,nonce)=>{
    const d=await discover();return validateChatGptIdToken(token,createRemoteJWKSet(new URL(d.jwks_uri)),clientId,nonce);
  });
  async function status(){await init();const session=sessions.get(activeId);return {accounts:metadata.accounts.map(a=>({id:a.id,email:a.email,connected:sessions.has(a.id)})),activeId:activeId??null,connected:!!session,planEnabled:!!session?.scopes.includes('chatgpt.tokens.use.direct'),model,models:session?.models??[],message:lastMessage,pending:!!pending&&pending.expires>Date.now()};}
  async function start({accountId,redirectUri}){
    await init();const uri=new URL(redirectUri);if(uri.protocol!=='http:'||uri.hostname!=='127.0.0.1'||uri.pathname!=='/auth/callback')throw new Error('登入回呼必須使用本機 127.0.0.1');
    const saved=accountId?metadata.accounts.find(a=>a.id===accountId):undefined;
    if(accountId&&!saved)throw new Error('找不到選取的帳戶');
    const attempt={state:random(),nonce:random(),verifier:random(),redirectUri,clientId:saved?.id,subject:saved?.subject,expires:Date.now()+300000};
    pending=attempt;lastMessage='請在 OpenAI 官方頁面登入並授權，完成後回遊戲重新整理連線狀態。';
    const params=new URLSearchParams({client_id:saved?.id??'dynamic_agent_client',ext_agent_host_id:metadata.hostId,response_type:'code',redirect_uri:redirectUri,scope:SCOPE,resource:RESOURCE,state:attempt.state,nonce:attempt.nonce,code_challenge_method:'S256',code_challenge:createHash('sha256').update(attempt.verifier).digest('base64url')});
    if(!saved)params.set('agent_name_hint','神洲三國');
    return {url:`${AUTH}/api/accounts/authorize?${params}`};
  }
  async function callback(params){
    const attempt=pending;
    if(!attempt||attempt.expires<Date.now()||params.get('state')!==attempt.state)throw new Error('登入回呼已過期或驗證失敗，請重新登入。');
    pending=undefined;
    if(params.has('error')){lastMessage='你已取消登入或未授權；現有連線未變更。';throw new Error(lastMessage);}
    const clientId=params.get('client_id')??attempt.clientId;
    if(!clientId||clientId==='dynamic_agent_client'||(attempt.clientId&&clientId!==attempt.clientId)||!params.get('code'))throw new Error('登入登錄未完成或帳戶不符');
    const tokens=await checkedJson(await fetchImpl(`${AUTH}/api/accounts/oauth/token`,{method:'POST',signal:timeout(),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:clientId,code:params.get('code'),code_verifier:attempt.verifier,redirect_uri:attempt.redirectUri,resource:RESOURCE})}));
    const identity=await verify(tokens.id_token,clientId,attempt.nonce);
    if(!identity.sub||(attempt.subject&&identity.sub!==attempt.subject))throw new Error('登入返回的帳戶與選取帳戶不同');
    const existing=metadata.accounts.find(a=>a.id===clientId);
    if(existing&&existing.subject!==identity.sub)throw new Error('帳戶登錄身份不符');
    if(!tokens.access_token||!Number.isFinite(tokens.expires_in))throw new Error('登入憑證格式錯誤');
    const registration={id:clientId,subject:identity.sub,email:typeof identity.email==='string'?identity.email:'ChatGPT 帳戶'};
    const next={...metadata,accounts:[...metadata.accounts.filter(a=>a.id!==clientId),registration]};await store.save(next);metadata=next;
    sessions.set(clientId,{...tokens,scopes:(tokens.scope??'').split(' '),expires:Date.now()+tokens.expires_in*1000,models:[]});activeId=clientId;model='';invalidate();
    lastMessage='登入成功。請取得可用模型並選擇模型；尚未送出遊戲推論。';
  }
  async function token(){
    const id=activeId,session=sessions.get(id);if(!session)throw new Error('請先使用 Continue with ChatGPT 登入。');
    if(!session.scopes.includes('chatgpt.tokens.use.direct'))throw new Error('已登入，但尚未授權使用 ChatGPT 訂閱；請重新登入授權。');
    if(session.expires<Date.now()+60000){
      if(!session.refresh_token)throw new Error('ChatGPT 連線已到期，請重新登入。');
      session.refreshing??=(async()=>{
        const result=await checkedJson(await fetchImpl(`${AUTH}/api/accounts/oauth/token`,{method:'POST',signal:timeout(),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:id,refresh_token:session.refresh_token,resource:RESOURCE})}));
        if(!result.access_token||!Number.isFinite(result.expires_in))throw new Error('更新登入憑證失敗');
        Object.assign(session,result,{scopes:result.scope?result.scope.split(' '):session.scopes,expires:Date.now()+result.expires_in*1000});
      })().finally(()=>{session.refreshing=undefined;});
      await session.refreshing;
    }
    if(activeId!==id||sessions.get(id)!==session)throw new Error('帳戶已切換或登出，請重試。');
    if(!session.scopes.includes('chatgpt.tokens.use.direct'))throw new Error('ChatGPT 訂閱授權已撤回。');
    return session.access_token;
  }
  async function listModels(){const revision=epoch;const bearer=await token();const data=await checkedJson(await fetchImpl(`${RESOURCE}/models`,{signal:timeout(),headers:{Authorization:`Bearer ${bearer}`}}));if(revision!==epoch)throw new Error('帳戶已變更');const models=(data.models??[]).filter(m=>m.visibility==='list'&&typeof m.slug==='string'&&typeof m.display_name==='string').map(m=>({slug:m.slug,displayName:m.display_name}));sessions.get(activeId).models=models;if(!models.some(m=>m.slug===model))model='';return models;}
  async function select({accountId,model:chosen}){await init();if(accountId&&accountId!==activeId){if(!sessions.has(accountId))throw new Error('此帳戶需重新登入');activeId=accountId;model='';invalidate();}if(chosen!==undefined){if(!sessions.get(activeId)?.models.some(m=>m.slug===chosen))throw new Error('請選擇此帳戶可用的模型');model=chosen;invalidate();}}
  async function logout(){
    const id=activeId,session=sessions.get(id);activeId=undefined;model='';pending=undefined;invalidate();sessions.delete(id);
    let confirmed=!session?.refresh_token;
    try{if(session?.refresh_token){const d=await discover();if(!d.revocation_endpoint)throw new Error('missing endpoint');const response=await fetchImpl(d.revocation_endpoint,{method:'POST',signal:timeout(),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:session.refresh_token,token_type_hint:'refresh_token',client_id:id})});confirmed=response.status===200;}}catch{}
    lastMessage=confirmed?'已登出；帳戶登錄保留供下次登入。':'已清除本機登入，但未確認遠端撤銷。請到 ChatGPT 設定斷開此應用程式。';return {message:lastMessage};
  }
  async function request(body,{signal,fetchOverride=fetchImpl}={}){
    const revision=epoch;if(!model)throw new Error('請先在 ChatGPT 連線設定取得並選擇模型。');const bearer=await token();
    if(revision!==epoch)throw new Error('帳戶已變更');
    const controller=new AbortController();requests.add(controller);
    try{
    const response=await fetchOverride(`${RESOURCE}/responses`,{method:'POST',signal:signal?AbortSignal.any([signal,controller.signal]):controller.signal,headers:{Authorization:`Bearer ${bearer}`,'Content-Type':'application/json'},body:JSON.stringify({model,instructions:body.instructions,input:[{role:'user',content:body.input}],text:body.text,store:false,stream:true})});
    if(!response.ok){await checkedJson(response);}
    const result=await readCompletedResponse(response);
    if(revision!==epoch)throw new Error('帳戶或模型已變更，已捨棄舊連線結果。');return result;
    }finally{requests.delete(controller);}
  }
  return {status,start,callback,listModels,select,logout,request,cacheKey:()=>`${epoch}:${activeId??''}:${model}`};
}

export async function readCompletedResponse(response){
  if(!response.body)throw new Error('ChatGPT 未回傳串流');
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',length=0,completed;
  const parts=new Map();
  function collect(event){
    if(!['response.output_text.delta','response.output_text.done'].includes(event.type))return;
    const output=event.output_index??0,content=event.content_index??0,key=`${output}:${content}`;
    const part=parts.get(key)??{output,content,text:''};
    if(event.type==='response.output_text.done'&&typeof event.text==='string')part.text=event.text;
    else if(typeof event.delta==='string')part.text+=event.delta;
    parts.set(key,part);
  }
  try{while(true){const {value,done}=await reader.read();buffer+=decoder.decode(value,{stream:!done});length+=value?.length??0;if(length>1000000)throw new Error('ChatGPT 回應過長，已停止讀取。');
    let end;while((end=buffer.search(/\r?\n\r?\n/))>=0){const match=buffer.slice(end).match(/^\r?\n\r?\n/)[0];const frame=buffer.slice(0,end);buffer=buffer.slice(end+match.length);const data=frame.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!data||data==='[DONE]')continue;const event=JSON.parse(data);
      if(event.type==='response.failed'||event.type==='error')throw new Error(messageFor(event.response?.error?.code??event.error?.code??event.code));
      if(event.type==='response.incomplete')throw new Error('ChatGPT 回應未完成，未採用部分內容。');
      collect(event);
      if(event.type==='response.completed'){
        completed=event.response??{};
        if(completed.status&&completed.status!=='completed')throw new Error('ChatGPT 回應未完成，未採用部分內容。');
        const finalText=completed.output_text||completed.output?.flatMap(item=>item.content??[]).filter(content=>content.type==='output_text').map(content=>content.text??'').join('\n');
        if(!finalText){const text=[...parts.values()].sort((a,b)=>a.output-b.output||a.content-b.content).map(part=>part.text).join('\n');if(text)completed={...completed,output_text:text};}
      }
    }
    if(completed)return completed;if(done)break;
  }}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  throw new Error('ChatGPT 串流中斷，未收到完成事件。');
}

// Reuse the existing strict parsing/validation without leaking OAuth credentials to it.
export function chatGptFetchAdapter(session,fetchOverride){return async(_url,options)=>new Response(JSON.stringify(await session.request(JSON.parse(options.body),{signal:options.signal,fetchOverride})),{status:200,headers:{'Content-Type':'application/json'}});}
