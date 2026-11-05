// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import axe from 'axe-core';
import {createOpeningFacts,dispatch,ENGINE_VERSION} from '../engine';
import {answerKnownHistoricalEventQuestion,type InteractionResult} from '../life';
import {understandInput} from '../narration/interaction';
import {InteractionReply} from './InteractionReply';
import {LifeActionPanel} from './LifeActionPanel';

vi.mock('../narration/interaction',async(importOriginal)=>{
  const actual=await importOriginal<typeof import('../narration/interaction')>();
  return {...actual,understandInput:vi.fn()};
});

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});

describe('LifeActionPanel 詢問回覆播報',()=>{
  let host:HTMLDivElement;
  let root:ReturnType<typeof createRoot>;
  const facts=createOpeningFacts(357,184,{regions:[],surnames:[]});
  const state=dispatch(null,{version:ENGINE_VERSION,commandId:'persistent-interaction-reply',expectedRevision:0,type:'StartGame',name:'測試主角',seed:357,facts}).state!;
  const reply:InteractionResult={kind:'question',answer:'你目前是零歲。',choiceIds:[],questions:[],source:'本機範本'};

  beforeEach(async()=>{
    vi.mocked(understandInput).mockResolvedValue(reply);
    host=document.createElement('div');
    document.body.append(host);
    root=createRoot(host);
    await act(async()=>root.render(createElement('main',{id:'main-content'},createElement(LifeActionPanel,{state,busy:false,onRun:vi.fn(async()=>true)}))));
  });

  afterEach(async()=>{
    await act(async()=>root.unmount());
    host.remove();
    vi.clearAllMocks();
  });

  it('A358 在答案出現前掛載持續播報區，並以原節點播報回覆',async()=>{
    const status=host.querySelector<HTMLElement>('.intents > .visually-hidden[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.getAttribute('aria-atomic')).toBe('true');
    expect(status?.textContent).toBe('');

    const textarea=host.querySelector<HTMLTextAreaElement>('textarea')!;
    const setValue=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!;
    await act(async()=>{
      setValue.call(textarea,'我今年幾歲？');
      textarea.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await act(async()=>host.querySelector<HTMLButtonElement>('button.primary.wide')!.click());

    expect(understandInput).toHaveBeenCalledOnce();
    expect(host.querySelector('.intents > .visually-hidden[role="status"]')).toBe(status);
    expect(status?.textContent).toBe('回應你的詢問：你目前是零歲。');
    expect(host.querySelector('.plan-review[role="region"]')?.querySelector('[role="status"]')).toBeNull();
  });

  it('A448 沒有來源標記時仍說明來源欄位狀態',async()=>{
    const withoutSource={...reply,source:undefined};
    await act(async()=>root.render(createElement(InteractionReply,{reply:withoutSource,previousDialogue:[],selectedChoiceLabels:[]})));
    expect(host.querySelector('details p')?.textContent).toBe('來源說明：此回應未提供來源標記。');
  });

  it('A439 將 190 年本機年表答案呈現在具名回覆區並保持時間不變',async()=>{
    const reply={...answerKnownHistoricalEventQuestion('西元 190 年發生了什麼事？',state)!,source:'已核對的遊戲年表'};
    vi.mocked(understandInput).mockResolvedValue(reply);
    const textarea=host.querySelector<HTMLTextAreaElement>('textarea')!;
    const setValue=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!;
    await act(async()=>{
      setValue.call(textarea,'西元 190 年發生了什麼事？');
      textarea.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await act(async()=>host.querySelector<HTMLButtonElement>('button.primary.wide')!.click());

    const response=host.querySelector<HTMLElement>('.plan-review[role="region"][aria-labelledby="interaction-reply-title"]');
    expect(response?.querySelector('h3')?.textContent).toBe('回應你的詢問');
    expect(response?.textContent).toContain('春正月山東州郡起兵');
    expect(response?.textContent).toContain('二月丁亥遷都長安');
    expect(response?.textContent).toContain('三月乙巳車駕入長安');
    expect(response?.textContent).toContain('己酉董卓焚洛陽宮廟及人家');
    expect(response?.textContent).toContain('《後漢書》卷九〈孝獻帝紀〉');
    expect(response?.querySelector('details summary')?.textContent).toBe('回應來源');
    expect(response?.querySelector('details p')?.textContent).toBe('來源說明：已核對的遊戲年表');
    expect(host.querySelector<HTMLElement>('.intents > .visually-hidden[role="status"]')?.textContent).toContain('回應你的詢問：');
    expect(state.world.year).toBe(184);
    expect(state.turn).toBe(0);
  });

  it('A456 194 年陶謙年表問答在行動介面附來源且不執行計畫',async()=>{
    const reply={...answerKnownHistoricalEventQuestion('陶謙在194年發生了什麼事？',state)!,source:'已核對的遊戲年表'};
    vi.mocked(understandInput).mockResolvedValue(reply);
    const textarea=host.querySelector<HTMLTextAreaElement>('textarea')!;
    const setValue=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!;
    await act(async()=>{
      setValue.call(textarea,'陶謙在194年發生了什麼事？');
      textarea.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await act(async()=>host.querySelector<HTMLButtonElement>('button.primary.wide')!.click());

    const response=host.querySelector<HTMLElement>('.plan-review[role="region"][aria-labelledby="interaction-reply-title"]');
    expect(response?.textContent).toContain('陶謙去世，劉備領徐州');
    expect(response?.textContent).toContain('《三國志》卷八');
    expect(response?.textContent).toContain('卷三十二〈蜀書·先主傳〉');
    expect(response?.querySelector('details p')?.textContent).toBe('來源說明：已核對的遊戲年表');
    expect(response?.textContent).toContain('沒有執行勾選項目，時間與存檔未變更。');
    expect(host.querySelector<HTMLElement>('.intents > .visually-hidden[role="status"]')?.textContent).toContain('回應你的詢問：');
    expect(state.world.year).toBe(184);
    expect(state.turn).toBe(0);
  });

  it('A391 詢問回覆畫面 axe-core 啟用規則無違規',async()=>{
    const textarea=host.querySelector<HTMLTextAreaElement>('textarea')!;
    const setValue=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!;
    await act(async()=>{
      setValue.call(textarea,'我今年幾歲？');
      textarea.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await act(async()=>host.querySelector<HTMLButtonElement>('button.primary.wide')!.click());
    const results=await axe.run(host,{rules:{'color-contrast':{enabled:false}}});
    expect(results.violations.map(({id,help,nodes})=>({id,help,targets:nodes.flatMap(node=>node.target.map(String))}))).toEqual([]);
  });

  it('A392 行動計畫確認畫面 axe-core 啟用規則無違規',async()=>{
    await act(async()=>host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    await act(async()=>host.querySelector<HTMLButtonElement>('button.primary.wide')!.click());
    expect(host.querySelector('.plan-review[role="region"]')).not.toBeNull();
    const results=await axe.run(host,{rules:{'color-contrast':{enabled:false}}});
    expect(results.violations.map(({id,help,nodes})=>({id,help,targets:nodes.flatMap(node=>node.target.map(String))}))).toEqual([]);
  });
});
