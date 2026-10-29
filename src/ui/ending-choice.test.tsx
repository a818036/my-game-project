import {describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {EndingChoice} from './EndingChoice';

describe('EndingChoice',()=>{
  it('以明確標籤呈現玩家結局輸入，空白內容時不提供可提交按鈕',()=>{
    const html=renderToStaticMarkup(createElement(EndingChoice,{value:'   ',onChange:vi.fn(),onChoose:vi.fn()}));
    expect(html).toContain('<label for="ending-direction">你決定的結局方向</label>');
    expect(html).toContain('id="ending-direction"');
    expect(html).toContain('maxLength="80"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('只有按下確認才會記錄你的結局選擇');
  });

  it('有選擇時顯示明確的提交按鈕',()=>{
    const html=renderToStaticMarkup(createElement(EndingChoice,{value:'歸隱故里',onChange:vi.fn(),onChoose:vi.fn()}));
    expect(html).toContain('確認選擇結局');
    expect(html).not.toContain('disabled=""');
  });
});
