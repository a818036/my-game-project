import type {GameState} from '../engine';

// These are read-only questions, not commands or a general conversation parser.
export function isAgeQuestion(text:string):boolean {
  const clean=text.trim().replace(/[\s!?！？。．，,、]/g,'');
  return /^(?:請問)?(?:我|主角|角色)(?:現在|目前|今年)?(?:才|到底|已經)?(?:幾歲|多大|多少歲)(?:了|啊|呢|呀)?$/.test(clean)
    || /^(?:請問)?(?:我|主角|角色)(?:現在|目前)?的?年齡(?:是)?(?:多少|幾歲)?$/.test(clean);
}
export function characterAgeLabel(state:GameState):string {
  const years=state.character.age;
  // The prototype begins on January 1; months come from the game calendar, not real time.
  return years<6?`${years} 歲 ${Math.max(0,state.world.month-1)} 個月`:`${years} 歲`;
}
export function answerAgeQuestion(text:string,state:GameState):string|null {
  if(!isAgeQuestion(text))return null;
  return `你目前是 ${characterAgeLabel(state)}，出生於西元 ${state.character.birthYear} 年；目前遊戲日期為西元 ${state.world.year} 年 ${state.world.month} 月。月齡依本世界線開局日與模型日曆計算。這次只查詢存檔，沒有執行勾選行動、推進時間或消耗資源。`;
}
