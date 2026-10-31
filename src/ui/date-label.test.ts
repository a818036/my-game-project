import {describe,expect,it} from 'vitest';
import {eraLabel} from './date-label';

describe('介面年號標籤',()=>{
  it('以中平年號及中文序數呈現 184 至 189 年',()=>{
    expect(Array.from({length:6},(_,index)=>eraLabel(184+index))).toEqual([
      '中平元年','中平二年','中平三年','中平四年','中平五年','中平六年',
    ]);
  });

  it('未建立年號對照的年份明確標示待補，不自行換算',()=>{
    expect(eraLabel(183)).toBe('年號待補（183年）');
    expect(eraLabel(190)).toBe('年號待補（190年）');
  });
});
