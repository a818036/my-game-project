import { describe, expect, it } from 'vitest';
import { applyPhase2Action, createPhase2Model, type DialogueExchange } from './phase2';

const potential = { '統率': 20, '武力': 20, '智力': 20, '政治': 20, '魅力': 20 } as const;

describe('第六階段 A266：NPC 對話記憶上限', () => {
  it('每名人物最多保留最近四次，全世界線最多保留最近四十次', () => {
    let model = createPhase2Model('主角', 184, [], potential);
    const people = Array.from({ length: 11 }, (_, index) => ({
      id: `npc-${index}`,
      name: `人物${index}`,
      role: '測試人物',
      birthYear: 160,
      deathYear: null,
      alive: true,
      office: '白身',
      gender: '未設定',
    }));
    model.persons.push(...people);
    model.scene.presentIds = ['protagonist', ...people.map(person => person.id)];

    const submitted: DialogueExchange[] = [];
    for (let round = 0; round < 4; round++) {
      for (const person of people) {
        const exchange = {
          speakerId: person.id,
          speakerName: person.name,
          turn: 0,
          playerText: `${person.name}的第${round + 1}次提問`,
          npcText: `${person.name}的第${round + 1}次答覆`,
        };
        submitted.push(exchange);
        model = applyPhase2Action(model, { type: 'RecordDialogueExchange', exchange });
      }
    }

    expect(model.dialogueHistory).toHaveLength(40);
    expect(model.dialogueHistory).toEqual(submitted.slice(-40));
    for (const [index, person] of people.entries()) {
      expect(model.dialogueHistory!.filter(exchange => exchange.speakerId === person.id)).toHaveLength(index < 4 ? 3 : 4);
    }
  });
});
