import {describe,expect,it} from 'vitest';
import {answerKnownHistoricalPersonTimelineQuestion} from './life';

describe('A373 other-person historical timeline queries',()=>{
  it('answers a Liu Bei timeline from sourced nodes without claiming a complete biography',()=>{
    const result=answerKnownHistoricalPersonTimelineQuestion('請整理劉備生平年表');
    expect(result?.kind).toBe('question');
    expect(result?.answer).toContain('劉備殺車胄、屯兵沛地');
    expect(result?.answer).toContain('《三國志》');
    expect(result?.answer).toContain('不是完整生平');
    expect(result?.choiceIds).toEqual([]);
  });

  it('includes only a sourced node that names Zhang Jue, not another person’s unrelated timeline',()=>{
    const result=answerKnownHistoricalPersonTimelineQuestion('請整理張角生平年表');
    expect(result?.answer).toContain('黃巾起事');
    expect(result?.answer).toContain('《後漢書》');
    expect(result?.answer).not.toContain('劉備殺車胄');
  });

  it('leaves Sun Quan to the existing precision-aware biography path and ignores ordinary questions',()=>{
    expect(answerKnownHistoricalPersonTimelineQuestion('請整理孫權生平年表')).toBeNull();
    expect(answerKnownHistoricalPersonTimelineQuestion('曹操是誰？')).toBeNull();
  });
});
