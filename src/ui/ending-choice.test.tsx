// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {EndingChoice,EndingResult} from './EndingChoice';

describe('EndingChoice',()=>{
  it('以明確標籤呈現玩家結局輸入，空白內容時不提供可提交按鈕',()=>{
    const html=renderToStaticMarkup(createElement(EndingChoice,{value:'   ',onChange:vi.fn(),onChoose:vi.fn()}));
    expect(html).toContain('<label for="ending-direction">你決定的結局方向</label>');
    expect(html).toContain('id="ending-direction"');
    expect(html).toContain('aria-describedby="ending-direction-help"');
    expect(html).toContain('maxLength="80"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('只有按下確認才會記錄你的結局選擇');
  });

  it('有選擇時顯示明確的提交按鈕',()=>{
    const html=renderToStaticMarkup(createElement(EndingChoice,{value:'歸隱故里',onChange:vi.fn(),onChoose:vi.fn()}));
    expect(html).toContain('<form class="ending-choice">');
    expect(html).toContain('確認選擇結局');
    expect(html).toContain('type="submit"');
    expect(html).not.toContain('disabled=""');
  });

  it('表單以 Enter 提交有效結局，空白內容不呼叫提交處理',async()=>{
    const host=document.createElement('div');document.body.append(host);const root=createRoot(host);const onChoose=vi.fn();
    try{
      await act(async()=>root.render(createElement(EndingChoice,{value:'歸隱故里',onChange:vi.fn(),onChoose})));
      await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
      expect(onChoose).toHaveBeenCalledTimes(1);
      await act(async()=>root.render(createElement(EndingChoice,{value:'   ',onChange:vi.fn(),onChoose})));
      await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
      expect(onChoose).toHaveBeenCalledTimes(1);
    }finally{await act(async()=>root.unmount());host.remove();}
  });

  it('提交後把焦點送至明確顯示的已選結局',async()=>{
    const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
    try{
      await act(async()=>root.render(createElement(EndingResult,{ending:'歸隱故里'})));
      const result=host.querySelector('#ending-result');
      expect(result?.textContent).toBe('玩家選擇結局：歸隱故里');
      expect(result?.getAttribute('tabindex')).toBe('-1');
      expect(document.activeElement).toBe(result);
    }finally{await act(async()=>root.unmount());host.remove();}
  });
});
