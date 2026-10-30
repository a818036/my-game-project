// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HAN_DIVISION_SOURCE_URLS } from '../phase4-geography';
import { HistoricalGeographyRegisters } from './HistoricalGeographyRegisters';

describe('史料郡縣名錄的可存取標記', () => {
  it('一百零五份名錄使用原生 details/summary、具名清單與可辨識原典連結', () => {
    const html = renderToStaticMarkup(createElement(HistoricalGeographyRegisters));
    expect([...html.matchAll(/<details\b/g)]).toHaveLength(105);
    expect([...html.matchAll(/<summary>/g)]).toHaveLength(105);
    expect([...html.matchAll(/<ol class="county-index" aria-label="[^"]+">/g)]).toHaveLength(105);
    expect([...html.matchAll(/target="_blank" rel="noreferrer"/g)]).toHaveLength(105);
    expect([...html.matchAll(/<li>/g)]).toHaveLength(1181);
    const accessibleNames = [...html.matchAll(/<ol class="county-index" aria-label="([^"]+)">/g)].map((match) => match[1]);
    expect(new Set(accessibleNames).size).toBe(105);
    expect(html).toContain('東部（原文；校勘記疑為訛文）');
    for (const key of ['chenliu', 'dong', 'dongping', 'rencheng', 'taishan', 'jibei', 'shanyang', 'jiyin', 'donghai', 'langya', 'pengcheng', 'guangling', 'xiapi', 'henanYin', 'yingchuan', 'jinan', 'pingyuan', 'lean', 'beihai', 'donglai', 'qi', 'nanyang', 'nanCommandery', 'jiangxia', 'lingling', 'guiyang', 'wuling', 'changsha', 'yuzhang', 'kuaiji', 'danyang', 'jiujiang', 'lujiang', 'wu', 'hanzhong', 'ba', 'guanghan', 'shu', 'qianwei', 'zangke', 'yuesui', 'yizhou', 'yongchang', 'guanghanDependent', 'shuDependent', 'qianweiDependent', 'longxi', 'hanyang', 'wudu', 'jincheng', 'anding', 'beidi', 'wuwei', 'zhangye', 'jiuquan', 'dunhuang', 'zhangyeDependent', 'juyanDependent', 'shangdang', 'taiyuan', 'shangjun', 'xihe', 'wuyuan', 'yunzhong', 'dingxiang', 'yanmen', 'shuofang', 'zhuo', 'guangyang', 'dai', 'shanggu', 'yuyang', 'youbeiping', 'liaoxi', 'liaodong', 'xuantu', 'lelang', 'liaodongDependent', 'nanhai', 'cangwu', 'yulin', 'hep', 'jiaozhi', 'jiuzhen', 'rinan', 'runan', 'liang', 'pei', 'chen', 'lu', 'wei', 'julu', 'changshan', 'zhongshan', 'anping', 'hejian', 'qinghe', 'zhao', 'bohai', 'henei', 'hedong', 'hongnong', 'jingzhao', 'zuofengyi', 'youfufeng'] as const) {
      expect(html).toContain(`href="${HAN_DIVISION_SOURCE_URLS[key]}"`);
    }
  });

  it('每份名錄均有來源可見連結文字及適當的跨時段限定', () => {
    const html = renderToStaticMarkup(createElement(HistoricalGeographyRegisters));
    expect(html).toContain('<label for="county-register-search">搜尋郡縣名目</label>');
    expect(html).toContain('id="county-register-search-help"');
    expect(html).toContain('aria-describedby="county-register-search-help"');
    expect(html).toContain('不代表單一年份');
    expect(html).toContain('查閱《後漢書》');
    expect(html).toContain('這不是精確對應某一遊戲年份');
  });

  it('可跨名錄搜尋原字、回報結果並保留該份原典連結', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(createElement(HistoricalGeographyRegisters)));
      const search = host.querySelector<HTMLInputElement>('#county-register-search')!;
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      await act(async () => {
        setValue.call(search, '豫州');
        search.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(host.querySelector('[role="status"]')?.textContent).toBe('找到 99 個名目，來自 6 份名錄。');
      expect(host.querySelectorAll('.county-search-result')).toHaveLength(6);
      expect(host.textContent).toContain('豫州・潁川郡縣名錄');

      await act(async () => {
        setValue.call(search, '潁陰');
        search.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(host.querySelector('[role="status"]')?.textContent).toBe('找到 1 個名目，來自 1 份名錄。');
      expect(host.textContent).toContain('潁陰');
      expect(host.querySelector(`a[href="${HAN_DIVISION_SOURCE_URLS.yingchuan}"]`)).not.toBeNull();
      expect(host.querySelector('details.county-index-details')).toBeNull();

      await act(async () => {
        setValue.call(search, '沒有這個地名');
        search.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(host.querySelector('[role="status"]')?.textContent).toContain('沒有符合');
      await act(async () => {
        setValue.call(search, '');
        search.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(host.querySelectorAll('details.county-index-details')).toHaveLength(105);
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.unstubAllGlobals();
    }
  });
});
