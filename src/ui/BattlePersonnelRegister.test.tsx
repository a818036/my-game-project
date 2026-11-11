// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import axe from 'axe-core';
import {BattlePersonnelRegister} from './BattlePersonnelRegister';

describe('A259 戰場具名軍籍介面',()=>{
  it('以原生可展開清單呈現個人傷亡狀態',()=>{
    const html=renderToStaticMarkup(createElement(BattlePersonnelRegister,{unitName:'守軍',personnel:[
      {id:'p1',name:'校尉甲',status:'killed'},
      {id:'p2',name:'軍士乙',status:'wounded'},
      {id:'p3',name:'軍士丙',status:'missing'},
      {id:'p4',name:'軍士丁',status:'captured'},
      {id:'p5',name:'軍士戊',status:'surrendered'},
    ]}));
    expect(html).toContain('<details class="personnel-register">');
    expect(html).toContain('<summary>守軍具名軍籍・5 人</summary>');
    for(const status of ['校尉甲・陣亡','軍士乙・受傷','軍士丙・失蹤','軍士丁・被俘','軍士戊・投降'])expect(html).toContain(status);
    expect(renderToStaticMarkup(createElement(BattlePersonnelRegister,{unitName:'舊存檔部隊'}))).toBe('');
  });

  it('A622 具名軍籍收合與展開狀態通過 axe-core 啟用規則',async()=>{
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
    const host=document.createElement('section');document.body.append(host);const root=createRoot(host);
    try{
      await act(async()=>root.render(createElement(BattlePersonnelRegister,{unitName:'守軍',personnel:[
        {id:'p1',name:'校尉甲',status:'killed'},
        {id:'p2',name:'軍士乙',status:'wounded'},
        {id:'p3',name:'軍士丙',status:'missing'},
      ]})));
      const scan=async()=>{
        const results=await axe.run(host,{rules:{'color-contrast':{enabled:false}}});
        expect(results.violations.map(({id,impact,nodes})=>({id,impact,targets:nodes.flatMap(node=>node.target.map(String))}))).toEqual([]);
      };
      await scan();
      await act(async()=>{host.querySelector<HTMLDetailsElement>('details')!.open=true;});
      expect(host.querySelector('ul[aria-label="守軍具名人員狀態"] li')?.textContent).toContain('陣亡');
      await scan();
    }finally{
      await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();
    }
  });
});
