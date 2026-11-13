import { describe, expect, it } from 'vitest';
import { shouldGenerateNarrative } from './narration-policy';

describe('敘事呼叫界線', () => {
  it('玩家明確開啟大結局選擇時不呼叫旁白模型', () => {
    expect(shouldGenerateNarrative({
      version: 5, commandId: 'finale-prompt', expectedRevision: 4, worldlineId: 'test-world',
      type: 'Phase4Action', action: { type: 'PromptEnding' },
    })).toBe(false);
  });

  it('已結算的世界行動仍可產生敘事，純對話保存不產生行動旁白', () => {
    expect(shouldGenerateNarrative({
      version: 5, commandId: 'battle', expectedRevision: 4, worldlineId: 'test-world',
      type: 'Phase4Action', action: { type: 'AdvanceDays', days: 1 },
    })).toBe(true);
    expect(shouldGenerateNarrative({
      version: 5, commandId: 'dialogue', expectedRevision: 4, worldlineId: 'test-world',
      type: 'Phase2Action', action: { type: 'RecordDialogueExchange', exchange: { speakerId: 'npc', speakerName: '人物', turn: 1, playerText: '你好', npcText: '安好' } },
    })).toBe(false);
  });
});
