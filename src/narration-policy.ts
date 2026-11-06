import type { GameCommand } from './engine';

/** Only settled world actions receive AI narration; questions and menu-only choices do not. */
export function shouldGenerateNarrative(command: GameCommand): boolean {
  if (command.type === 'Phase2Action' && command.action.type === 'RecordDialogueExchange') return false;
  if (command.type === 'Phase4Action' && command.action.type === 'PromptEnding') return false;
  return ['SubmitLifePlan', 'SubmitActionPlan', 'Phase2Action', 'InnateAction', 'Phase4Action'].includes(command.type);
}
