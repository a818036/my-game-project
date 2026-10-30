// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {loadWorkspace} from '../storage';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});

vi.mock('../storage',async(importOriginal)=>{
  const actual=await importOriginal<typeof import('../storage')>();
  return {...actual,loadWorkspace:vi.fn()};
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
    expect(alert?.querySelector('span')?.textContent).toBe('無法讀取瀏覽器存檔；請確認 IndexedDB 可用。');
    expect(host.querySelector('#start-content')?.contains(alert)).toBe(true);
  });

  it('暫時讀取失敗後重試成功，載入世界線並清除錯誤',async()=>{
    type Workspace=Awaited<ReturnType<typeof loadWorkspace>>;
    let finishRetry!:(workspace:Workspace)=>void;
    const retryResult=new Promise<Workspace>(resolve=>{finishRetry=resolve;});
    vi.mocked(loadWorkspace).mockRejectedValueOnce(new Error('temporary IndexedDB error')).mockReturnValueOnce(retryResult);
    await act(async()=>{root.render(createElement(App));await Promise.resolve();});
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    const retry=host.querySelector<HTMLButtonElement>('[role="alert"] button');
    expect(retry?.textContent).toBe('重新讀取存檔');
    await act(async()=>{retry?.click();});
    expect(retry?.disabled).toBe(true);
    expect(retry?.textContent).toBe('正在重新讀取…');
    await act(async()=>{finishRetry(emptyWorkspace);await retryResult;});
    expect(loadWorkspace).toHaveBeenCalledTimes(2);
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.querySelector('#start-content')).not.toBeNull();
  });

  it('載入成功時不顯示存檔錯誤提示',async()=>{
    vi.mocked(loadWorkspace).mockResolvedValueOnce(emptyWorkspace);
    await act(async()=>{root.render(createElement(App));await Promise.resolve();});
    expect(host.querySelector('#start-content')).not.toBeNull();
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });
});
