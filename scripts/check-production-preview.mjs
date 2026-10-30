import {spawn} from 'node:child_process';
import {readdir} from 'node:fs/promises';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';

const reservation=createServer();
await new Promise((resolve,reject)=>{
  reservation.once('error',reject);
  reservation.listen(0,'127.0.0.1',resolve);
});
const address=reservation.address();
if(!address||typeof address==='string')throw new Error('無法取得本機預覽連接埠。');
const port=address.port;
await new Promise((resolve,reject)=>reservation.close(error=>error?reject(error):resolve()));

const vite=fileURLToPath(new URL('../node_modules/vite/bin/vite.js',import.meta.url));
const server=spawn(process.execPath,[vite,'preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let serverExit=null;
server.once('exit',(code,signal)=>{serverExit={code,signal};});
const origin=`http://127.0.0.1:${port}`;

async function stopServer(){
  if(server.exitCode!==null||server.signalCode!==null)return;
  server.kill();
  await Promise.race([new Promise(resolve=>server.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,1500))]);
}

try{
  let page=null;
  const deadline=Date.now()+15_000;
  while(Date.now()<deadline){
    if(serverExit)throw new Error(`Vite 預覽伺服器提前結束（${serverExit.code??serverExit.signal}）。`);
    try{
      const response=await fetch(origin,{signal:AbortSignal.timeout(800)});
      if(response.ok){page=response;break;}
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,120));
  }
  if(!page)throw new Error('等待正式預覽首頁逾時。');
  const html=await page.text();
  const assets=[...html.matchAll(/(?:src|href)="([^\"]+\.(?:js|css)(?:\?[^\"]*)?)"/g)].map(match=>match[1]);
  if(!assets.some(path=>/\.js(?:\?|$)/.test(path))||!assets.some(path=>/\.css(?:\?|$)/.test(path)))throw new Error('正式預覽首頁缺少主要 JavaScript 或 CSS 入口。');
  const scenario=(await readdir(new URL('../dist/assets/',import.meta.url))).find(name=>/^battle-scenario-examples-[\w-]+\.js$/.test(name));
  if(!scenario)throw new Error('找不到延後載入的戰役示例 chunk。');
  assets.push(`/assets/${scenario}`);

  for(const asset of assets){
    const response=await fetch(new URL(asset,origin),{signal:AbortSignal.timeout(3000)});
    if(!response.ok)throw new Error(`正式預覽無法取得 ${asset}：HTTP ${response.status}。`);
    const kind=asset.endsWith('.css')?'text/css':'javascript';
    if(!response.headers.get('content-type')?.includes(kind))throw new Error(`正式預覽的 ${asset} 回傳內容類型不正確。`);
    console.log(`通過：${asset}（HTTP ${response.status}）`);
  }
  console.log('正式預覽首頁、主入口與延後載入戰役 chunk 均可取回；此檢查不會部署網站。');
}finally{
  await stopServer();
}
