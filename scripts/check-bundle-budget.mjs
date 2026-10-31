import {readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';

const assets=join(process.cwd(),'dist','assets');
const files=await readdir(assets);
const initial=files.filter(name=>/^index-[\w-]+\.js$/.test(name));
const battle=files.filter(name=>/^battle-scenario-examples-[\w-]+\.js$/.test(name));
const budgets=[
  {label:'首頁 JavaScript',files:initial,limit:500_000},
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

if(failed){
  console.error('建置體積超出預算或必要 chunk 不存在；請檢查拆包設定與動態匯入。');
  process.exitCode=1;
}else{
  console.log('建置體積檢查只守住靜態檔案大小，不代表裝置啟動時間或網路效能。');
}
