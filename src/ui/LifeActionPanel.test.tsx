import {describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createOpeningFacts,dispatch,ENGINE_VERSION} from '../engine';
import {LifeActionPanel} from './LifeActionPanel';

describe('LifeActionPanel 無障礙語意',()=>{
  it('將可複選的生活行動以標題命名為同一組',()=>{
    const facts=createOpeningFacts(19,184,{regions:[],surnames:[]});
    const state=dispatch(null,{version:ENGINE_VERSION,commandId:'accessible-life-action',expectedRevision:0,type:'StartGame',name:'主角',seed:19,facts}).state!;
    const html=renderToStaticMarkup(createElement(LifeActionPanel,{state,busy:false,onRun:vi.fn(async()=>true)}));

    expect(html).toContain('<h2 id="life-action-heading">你想怎麼做？</h2>');
    expect(html).toContain('<div class="intent-grid" role="group" aria-labelledby="life-action-heading">');
    expect([...html.matchAll(/type="checkbox"/g)]).toHaveLength(4);
    expect(html).toContain('行動、詢問或想說的話');
  });

  it('A267–A268 對話歷史以可展開清單呈現，輸入欄關聯完整資料說明',()=>{
    const facts=createOpeningFacts(20,184,{regions:[],surnames:[]});
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'accessible-dialogue-history',expectedRevision:0,type:'StartGame',name:'主角',seed:20,facts}).state!;
    const state={...started,phase2:{...started.phase2!,dialogueHistory:[{speakerId:'opening-family-0',speakerName:'父親',turn:2,playerText:'昨日談及秋收。',npcText:'田畝已有新苗。'}]}};
    const html=renderToStaticMarkup(createElement(LifeActionPanel,{state,busy:false,onRun:vi.fn(async()=>true)}));

    expect(html).toContain('aria-describedby="action-input-help"');
    expect(html).toContain('id="action-input-help"');
    expect(html).toContain('主角年齡與所在地');
    expect(html).toContain('目前關係的粗略語氣提示');
    expect(html).toContain('<details class="dialogue-history"><summary>此世界線的人物對話（最近 1 次）</summary>');
    expect(html).toContain('第 2 回合・父親');
    expect(html).toContain('<b>你：</b>昨日談及秋收。');
    expect(html).toContain('<b>父親：</b>田畝已有新苗。');
    expect(html).toContain('每人最多保留最近四次，全體最多四十次');
  });
});
