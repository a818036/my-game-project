// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import axe from 'axe-core';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {activateWorldline,commitWorldline,loadWorkspace} from '../storage';
import {createOpeningFacts,dispatch,ENGINE_VERSION} from '../engine';
import {fetchNarration} from '../narration/client';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});

vi.mock('../storage',async(importOriginal)=>{
  const actual=await importOriginal<typeof import('../storage')>();
  return {...actual,activateWorldline:vi.fn(),commitWorldline:vi.fn(),loadWorkspace:vi.fn()};
});
vi.mock('./ChatGptConnection',()=>({ChatGptConnection:()=>null}));
vi.mock('../narration/client',async(importOriginal)=>{
  const actual=await importOriginal<typeof import('../narration/client')>();
  return {...actual,fetchNarration:vi.fn()};
});
vi.mock('./HistoricalGeographyRegisters',async()=>{
  const {createElement,useState}=await import('react');
  return {HistoricalGeographyRegisters:()=>{
    const [query,setQuery]=useState('');
    return createElement('div',{className:'county-register-search'},[
      createElement('label',{key:'label',htmlFor:'county-register-search'},'搜尋郡縣名目'),
      createElement('input',{key:'input',id:'county-register-search',type:'search',value:query,onChange:(event:{target:{value:string}})=>setQuery(event.target.value)}),
      query&&createElement('section',{key:'result',className:'county-search-result'},createElement('h3',null,`豫州・${query}`)),
    ]);
  }};
});

import App from './App';

const emptyWorkspace={saves:[],profile:{regions:[],surnames:[],activeWorldlineId:null}};

function visibleText(node:Node):string{
  if(node instanceof Element&&(node.hasAttribute('hidden')||node.getAttribute('aria-hidden')==='true'))return '';
  if(node.nodeType===Node.TEXT_NODE)return node.textContent??'';
  return [...node.childNodes].map(visibleText).join(' ');
}

function hasReferencedName(element:Element,root:ParentNode):boolean{
  const label=element.getAttribute('aria-label')?.trim();
  if(label)return true;
  const ids=element.getAttribute('aria-labelledby')?.trim().split(/\s+/).filter(Boolean)??[];
  return ids.length>0&&ids.every(id=>{
    const target=[...root.querySelectorAll<HTMLElement>('[id]')].find(candidate=>candidate.id===id);
    return !!target&&!!target.textContent?.trim();
  });
}

function hasControlName(control:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement,root:ParentNode):boolean{
  return [...(control.labels??[])].some(label=>!!visibleText(label).trim())||hasReferencedName(control,root);
}

function hasButtonName(button:HTMLButtonElement,root:ParentNode):boolean{
  return !!visibleText(button).trim()||hasReferencedName(button,root);
}

function invalidAriaIdReferences(root:ParentNode):string[]{
  const attributes=['aria-labelledby','aria-describedby','aria-controls','aria-owns','aria-details','aria-errormessage'];
  return [...root.querySelectorAll<HTMLElement>(attributes.map(attribute=>`[${attribute}]`).join(','))].flatMap(element=>attributes.flatMap(attribute=>{
    const ids=element.getAttribute(attribute)?.trim().split(/\s+/).filter(Boolean)??[];
    return ids.filter(id=>![...root.querySelectorAll<HTMLElement>('[id]')].some(target=>target.id===id)).map(id=>`${element.tagName.toLowerCase()}[${attribute}="${id}"]`);
  }));
}

