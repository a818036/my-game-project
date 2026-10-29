import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ActivityAnnouncer} from './ActivityAnnouncer';

describe('異步操作螢幕閱讀器狀態',()=>{
  it('以可讀的 polite status 區域宣告保存與敘事進度',()=>{
    const saving=renderToStaticMarkup(createElement(ActivityAnnouncer,{message:'正在保存並結算操作。'}));
    expect(saving).toContain('role="status"');expect(saving).toContain('aria-live="polite"');expect(saving).toContain('aria-atomic="true"');expect(saving).toContain('visually-hidden');expect(saving).toContain('正在保存並結算操作。');
    const narrating=renderToStaticMarkup(createElement(ActivityAnnouncer,{message:'遊戲狀態已保存，正在整理本回合敘事。'}));
    expect(narrating).toContain('遊戲狀態已保存，正在整理本回合敘事。');
  });
});
