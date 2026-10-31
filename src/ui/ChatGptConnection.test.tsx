// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {ChatGptConnection} from './ChatGptConnection';

describe('ChatGPT 訂閱連線介面',()=>{
  afterEach(()=>vi.unstubAllGlobals());

  it('連線狀態載入後登入操作仍以繁體中文呈現',async()=>{
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
    vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{
      const url=String(input);
      if(url==='/api/health')return new Response(JSON.stringify({provider:'chatgpt'}),{status:200});
      if(url==='/api/chatgpt/status')return new Response(JSON.stringify({accounts:[],activeId:null,connected:false,planEnabled:false,model:'',models:[],message:'',pending:false}),{status:200});
      throw new Error(`未預期的連線要求：${url}`);
    }));
    const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
    try{
      await act(async()=>{root.render(createElement(ChatGptConnection));});
      expect(container.textContent).toContain('使用 ChatGPT 帳戶登入');
      expect(container.textContent).not.toContain('Continue with ChatGPT');
    }finally{
      await act(async()=>{root.unmount();});container.remove();
    }
  });
});
