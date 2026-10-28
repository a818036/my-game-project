import {useEffect,useState} from 'react';

interface ConnectionStatus {accounts:Array<{id:string;email:string;connected:boolean}>;activeId:string|null;connected:boolean;planEnabled:boolean;model:string;models:Array<{slug:string;displayName:string}>;message:string;pending:boolean;}
export function ChatGptConnection(){
  const [provider,setProvider]=useState(''),[status,setStatus]=useState<ConnectionStatus|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loginUrl,setLoginUrl]=useState('');
  async function api(path:string,body?:unknown){const response=await fetch(`/api/chatgpt/${path}`,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error??'連線操作失敗');return data;}
  async function refresh(){const health=await fetch('/api/health');if(!health.ok)throw new Error('請先啟動敘事代理');const info=await health.json();setProvider(info.provider);if(info.provider==='chatgpt')setStatus(await api('status'));}
  useEffect(()=>{void refresh().catch(()=>{});},[]);
  async function run(action:()=>Promise<void>){setBusy(true);setError('');try{await action();await refresh();}catch(e){setError(e instanceof Error?e.message:'連線失敗');}finally{setBusy(false);}}
  function start(accountId?:string){setLoginUrl('');void run(async()=>{const result=await api('start',{accountId});const url=new URL(result.url);if(url.origin!=='https://auth.openai.com')throw new Error('登入來源不正確');setLoginUrl(result.url);});}
  return <details className="chatgpt-connection"><summary>AI 連線設定{provider==='chatgpt'?'・ChatGPT 訂閱':provider==='openai'?'・API 計費模式':provider==='mock'?'・範本模式':''}</summary>
    <p>ChatGPT 訂閱模式會使用你授權的方案額度，不是無限用量，也不會自動轉用另外計費的 API。</p>
    {provider!=='chatgpt'?<p>使用訂閱登入：在代理視窗設定 <code>NARRATION_PROVIDER=chatgpt</code> 後重新啟動代理，再按下方重新整理。</p>:<>
      <p role="status">{status?.connected?(status.planEnabled?'已登入並授權使用 ChatGPT 訂閱':'已登入，尚未授權使用訂閱'):'尚未登入'}{status?.activeId?`・${status.accounts.find(a=>a.id===status.activeId)?.email??''}`:''}</p>
      <div className="button-row"><button type="button" disabled={busy} onClick={()=>start()}>Continue with ChatGPT</button></div>
      {status?.accounts.map((account,index)=><div className="button-row" key={account.id}><span>{account.email}・連線 {index+1}</span><button type="button" className="quiet" disabled={busy} onClick={()=>account.connected?void run(async()=>{setLoginUrl('');await api('select',{accountId:account.id});}):start(account.id)}>{account.connected?'使用此帳戶':'重新登入此帳戶'}</button></div>)}
      {loginUrl&&<p><a href={loginUrl} target="_blank" rel="noopener noreferrer">開啟 OpenAI 官方登入頁面</a>。完成後回到此頁，按「重新整理連線」。</p>}
      {status?.message&&<p>{status.message}</p>}
      {status?.connected&&<><div className="button-row"><button type="button" disabled={busy||!status.planEnabled} onClick={()=>void run(async()=>{await api('models',{});})}>取得可用模型</button><button type="button" className="quiet" disabled={busy} onClick={()=>void run(async()=>{setLoginUrl('');await api('logout',{});})}>登出目前帳戶</button></div>
      <label>遊戲使用的模型<select disabled={busy||!status.models.length} value={status.model} onChange={e=>void run(async()=>{await api('select',{model:e.target.value});})}><option value="" disabled>請先取得並選擇模型</option>{status.models.map(m=><option value={m.slug} key={m.slug}>{m.displayName}</option>)}</select></label></>}
      <p>憑證只保留於本機代理記憶體，關閉代理後需重新登入。登入本身不代表推論測試已通過。</p>
      <p><a href="https://chatgpt.com/settings/usage" target="_blank" rel="noopener noreferrer">管理 ChatGPT 用量與應用程式授權</a></p>
    </>}
    <button type="button" className="quiet" disabled={busy} onClick={()=>void run(refresh)}>重新整理連線</button>
    {error&&<p role="alert" className="notice">{error}</p>}
  </details>;
}