describe('開局存檔載入提示',()=>{
  let host:HTMLDivElement;
  let root:ReturnType<typeof createRoot>;

  beforeEach(()=>{
    host=document.createElement('div');document.body.append(host);root=createRoot(host);
  });
  afterEach(async()=>{
    await act(async()=>root.unmount());
    host.remove();
  });

  it('A362 名稱抽查排除隱藏裝飾文字並拒絕無效的 ARIA 參照',()=>{
    const button=document.createElement('button');
    const icon=document.createElement('span');
    icon.setAttribute('aria-hidden','true');
    icon.textContent='›';
    button.append(icon);
    host.append(button);
    expect(hasButtonName(button,host)).toBe(false);

    const field=document.createElement('input');
    field.setAttribute('aria-labelledby','missing-name');
    host.append(field);
    expect(hasControlName(field,host)).toBe(false);
    expect(invalidAriaIdReferences(host)).toEqual(['input[aria-labelledby="missing-name"]']);

    const label=document.createElement('label');
    label.htmlFor='named-field';
    label.textContent='有效欄位名稱';
    field.id='named-field';
    field.removeAttribute('aria-labelledby');
    host.append(label);
    expect(hasControlName(field,host)).toBe(true);
    expect(invalidAriaIdReferences(host)).toEqual([]);
  });

  it('IndexedDB 載入失敗時，將錯誤顯示在出生確認畫面並以 alert 播報',async()=>{
    vi.mocked(loadWorkspace).mockRejectedValueOnce(new DOMException('The operation is insecure.', 'SecurityError'));
    await act(async()=>{root.render(createElement(App));await Promise.resolve();});
    const alert=host.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe('無法讀取瀏覽器存檔；請確認 IndexedDB 可用。');
    expect(host.querySelector('#start-content')?.contains(alert)).toBe(true);
    expect(host.querySelector('summary')?.textContent).toBe('查看錯誤詳情');
    expect(host.querySelector('.notice code')?.textContent).toBe('SecurityError: The operation is insecure.');
  });

  it('暫時讀取失敗後重試成功，載入世界線並清除錯誤',async()=>{
    type Workspace=Awaited<ReturnType<typeof loadWorkspace>>;
    let finishRetry!:(workspace:Workspace)=>void;
    const retryResult=new Promise<Workspace>(resolve=>{finishRetry=resolve;});
    vi.mocked(loadWorkspace).mockRejectedValueOnce(new Error('temporary IndexedDB error')).mockReturnValueOnce(retryResult);
    await act(async()=>{root.render(createElement(App));await Promise.resolve();});
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    const retry=host.querySelector<HTMLButtonElement>('.notice button');
    expect(retry?.textContent).toBe('重新讀取存檔');
    await act(async()=>{retry?.click();});
    expect(retry?.disabled).toBe(true);
    expect(retry?.textContent).toBe('正在重新讀取…');
    await act(async()=>{finishRetry(emptyWorkspace);await retryResult;});
    expect(loadWorkspace).toHaveBeenCalledTimes(2);
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.querySelector('#start-content')).not.toBeNull();
  });

  it('重試仍失敗時保留說明並重新啟用重試按鈕',async()=>{
    vi.mocked(loadWorkspace).mockRejectedValueOnce(new Error('initial IndexedDB error')).mockRejectedValueOnce(new DOMException('Blocked by storage policy.', 'SecurityError'));
    await act(async()=>{root.render(createElement(App));await Promise.resolve();});
    const retry=host.querySelector<HTMLButtonElement>('.notice button');
    await act(async()=>{retry?.click();await Promise.resolve();});
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('仍無法讀取瀏覽器存檔；請確認 IndexedDB 可用，再試一次。');
    expect(host.querySelector('.notice code')?.textContent).toBe('SecurityError: Blocked by storage policy.');
    expect(retry?.disabled).toBe(false);
    expect(retry?.textContent).toBe('重新讀取存檔');
  });

  it('載入成功時不顯示存檔錯誤提示',async()=>{
    vi.mocked(loadWorkspace).mockResolvedValueOnce(emptyWorkspace);
    await act(async()=>{root.render(createElement(App));await Promise.resolve();});
    expect(host.querySelector('#start-content')).not.toBeNull();
    expect(host.querySelector<HTMLAnchorElement>('a.skip-link')?.getAttribute('href')).toBe('#start-content');
    expect(host.querySelector<HTMLElement>('#start-content')?.tabIndex).toBe(-1);
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });

  it('開局畫面有單一主要地標、頁面標題及具可讀標籤的表單控制項',async()=>{
    vi.mocked(loadWorkspace).mockResolvedValueOnce(emptyWorkspace);
    await act(async()=>{root.render(createElement(App));await Promise.resolve();});

    expect(host.querySelectorAll('main')).toHaveLength(1);
    expect(host.querySelectorAll('h1')).toHaveLength(1);
    expect(host.querySelector('h1')?.textContent).toBe('神洲三國');
    expect(host.querySelector('.eyebrow')?.textContent).toContain('開啟獨立世界線');
    expect(host.textContent).not.toContain('第六階段開發中原型');
    const controls=[...host.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]):not([hidden])')];
    expect(controls.length).toBeGreaterThan(0);
    expect(controls.every(control=>control.labels?.length)).toBe(true);
    const buttons=[...host.querySelectorAll<HTMLButtonElement>('button')];
    expect(buttons.filter(button=>!hasButtonName(button,host)).map(button=>button.outerHTML)).toEqual([]);
    expect(invalidAriaIdReferences(host)).toEqual([]);
  });

  it('遊戲畫面保持地標、標題層級及可見控制項名稱',async()=>{
    const facts=createOpeningFacts(123,184,{regions:[],surnames:[]});
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a313-game-ui',expectedRevision:0,type:'StartGame',name:`${facts.surname}景初`,seed:123,facts});
    if(!started.state||!started.event)throw new Error('建立遊戲畫面測試存檔失敗');
    const state=started.state;
    vi.mocked(loadWorkspace).mockResolvedValueOnce({
      saves:[{format:'shenzhou-save',version:6,worldlineId:state.worldlineId,events:[started.event],state}],
      profile:{regions:[],surnames:[],activeWorldlineId:state.worldlineId},
    });
    await act(async()=>{root.render(createElement(App));await Promise.resolve();await new Promise(resolve=>setTimeout(resolve,0));});

    expect(host.querySelectorAll('main')).toHaveLength(1);
    expect(host.querySelectorAll('h1')).toHaveLength(1);
    expect(host.querySelector('footer')?.textContent).toContain('神洲三國・亂世生涯原型');
    expect(host.querySelector('footer')?.textContent).not.toContain('第四階段示例原型');
    expect(host.querySelector('a.skip-link')?.getAttribute('href')).toBe('#main-content');
    expect(host.querySelector<HTMLElement>('#main-content')?.tabIndex).toBe(-1);
    expect(host.querySelector('nav[aria-label="遊戲資料與操作"]')).not.toBeNull();
    const headingLevels=[...host.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(heading=>Number(heading.tagName.slice(1)));
    expect(headingLevels[0]).toBe(1);
    expect(headingLevels.slice(1).every((level,index)=>level<=headingLevels[index]+1)).toBe(true);
    const controls=[...host.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input:not([type="hidden"]):not([hidden]),select,textarea')];
    expect(controls.filter(control=>!hasControlName(control,host)).map(control=>control.outerHTML)).toEqual([]);
    const buttons=[...host.querySelectorAll<HTMLButtonElement>('button')];
    expect(buttons.filter(button=>!hasButtonName(button,host)).map(button=>button.outerHTML)).toEqual([]);
    const initialTabs=[...host.querySelectorAll<HTMLButtonElement>('nav[aria-label="遊戲資料與操作"] button')];
    expect(initialTabs.filter(tab=>tab.getAttribute('aria-pressed')==='true')).toHaveLength(1);
    for(const panel of ['家產','天生技','軍政','記事']){
      const tab=[...host.querySelectorAll<HTMLButtonElement>('nav[aria-label="遊戲資料與操作"] button')].find(button=>button.textContent?.trim().startsWith(panel));
      expect(tab,`找不到「${panel}」分頁控制項`).toBeDefined();
      await act(async()=>{tab!.click();await new Promise(resolve=>setTimeout(resolve,0));});
      const selectedTabs=[...host.querySelectorAll<HTMLButtonElement>('nav[aria-label="遊戲資料與操作"] button')].filter(button=>button.getAttribute('aria-pressed')==='true');
      expect(selectedTabs,`「${panel}」切換後應只有目前分頁標記為選取`).toHaveLength(1);
      expect(selectedTabs[0]?.textContent).toContain(panel);
      const panelControls=[...host.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input:not([type="hidden"]):not([hidden]),select,textarea')];
      expect(panelControls.filter(control=>!hasControlName(control,host)).map(control=>control.outerHTML),`「${panel}」分頁有無有效名稱的表單欄位`).toEqual([]);
      const panelButtons=[...host.querySelectorAll<HTMLButtonElement>('button')];
      expect(panelButtons.filter(button=>!hasButtonName(button,host)).map(button=>button.outerHTML),`「${panel}」分頁有無有效名稱的按鈕`).toEqual([]);
      expect(invalidAriaIdReferences(host),`「${panel}」分頁有指向不存在元素的 ARIA ID`).toEqual([]);
      const levels=[...host.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(heading=>Number(heading.tagName.slice(1)));
      expect(levels.slice(1).every((level,index)=>level<=levels[index]+1),`「${panel}」分頁標題層級跳階：${levels.join('→')}`).toBe(true);
      if(panel==='軍政'){
        const geographyDisclosure=[...host.querySelectorAll('summary')].find(summary=>summary.textContent?.includes('歷史、軍政與重大決策'));
        expect(geographyDisclosure).toBeDefined();
        await act(async()=>{geographyDisclosure!.click();await Promise.resolve();});
        const search=host.querySelector<HTMLInputElement>('#county-register-search');
        expect(search).not.toBeNull();
        const setValue=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
        await act(async()=>{setValue.call(search,'豫州');search!.dispatchEvent(new Event('input',{bubbles:true}));await Promise.resolve();});
        expect(host.querySelector('.county-search-result h3')?.textContent).toContain('豫州');
        const searchLevels=[...host.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(heading=>Number(heading.tagName.slice(1)));
        expect(searchLevels.slice(1).every((level,index)=>level<=searchLevels[index]+1),`郡縣搜尋結果標題層級跳階：${searchLevels.join('→')}`).toBe(true);
      }
    }
  });

  it('A365 axe-core 檢查開局與遊戲五個資料分頁',async()=>{
    vi.mocked(loadWorkspace).mockResolvedValueOnce(emptyWorkspace);
    await act(async()=>{root.render(createElement(App));await Promise.resolve();});
    const violations:Array<{panel:string;id:string;impact:string|null;targets:string[];help:string}>=[];
    const scan=async(panel:string)=>{
      const results=await axe.run(host,{rules:{'color-contrast':{enabled:false}}});
      for(const violation of results.violations){
        violations.push({panel,id:violation.id,impact:violation.impact??null,targets:violation.nodes.flatMap(node=>node.target.map(String)),help:violation.help});
      }
    };
    const expandDetails=async()=>act(async()=>{
      for(const summary of host.querySelectorAll<HTMLElement>('details:not([open]) > summary'))summary.click();
    });
    await expandDetails();
    await scan('開局');
    const name=host.querySelector<HTMLInputElement>('input[maxlength="16"]')!;
    const setValue=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
    await act(async()=>{setValue.call(name,'無障礙');name.dispatchEvent(new Event('input',{bubbles:true}));});
    await act(async()=>{host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();});
    await act(async()=>{host.querySelector<HTMLButtonElement>('button.primary')!.click();await new Promise(resolve=>setTimeout(resolve,0));});
    await expandDetails();
    await scan('人物');
    for(const panel of ['家產','天生技','軍政','記事']){
      await act(async()=>{[...host.querySelectorAll<HTMLButtonElement>('nav[aria-label="遊戲資料與操作"] button')].find(button=>button.textContent?.trim().startsWith(panel))!.click();await new Promise(resolve=>setTimeout(resolve,0));});
      await expandDetails();
      await scan(panel);
    }

    expect(violations,JSON.stringify(violations,null,2)).toEqual([]);
  },30000);

  it('世界線切換成功與失敗都以狀態角色通知，失敗時保留原線',async()=>{
    const makeSave=(seed:number,name:string)=>{
      const facts=createOpeningFacts(seed,184,{regions:[],surnames:[]});
      const started=dispatch(null,{version:ENGINE_VERSION,commandId:`a355-start-${seed}`,expectedRevision:0,type:'StartGame',name,facts,seed});
      if(!started.state||!started.event)throw new Error('建立世界線切換測試存檔失敗');
      return {format:'shenzhou-save' as const,version:6 as const,worldlineId:started.state.worldlineId,events:[started.event],state:started.state};
    };
    const first=makeSave(355,'測試甲');
    const second=makeSave(356,'測試乙');
    vi.mocked(loadWorkspace).mockResolvedValueOnce({saves:[first,second],profile:{regions:[],surnames:[],activeWorldlineId:first.worldlineId}});
    vi.mocked(activateWorldline).mockResolvedValue(undefined);
    await act(async()=>{root.render(createElement(App));await Promise.resolve();await new Promise(resolve=>setTimeout(resolve,0));});
    const persistentStatuses=host.querySelectorAll<HTMLElement>('.game-shell > .visually-hidden[role="status"]');
    const persistentStatus=persistentStatuses[1];
    expect(persistentStatuses).toHaveLength(3);
    expect(persistentStatus?.textContent).toBe('');

    const select=host.querySelector<HTMLSelectElement>('select[aria-label="切換世界線"]');
    expect(select).not.toBeNull();
    await act(async()=>{select!.value=second.worldlineId;select!.dispatchEvent(new Event('change',{bubbles:true}));await Promise.resolve();});
    expect(activateWorldline).toHaveBeenCalledWith(second.worldlineId);
    expect(host.querySelector('h1')?.textContent).toContain('測試乙');
    expect(host.querySelectorAll('.game-shell > .visually-hidden[role="status"]')[1]).toBe(persistentStatus);
    expect(persistentStatus?.textContent).toBe('已切換世界線；舊存檔仍保留。');
    expect(host.querySelector('p.notice')?.textContent).toBe('已切換世界線；舊存檔仍保留。');
    expect(host.querySelector('p.notice')?.hasAttribute('role')).toBe(false);

    vi.mocked(activateWorldline).mockRejectedValueOnce(new Error('storage unavailable'));
    await act(async()=>{select!.value=first.worldlineId;select!.dispatchEvent(new Event('change',{bubbles:true}));await Promise.resolve();});
    expect(host.querySelector('h1')?.textContent).toContain('測試乙');
    expect(host.querySelector<HTMLSelectElement>('select[aria-label="切換世界線"]')?.value).toBe(second.worldlineId);
    expect(host.querySelectorAll('.game-shell > .visually-hidden[role="status"]')[1]).toBe(persistentStatus);
    expect(persistentStatus?.textContent).toBe('切換失敗；所有存檔均保留。');
    expect(host.querySelector('p.notice')?.textContent).toBe('切換失敗；所有存檔均保留。');
    expect(host.querySelector('p.notice')?.hasAttribute('role')).toBe(false);
  });

  it('單一世界線無法驗證時仍顯示開局畫面與原始備份操作',async()=>{
    vi.mocked(loadWorkspace).mockResolvedValueOnce({...emptyWorkspace,unreadableSaves:[{worldlineId:'broken-world',version:6,reason:'存檔狀態與事件重播結果不一致',raw:{format:'shenzhou-save',version:6,worldlineId:'broken-world',events:[],state:{worldlineId:'broken-world'}} as never}]});
    await act(async()=>{root.render(createElement(App));await Promise.resolve();});
    expect(host.querySelector('.save-recovery')?.textContent).toContain('原始資料仍保留');
    expect(host.querySelector('.save-recovery button')?.textContent).toBe('下載原始存檔備份');
    expect(host.querySelector('input[maxlength="16"]')).not.toBeNull();
  });

  it('開局保存期間在開局畫面播報狀態，保存後更新同一節點',async()=>{
    let finishSave!:()=>void;
    const saveResult=new Promise<void>(resolve=>{finishSave=resolve;});
    vi.mocked(loadWorkspace).mockResolvedValueOnce(emptyWorkspace);
    vi.mocked(commitWorldline).mockReturnValueOnce(saveResult);
    await act(async()=>{root.render(createElement(App));await Promise.resolve();});

    const name=host.querySelector<HTMLInputElement>('input[maxlength="16"]')!;
    const setValue=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
    await act(async()=>{setValue.call(name,'安');name.dispatchEvent(new Event('input',{bubbles:true}));});
    await act(async()=>{host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();});
    const saveButton=[...host.querySelectorAll('button')].find(button=>button.textContent==='確認出生並開始')!;
    await act(async()=>{saveButton.click();});

    const status=host.querySelector('[role="status"]');
    expect(status?.textContent).toBe('正在保存並結算操作。');
    expect(host.querySelector<HTMLAnchorElement>('a.skip-link')?.getAttribute('href')).toBe('#start-content');
    expect(host.querySelector<HTMLElement>('#start-content')?.tabIndex).toBe(-1);
    expect(saveButton.disabled).toBe(true);
    await act(async()=>{finishSave();await saveResult;});
    expect(host.querySelector('[role="status"]')?.textContent).toBe('操作已保存。');
    expect(host.querySelector<HTMLAnchorElement>('a.skip-link')?.getAttribute('href')).toBe('#main-content');
    expect(host.querySelector<HTMLElement>('#main-content')?.tabIndex).toBe(-1);
  });

  it('新局保存失敗時不顯示只適用於存檔讀取失敗的重試按鈕',async()=>{
    vi.mocked(loadWorkspace).mockResolvedValueOnce(emptyWorkspace);
    vi.mocked(commitWorldline).mockRejectedValueOnce(new Error('disk full'));
    await act(async()=>{root.render(createElement(App));await Promise.resolve();});
    const name=host.querySelector<HTMLInputElement>('input[maxlength="16"]')!;
    const setValue=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
    await act(async()=>{setValue.call(name,'安');name.dispatchEvent(new Event('input',{bubbles:true}));});
    await act(async()=>{host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();});
    const saveButton=[...host.querySelectorAll('button')].find(button=>button.textContent==='確認出生並開始')!;
    await act(async()=>{saveButton.click();await Promise.resolve();});
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('未保存任何變更：disk full');
    expect(host.querySelector('.notice button')).toBeNull();
    expect(loadWorkspace).toHaveBeenCalledTimes(1);
  });

  it('A359 敘事服務失敗時以預先掛載播報區通知並保留畫面錯誤',async()=>{
    const facts=createOpeningFacts(359,184,{regions:[],surnames:[]});
    const started=dispatch(null,{version:ENGINE_VERSION,commandId:'a359-start',expectedRevision:0,type:'StartGame',name:'播報測試',seed:359,facts});
    if(!started.event||!started.state)throw new Error('建立敘事錯誤測試世界線失敗');
    const save={format:'shenzhou-save' as const,version:6 as const,worldlineId:started.state.worldlineId,events:[started.event],state:started.state};
    vi.mocked(loadWorkspace).mockResolvedValueOnce({saves:[save],profile:{regions:[],surnames:[],activeWorldlineId:save.worldlineId}});
    vi.mocked(commitWorldline).mockResolvedValue(undefined);
    vi.mocked(fetchNarration).mockRejectedValueOnce(new Error('敘事服務暫時不可用'));
    await act(async()=>{root.render(createElement(App));await Promise.resolve();await new Promise(resolve=>setTimeout(resolve,0));});
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,50));});

    const statusNodes=host.querySelectorAll<HTMLElement>('.game-shell > .visually-hidden[role="status"]');
    expect(statusNodes).toHaveLength(3);
    const errorAnnouncer=statusNodes[2];
    expect(errorAnnouncer.textContent).toBe('');
    await act(async()=>host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    await act(async()=>host.querySelector<HTMLButtonElement>('button.primary.wide')!.click());
    await act(async()=>host.querySelector<HTMLButtonElement>('.plan-review button.primary')!.click());

    expect(fetchNarration).toHaveBeenCalledOnce();
    expect(host.querySelectorAll('.game-shell > .visually-hidden[role="status"]')[2]).toBe(errorAnnouncer);
    expect(errorAnnouncer.textContent).toBe('敘事服務暫時不可用');
    expect(host.querySelector('.ai-narrative .notice')?.textContent).toBe('敘事服務暫時不可用');
    expect(host.querySelector('.ai-narrative .notice')?.hasAttribute('role')).toBe(false);
  });
});
