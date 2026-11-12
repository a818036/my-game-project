import {gzipSync} from 'node:zlib';
import {readFile,readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {collectStaticJavaScriptClosure} from './bundle-budget-utils.mjs';

const assets=join(process.cwd(),'dist','assets');
const files=await readdir(assets);
const initial=files.filter(name=>/^index-[\w-]+\.js$/.test(name));
const battle=files.filter(name=>/^battle-scenario-examples-[\w-]+\.js$/.test(name));
const budgets=[
  {label:'首頁入口 chunk',files:initial,limit:500_000},
  {label:'延後載入戰役示例 JavaScript',files:battle,limit:10_000},
];
let failed=false;

for(const budget of budgets){
  if(budget.files.length!==1){
    console.error(`${budget.label}：預期 1 個 chunk，實際找到 ${budget.files.length} 個。`);
    failed=true;
    continue;
  }
  const bytes=(await stat(join(assets,budget.files[0]))).size;
  const status=bytes<budget.limit?'通過':'超出';
  console.log(`${status}：${budget.label} ${bytes.toLocaleString('en-US')}／${budget.limit.toLocaleString('en-US')} bytes`);
  if(bytes>=budget.limit)failed=true;
}

if(initial.length===1){
  try{
    const entry=join(assets,initial[0]);
    const closure=await collectStaticJavaScriptClosure(entry);
    const bytes=closure.reduce((total,file)=>total+file.bytes,0);
    const gzipBytes=(await Promise.all(closure.map(async(file)=>gzipSync(await readFile(file.path)).byteLength)))
      .reduce((total,size)=>total+size,0);
    // Keep at least 1 KB of incremental allowance; this guards static size only, not device performance.
    // The source-backed 188–209 historical slices require this incremental static catalog allowance.
    const limit=964_000;
    const status=bytes<limit?'通過':'超出';
    console.log(`${status}：首頁初始 JavaScript 靜態相依總量 ${bytes.toLocaleString('en-US')}／${limit.toLocaleString('en-US')} bytes（各檔分別 gzip ${gzipBytes.toLocaleString('en-US')} bytes；${closure.length} 個檔案）`);
    if(bytes>=limit)failed=true;
  }catch(error){
    console.error(`無法核算首頁初始 JavaScript 靜態相依：${error instanceof Error?error.message:String(error)}`);
    failed=true;
  }
}

if(failed){
  console.error('建置體積超出預算或必要 chunk 不存在；請檢查拆包設定與動態匯入。');
  process.exitCode=1;
}else{
  console.log('建置體積檢查只守住靜態檔案大小，不代表裝置啟動時間或網路效能。');
}
