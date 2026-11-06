import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
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
});
