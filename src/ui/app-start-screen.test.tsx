// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {commitWorldline,loadWorkspace} from '../storage';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});

vi.mock('../storage',async(importOriginal)=>{
  const actual=await importOriginal<typeof import('../storage')>();
  return {...actual,commitWorldline:vi.fn(),loadWorkspace:vi.fn()};
});
vi.mock('./ChatGptConnection',()=>({ChatGptConnection:()=>null}));

import App from './App';

const emptyWorkspace={saves:[],profile:{regions:[],surnames:[],activeWorldlineId:null}};

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

  it('IndexedDB 載入失敗時，將錯誤顯示在出生確認畫面並以 alert 播報',async()=>{
    vi.mocked(loadWorkspace).mockRejectedValueOnce(new Error('IndexedDB unavailable'));
    await act(async()=>{root.render(createElement(App));await Promise.resolve();});
    const alert=host.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe('無法讀取瀏覽器存檔；請確認 IndexedDB 可用。');
    expect(host.querySelector('#start-content')?.contains(alert)).toBe(true);
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
    vi.mocked(loadWorkspace).mockRejectedValueOnce(new Error('initial IndexedDB error')).mockRejectedValueOnce(new Error('retry IndexedDB error'));
    await act(async()=>{root.render(createElement(App));await Promise.resolve();});
    const retry=host.querySelector<HTMLButtonElement>('.notice button');
    await act(async()=>{retry?.click();await Promise.resolve();});
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('仍無法讀取瀏覽器存檔；請確認 IndexedDB 可用，再試一次。');
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
});
