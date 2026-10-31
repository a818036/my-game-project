// @vitest-environment jsdom
import {describe,expect,it} from 'vitest';
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {ActivityAnnouncer,LoadingScreen,StatusAlert} from './ActivityAnnouncer';

describe('異步操作螢幕閱讀器狀態',()=>{
  it('以可讀的 polite status 區域宣告保存與敘事進度',()=>{
    const saving=renderToStaticMarkup(createElement(ActivityAnnouncer,{message:'正在保存並結算操作。'}));
    expect(saving).toContain('role="status"');expect(saving).toContain('aria-live="polite"');expect(saving).toContain('aria-atomic="true"');expect(saving).toContain('visually-hidden');expect(saving).toContain('正在保存並結算操作。');
    const narrating=renderToStaticMarkup(createElement(ActivityAnnouncer,{message:'遊戲狀態已保存，正在整理本回合敘事。'}));
    expect(narrating).toContain('遊戲狀態已保存，正在整理本回合敘事。');
    const ready=renderToStaticMarkup(createElement(ActivityAnnouncer,{message:'本回合敘事已就緒，可於故事區閱讀。'}));
    expect(ready).toContain('本回合敘事已就緒，可於故事區閱讀。');
    const saved=renderToStaticMarkup(createElement(ActivityAnnouncer,{message:'操作已保存。'}));
    expect(saved).toContain('操作已保存。');
    const unchanged=renderToStaticMarkup(createElement(ActivityAnnouncer,{message:'目前人生已繼續，沒有時間推進。'}));
    expect(unchanged).toContain('目前人生已繼續，沒有時間推進。');
  });

  it('將世界線載入訊息標記為可見的 polite status',()=>{
    const loading=renderToStaticMarkup(createElement(LoadingScreen));
    expect(loading).toContain('<main class="loading"><p role="status" aria-live="polite" aria-atomic="true">正在開啟你的世界線……</p></main>');
  });

  it('同一 live region 會保留並更新開局保存狀態',async()=>{
    const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
    try{
      await act(async()=>root.render(createElement(ActivityAnnouncer,{message:''})));
      const status=host.querySelector('[role="status"]');
      expect(status?.getAttribute('aria-live')).toBe('polite');
      await act(async()=>root.render(createElement(ActivityAnnouncer,{message:'正在保存並結算操作。'})));
      expect(host.querySelector('[role="status"]')).toBe(status);
      expect(status?.textContent).toBe('正在保存並結算操作。');
      expect(status?.getAttribute('aria-atomic')).toBe('true');
    }finally{await act(async()=>root.unmount());host.remove();}
  });

  it('開局存檔錯誤以 alert 顯示且空訊息不佔畫面',()=>{
    const error=renderToStaticMarkup(createElement(StatusAlert,{message:'無法讀取瀏覽器存檔；請確認 IndexedDB 可用。',onRetry:()=>undefined}));
    expect(error).toContain('<p role="alert">');
    expect(error).toContain('無法讀取瀏覽器存檔；請確認 IndexedDB 可用。');
    expect(error).toContain('重新讀取存檔');
    expect(renderToStaticMarkup(createElement(StatusAlert,{message:''}))).toBe('');
  });
});
