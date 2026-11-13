import {describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createOpeningFacts,dispatch,ENGINE_VERSION} from '../engine';
import {LifeActionPanel} from './LifeActionPanel';
import {InteractionReply,interactionReplyAnnouncement} from './InteractionReply';

describe('LifeActionPanel 無障礙語意',()=>{
  it('將可複選的生活行動以標題命名為同一組',()=>{
    const facts=createOpeningFacts(19,184,{regions:[],surnames:[]});
    const state=dispatch(null,{version:ENGINE_VERSION,commandId:'accessible-life-action',expectedRevision:0,type:'StartGame',name:'主角',seed:19,facts}).state!;
    const html=renderToStaticMarkup(createElement(LifeActionPanel,{state,busy:false,onRun:vi.fn(async()=>true)}));

    expect(html).toContain('<h2 id="life-action-heading">你想怎麼做？</h2>');
    expect(html).toContain('<div class="intent-grid" role="group" aria-labelledby="life-action-heading">');
    expect([...html.matchAll(/type="checkbox"/g)]).toHaveLength(4);
    expect(html).toContain('行動、詢問或想說的話');
    expect(html).toContain('史實問答查本機已收錄年表，例如「西元 206 年發生了什麼事？」；不呼叫模型。');
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

  it('A394 欄位聚焦說明保持簡短，較少用的結局與對話資料另可展開查閱',()=>{
    const facts=createOpeningFacts(21,184,{regions:[],surnames:[]});
    const state=dispatch(null,{version:ENGINE_VERSION,commandId:'concise-input-help',expectedRevision:0,type:'StartGame',name:'主角',seed:21,facts}).state!;
    const html=renderToStaticMarkup(createElement(LifeActionPanel,{state,busy:false,onRun:vi.fn(async()=>true)}));
    const help=html.match(/<p id="action-input-help" class="caption">([^<]+)<\/p>/)?.[1]??'';

    expect(help).toContain('西元 206 年發生了什麼事？');
    expect(help).toContain('不呼叫模型');
    expect(help).toContain('不推進時間');
    expect(help).not.toContain('主角年齡與所在地');
    expect(html).toContain('<details class="action-input-more-help"><summary>結局與人物對話說明</summary>');
    expect(html).toContain('主角年齡與所在地');
  });

  it('A290 回應更新只播報短摘要，不重讀先前對話全文',()=>{
    const reply={kind:'dialogue' as const,answer:'田畝已經播種，近來雨水尚可，家中正準備修補南面的籬笆。',choiceIds:[],questions:[],source:'本機 mock',speakerId:'opening-family-0',speakerName:'父親'};
    const previousDialogue=[{speakerId:'opening-family-0',speakerName:'父親',turn:2,playerText:'昨日談到收成，想問今年田裡如何？',npcText:'前些日子下了幾場雨，田地還算濕潤。'}];
    const html=renderToStaticMarkup(createElement(InteractionReply,{reply,previousDialogue,selectedChoiceLabels:[]}));

    expect(interactionReplyAnnouncement(reply)).toBe('父親回應：田畝已經播種，近來雨水尚可，家中正準備修補南面的籬笆。');
    expect(html).toContain('<section class="plan-review" role="region" aria-labelledby="interaction-reply-title">');
    expect(html).not.toContain('plan-review" aria-live=');
    expect(html).not.toContain('role="status"');
    expect(html).toContain('昨日談到收成，想問今年田裡如何？');
    expect(html).toContain('前些日子下了幾場雨，田地還算濕潤。');
  });

  it('即時播報的長回答截短至 220 字並明示省略',()=>{
    const reply={kind:'question' as const,answer:'甲'.repeat(260),choiceIds:[],questions:[],source:'本機'};
    const spoken=interactionReplyAnnouncement(reply);
    expect(spoken).toBe(`回應你的詢問：${'甲'.repeat(220)}…`);
  });
});
