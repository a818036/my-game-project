import {describe,it,expect,vi} from 'vitest';
import {createChatGptSession,readCompletedResponse,chatGptFetchAdapter,validateChatGptIdToken} from './chatgpt.mjs';
import {generateKeyPair,SignJWT} from 'jose';
import {createNarrationServer} from './index.mjs';
import {openAiInterpretation} from './narration.mjs';

const candidate={actions:[],questions:['請補充行動'],unsupported:[],unparsedText:'試試'};
const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const stream=(events)=>new Response(events.map(e=>`data: ${JSON.stringify(e)}\n\n`).join(''),{headers:{'Content-Type':'text/event-stream'}});
function fixture({scope='openid chatgpt.tokens.use.direct',expires=3600,streamEvents}={}){
  let persisted={hostId:'urn:uuid:test-host',accounts:[]};const calls=[];
  const store={load:async()=>structuredClone(persisted),save:async value=>{persisted=structuredClone(value);}};
  const fetchImpl=vi.fn(async(url,options={})=>{calls.push({url,options});
    if(url.endsWith('/.well-known/openid-configuration'))return json({issuer:'https://auth.openai.com',jwks_uri:'https://auth.openai.com/jwks',revocation_endpoint:'https://auth.openai.com/revoke'});
    if(url.endsWith('/oauth/token'))return json({access_token:'secret-access',refresh_token:'secret-refresh',id_token:'secret-id',scope,expires_in:expires});
    if(url.endsWith('/models'))return json({models:[{slug:'available',display_name:'可用模型',visibility:'list'},{slug:'hidden',display_name:'隱藏',visibility:'hidden'}]});
    if(url.endsWith('/responses'))return stream(streamEvents??[{type:'response.output_text.delta',output_index:0,content_index:0,delta:JSON.stringify(candidate)},{type:'response.completed',response:{status:'completed',output:[]}}]);
    if(url.endsWith('/revoke'))return new Response('',{status:200});
    throw new Error('Unexpected URL');
  });
  const verifyToken=vi.fn(async()=>({sub:'person-1',email:'player@example.test'}));
  const session=createChatGptSession({fetchImpl,store,verifyToken});
  async function login(accountId){const {url}=await session.start({accountId,redirectUri:'http://127.0.0.1:8787/auth/callback'});const auth=new URL(url);await session.callback(new URLSearchParams({state:auth.searchParams.get('state'),code:'one-use-code',client_id:'oaiapp_test'}));return auth;}
  return {session,fetchImpl,verifyToken,calls,login,store,persisted:()=>persisted};
}
describe('ChatGPT 官方訂閱登入（離線假服務，不消耗額度）',()=>{
  it('真實簽章驗證拒絕錯誤 audience、nonce、過期與偽造金鑰',async()=>{
    const {privateKey,publicKey}=await generateKeyPair('RS256');
    const sign=expiration=>new SignJWT({nonce:'expected'}).setProtectedHeader({alg:'RS256'}).setSubject('player').setIssuer('https://auth.openai.com').setAudience('client').setIssuedAt().setExpirationTime(expiration).sign(privateKey);
    const token=await sign('5m');expect((await validateChatGptIdToken(token,publicKey,'client','expected')).sub).toBe('player');
    await expect(validateChatGptIdToken(token,publicKey,'wrong','expected')).rejects.toThrow();await expect(validateChatGptIdToken(token,publicKey,'client','wrong')).rejects.toThrow('nonce');await expect(validateChatGptIdToken(await sign(1),publicKey,'client','expected')).rejects.toThrow();
    const other=await generateKeyPair('RS256');await expect(validateChatGptIdToken(token,other.publicKey,'client','expected')).rejects.toThrow();
  });
  it('初次動態登錄包含 PKCE，交換使用回傳 client ID，憑證不持久化或出現在狀態',async()=>{
    const f=fixture();const auth=await f.login();expect(auth.searchParams.get('client_id')).toBe('dynamic_agent_client');expect(auth.searchParams.get('code_challenge_method')).toBe('S256');expect(auth.searchParams.get('scope')).toContain('chatgpt.tokens.use.direct');
    const exchange=f.calls.find(c=>c.url.endsWith('/oauth/token')).options.body;expect(exchange.get('client_id')).toBe('oaiapp_test');expect(exchange.get('redirect_uri')).toBe('http://127.0.0.1:8787/auth/callback');expect(exchange.get('code_verifier')).toBeTruthy();
    expect(JSON.stringify(await f.session.status())).not.toContain('secret-');expect(JSON.stringify(f.persisted())).not.toContain('secret-');expect(f.verifyToken).toHaveBeenCalled();
  });
  it('state 錯誤、過期與重播回呼均不能交換憑證',async()=>{
    const f=fixture();await f.session.start({redirectUri:'http://127.0.0.1:8787/auth/callback'});await expect(f.session.callback(new URLSearchParams({state:'wrong',code:'x'}))).rejects.toThrow('驗證');expect(f.fetchImpl).not.toHaveBeenCalled();
    const auth=await f.login();await expect(f.session.callback(new URLSearchParams({state:auth.searchParams.get('state'),code:'x'}))).rejects.toThrow('驗證');
    const late=await f.session.start({redirectUri:'http://127.0.0.1:8787/auth/callback'});const now=vi.spyOn(Date,'now').mockReturnValue(Date.now()+360000);try{await expect(f.session.callback(new URLSearchParams({state:new URL(late.url).searchParams.get('state'),code:'x'}))).rejects.toThrow('過期');}finally{now.mockRestore();}
  });
  it('拒絕無 client ID、取消授權及不符的回呼來源',async()=>{
    const f=fixture();await expect(f.session.start({redirectUri:'https://evil.test/auth/callback'})).rejects.toThrow('127.0.0.1');
    let auth=await f.session.start({redirectUri:'http://127.0.0.1:8787/auth/callback'});await expect(f.session.callback(new URLSearchParams({state:new URL(auth.url).searchParams.get('state'),code:'x'}))).rejects.toThrow('登錄');
    auth=await f.session.start({redirectUri:'http://127.0.0.1:8787/auth/callback'});await expect(f.session.callback(new URLSearchParams({state:new URL(auth.url).searchParams.get('state'),error:'access_denied'}))).rejects.toThrow('取消');expect(f.fetchImpl).not.toHaveBeenCalled();
  });
  it('登入身份驗證失敗不能建立連線',async()=>{const f=fixture();f.verifyToken.mockRejectedValueOnce(new Error('bad signature'));await expect(f.login()).rejects.toThrow('signature');expect((await f.session.status()).connected).toBe(false);});
  it('只有身份登入、不含訂閱 scope 時禁止模型與推論',async()=>{const f=fixture({scope:'openid'});await f.login();expect((await f.session.status()).planEnabled).toBe(false);await expect(f.session.listModels()).rejects.toThrow('授權');expect(f.calls.some(c=>c.url.endsWith('/models'))).toBe(false);});
  it('重啟後沿用 client／host，不保存 token；重新登入核對身份',async()=>{
    const f=fixture();await f.login();const next=createChatGptSession({store:f.store,fetchImpl:f.fetchImpl,verifyToken:async()=>({sub:'someone-else'})});expect((await next.status()).connected).toBe(false);
    const {url}=await next.start({accountId:'oaiapp_test',redirectUri:'http://127.0.0.1:9000/auth/callback'});const u=new URL(url);expect(u.searchParams.get('client_id')).toBe('oaiapp_test');expect(u.searchParams.get('ext_agent_host_id')).toBe('urn:uuid:test-host');expect(u.searchParams.has('agent_name_hint')).toBe(false);
    await expect(next.callback(new URLSearchParams({state:u.searchParams.get('state'),client_id:'other-client',code:'x'}))).rejects.toThrow('帳戶');
    const retry=await next.start({accountId:'oaiapp_test',redirectUri:'http://127.0.0.1:9000/auth/callback'});await expect(next.callback(new URLSearchParams({state:new URL(retry.url).searchParams.get('state'),code:'x'}))).rejects.toThrow('帳戶');
  });
  it('模型目錄依帳戶取得；選取後轉為官方串流請求且移除不支援參數',async()=>{
    const f=fixture();await f.login();expect(await f.session.listModels()).toEqual([{slug:'available',displayName:'可用模型'}]);await expect(f.session.select({model:'hidden'})).rejects.toThrow('可用');await f.session.select({model:'available'});
    const result=await openAiInterpretation({text:'試試',selectedIntents:[],targets:[]},{apiKey:'not-a-real-key',fetchImpl:chatGptFetchAdapter(f.session),maxOutputTokens:900});expect(result).toEqual(candidate);
    const request=f.calls.find(c=>c.url.endsWith('/responses'));const body=JSON.parse(request.options.body);expect(body).toMatchObject({model:'available',store:false,stream:true});expect(Array.isArray(body.input)).toBe(true);expect(body).not.toHaveProperty('max_output_tokens');expect(request.options.headers.Authorization).toBe('Bearer secret-access');
  });
  it('同一帳戶並發更新只交換一次 refresh token',async()=>{const f=fixture({expires:1});await f.login();await Promise.all([f.session.listModels(),f.session.listModels()]);expect(f.calls.filter(c=>c.options.body instanceof URLSearchParams&&c.options.body.get('grant_type')==='refresh_token')).toHaveLength(1);});
  it('登出會撤銷 refresh token、清除記憶體並保留非秘密登錄',async()=>{const f=fixture();await f.login();await f.session.logout();expect(f.calls.some(c=>c.url.endsWith('/revoke'))).toBe(true);expect((await f.session.status()).connected).toBe(false);expect(f.persisted().accounts).toHaveLength(1);await expect(f.session.listModels()).rejects.toThrow('登入');});
  it('串流額度錯誤不回傳部分文字，也不切到付費 API',async()=>{const f=fixture({streamEvents:[{type:'response.output_text.delta',delta:'partial'},{type:'response.failed',response:{error:{code:'subscription_sharing_usage_limit_exceeded'}}}]});await f.login();await f.session.listModels();await f.session.select({model:'available'});await expect(f.session.request({input:'test',instructions:'test'})).rejects.toThrow('額度');expect(f.calls.filter(c=>c.url.endsWith('/responses'))).toHaveLength(1);});
  it('不完整、缺完成事件和分塊串流正確處理',async()=>{
    await expect(readCompletedResponse(stream([{type:'response.incomplete'}]))).rejects.toThrow('未完成');await expect(readCompletedResponse(stream([{type:'response.output_text.delta',delta:'partial'}]))).rejects.toThrow('中斷');
    const text=`data: ${JSON.stringify({type:'response.completed',response:{output_text:'中文'}})}\r\n\r\n`;const bytes=new TextEncoder().encode(text);const body=new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=3)c.enqueue(bytes.slice(i,i+3));c.close();}});expect(await readCompletedResponse(new Response(body))).toEqual({output_text:'中文'});
  });
  it('串流文字可只出現在 delta；done 與 completed 不可重複拼接',async()=>{
    const events=[{type:'response.output_text.delta',output_index:0,content_index:0,delta:'中'},{type:'response.output_text.delta',output_index:0,content_index:0,delta:'文'},{type:'response.output_text.done',output_index:0,content_index:0,text:'中文'},{type:'response.completed',response:{status:'completed',output:[]}}];
    const bytes=new TextEncoder().encode(events.map(e=>`data: ${JSON.stringify(e)}\r\n\r\n`).join(''));
    const body=new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=3)c.enqueue(bytes.slice(i,i+3));c.close();}});
    expect((await readCompletedResponse(new Response(body))).output_text).toBe('中文');
    const final={status:'completed',output:[{type:'message',content:[{type:'output_text',text:'中文'}]}]};
    expect(await readCompletedResponse(stream([...events.slice(0,3),{type:'response.completed',response:final}]))).toEqual(final);
  });
  it('多個文字部分依索引排序，推理文字不當成答案，失敗不使用已有片段',async()=>{
    const partial=[{type:'response.reasoning_text.delta',delta:'秘密推理'},{type:'response.output_text.done',output_index:1,content_index:0,text:'乙'},{type:'response.output_text.delta',output_index:0,content_index:0,delta:'甲'}];
    expect((await readCompletedResponse(stream([...partial,{type:'response.completed',response:{output_text:''}}]))).output_text).toBe('甲\n乙');
    await expect(readCompletedResponse(stream([...partial,{type:'response.incomplete'}]))).rejects.toThrow('未完成');
    await expect(readCompletedResponse(stream(partial))).rejects.toThrow('中斷');
    await expect(readCompletedResponse(stream([...partial,{type:'response.completed',response:{status:'incomplete'}}]))).rejects.toThrow('未完成');
  });
  it('HTTP 來源防護與無登入回退，不外呼模型',async()=>{
    const f=fixture(),server=createNarrationServer({provider:'chatgpt',chatgptSession:f.session});await new Promise(r=>server.listen(0,'127.0.0.1',r));const root=`http://127.0.0.1:${server.address().port}`;
    try{expect((await (await fetch(`${root}/api/health`)).json()).provider).toBe('chatgpt');expect((await fetch(`${root}/api/chatgpt/start`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.test'},body:'{}'})).status).toBe(403);expect((await fetch(`${root}/api/chatgpt/start`,{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'})).status).toBe(403);
      const res=await fetch(`${root}/api/interpret`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'讀書',selectedIntents:[],targets:[]})});expect(res.status).toBe(400);expect(f.fetchImpl).not.toHaveBeenCalled();
    }finally{await new Promise(r=>server.close(r));}
  });
});
