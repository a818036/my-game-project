import {describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createOpeningFacts,dispatch,ENGINE_VERSION} from '../engine';
import {LifeActionPanel} from './LifeActionPanel';

describe('LifeActionPanel 無障礙語意',()=>{
  it('將可複選的生活行動以標題命名為同一組',()=>{
    const facts=createOpeningFacts(19,184,{regions:[],surnames:[]});
    const state=dispatch(null,{version:ENGINE_VERSION,commandId:'accessible-life-action',expectedRevision:0,type:'StartGame',name:'主角',seed:19,facts}).state!;
    const html=renderToStaticMarkup(createElement(LifeActionPanel,{state,busy:false,onRun:vi.fn(async()=>true)}));

    expect(html).toContain('<h2 id="life-action-heading">你想怎麼做？</h2>');
    expect(html).toContain('<div class="intent-grid" role="group" aria-labelledby="life-action-heading">');
    expect([...html.matchAll(/type="checkbox"/g)]).toHaveLength(4);
    expect(html).toContain('行動、詢問或想說的話');
  });
});
