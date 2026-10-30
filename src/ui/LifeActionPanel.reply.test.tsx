// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import axe from 'axe-core';
import {createOpeningFacts,dispatch,ENGINE_VERSION} from '../engine';
import type {InteractionResult} from '../life';
import {understandInput} from '../narration/interaction';
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
