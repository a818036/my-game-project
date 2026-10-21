import {describe,expect,it} from 'vitest';
import {interpretFreeText,validateFreeTextCandidate} from './actions';

describe('第五階段・自由文字候選行動',()=>{
  it('將自然文字中的先後順序與方式轉成候選，不自行執行',()=>{
    const candidate=interpretFreeText('先讀兵書，再到市集做生意',[],[]);
    expect(candidate.actions).toEqual([{intent:'耕讀自持',order:1,method:'讀兵書'},{intent:'經商營生',order:2,method:'做生意'}]);
    expect(candidate.needsConfirmation).toBe(true);
    validateFreeTextCandidate(candidate,[],[]);
  });
  it('唯一在場人物目標可作為拜訪對象並記錄條件',()=>{
    const targets=[{id:'p-1',name:'陳伯和',alive:true,present:true}];
    const candidate=interpretFreeText('若陳伯和仍在場，就拜訪陳伯和',[],targets);
    expect(candidate.actions[0]).toMatchObject({intent:'遊歷鄉里',targetId:'p-1',targetName:'陳伯和',condition:'目標仍在場'});
    expect(candidate.questions).toEqual([]);
    validateFreeTextCandidate(candidate,[],targets);
  });
  it('指定人才只有命中可招攬候選時才產生命令；未知目標須澄清',()=>{
    const targets=[{id:'sample-scribe',name:'郡府書佐・示例人才',alive:true,present:false,recruitable:true}];
    const known=interpretFreeText('招攬郡府書佐',[],targets);
    expect(known.actions[0]).toMatchObject({intent:'訪求人才',targetId:'sample-scribe'});
    const unknown=interpretFreeText('招攬諸葛亮',[],targets);
    expect(unknown.questions.join(' ')).toContain('不是目前可辨識');
  });
  it('互斥行程、否定語意及未支援能力都停在理解階段',()=>{
    expect(interpretFreeText('先讀書再去遊歷村落',[],[]).conflicts.join(' ')).toContain('地點衝突');
    expect(interpretFreeText('不要經商',[],[]).questions.join(' ')).toContain('否定');
    const ability=interpretFreeText('使用天生技治療孫堅並救回死亡者',[],[]);
    expect(ability.unsupported.join(' ')).toContain('尚未支援');
    expect(ability.actions).toEqual([]);
  });
  it('玩家勾選項目與文字候選同樣接受規則衝突檢查',()=>{
    const candidate=interpretFreeText('再去遊歷鄉里', ['耕讀自持'],[]);
    expect(candidate.conflicts.join(' ')).toContain('地點衝突');
  });
});
