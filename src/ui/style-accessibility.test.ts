import { describe, expect, it } from 'vitest';
// @ts-expect-error Node types are not part of the browser app; Vitest runs this test in Node.
import { readFileSync } from 'node:fs';

const stylesheet: string = readFileSync(new URL('./style.css', import.meta.url), 'utf8');

interface CssRule { selector: string; declarations: string; conditions: string[]; }

function parseCssRules(css: string, start = 0, end = css.length, result: CssRule[] = [], conditions: string[] = []): CssRule[] {
  let cursor = start;
  while (cursor < end) {
    while (/\s/.test(css[cursor] ?? '')) cursor++;
    if (css[cursor] === '}') return result;
    const open = css.indexOf('{', cursor);
    if (open < 0 || open >= end) return result;
    const selector = css.slice(cursor, open).trim();
    let depth = 1;
    let close = open + 1;
    while (close < end && depth > 0) {
      if (css[close] === '{') depth++;
      else if (css[close] === '}') depth--;
      close++;
    }
    const bodyEnd = close - 1;
    if (selector.startsWith('@')) parseCssRules(css, open + 1, bodyEnd, result, [...conditions, selector]);
    else result.push({ selector, declarations: css.slice(open + 1, bodyEnd).trim(), conditions });
    cursor = close;
  }
  return result;
}

const cssRules = parseCssRules(stylesheet);

function rulesForSelector(selector: string): CssRule[] {
  const requested = selector.split(',').map((part) => part.trim()).join(',');
  return cssRules.filter((rule) => {
    const selectors = rule.selector.split(',').map((part) => part.trim());
    return selectors.includes(selector) || selectors.join(',') === requested;
  });
}

function rulesForCondition(condition: string): CssRule[] {
  return cssRules.filter((rule) => rule.conditions.includes(condition));
}

function ruleColor(selector: string): string {
  const match = rulesForSelector(selector).map((rule) => rule.declarations).map((declaration) => declaration.match(/(?:^|;)\s*color:\s*(#[0-9a-fA-F]{6})/)).find(Boolean);
  if (!match) throw new Error(`Missing color declaration for ${selector}`);
  return match[1];
}

function lastRule(selector: string): string {
  const declarations = rulesForSelector(selector).at(-1)?.declarations;
  if (declarations === undefined) throw new Error(`Missing CSS rule for ${selector}`);
  return declarations;
}

function ruleMatching(selector: string, pattern: RegExp): string {
  const declarations = rulesForSelector(selector).find((rule) => pattern.test(rule.declarations))?.declarations;
  if (declarations === undefined) throw new Error(`Missing matching CSS rule for ${selector}`);
  return declarations;
}

function lastRuleColor(selector: string): string {
  const match = rulesForSelector(selector).reverse().map((rule) => rule.declarations.match(/(?:^|;)\s*color:\s*(#[0-9a-fA-F]{6})/)).find(Boolean);
  if (!match) throw new Error(`Missing color declaration for ${selector}`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = hex.match(/[0-9a-fA-F]{2}/g)!.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('主要淺色介面的文字對比', () => {
  it('新聞列小字在新聞底色上達到 WCAG AA 一般文字對比', () => {
    expect(contrastRatio(ruleColor('.news-strip .caption'), '#eee4d1')).toBeGreaterThanOrEqual(4.5);
  });

  it('分頁箭頭在一般與選取狀態下保持清楚可見', () => {
    const foreground = ruleColor('.feature-nav label span:last-child');
    expect(contrastRatio(foreground, '#f5eedf')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(foreground, '#eee3cf')).toBeGreaterThanOrEqual(4.5);
  });

  it('故事輔助文字、行動說明及主要按鈕均達 WCAG AA 一般文字對比', () => {
    expect(contrastRatio(ruleColor('.story-panel .section-kicker'), '#e9dfc7')).toBeGreaterThanOrEqual(4.5);

    const intentDescription = lastRuleColor('.intent small');
    expect(contrastRatio(intentDescription, '#f5eedf')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(intentDescription, '#efe3cf')).toBeGreaterThanOrEqual(4.5);

    const planText = lastRuleColor('.plan-review');
    expect(contrastRatio(planText, '#f0dfd2')).toBeGreaterThanOrEqual(4.5);

    const seal = stylesheet.match(/--seal:\s*(#[0-9a-fA-F]{6})/)![1];
    expect(contrastRatio(lastRuleColor('.primary'), seal)).toBeGreaterThanOrEqual(4.5);
  });

  it('停用的主要按鈕仍保留可讀標籤與明確邊界', () => {
    const disabled = rulesForSelector('.primary:disabled').find((rule) => rule.conditions.length === 0)?.declarations;
    expect(disabled).toBeDefined();
    const declarations = disabled!;
    const foregroundValue = declarations.match(/(?:^|;)color:\s*(#[0-9a-fA-F]{6}|var\(--ink\))/)?.[1];
    const foreground = foregroundValue === 'var(--ink)' ? stylesheet.match(/--ink:\s*(#[0-9a-fA-F]{6})/)?.[1] : foregroundValue;
    const background = declarations.match(/(?:^|;)background:\s*(#[0-9a-fA-F]{6})/)?.[1];
    expect(declarations).toMatch(/opacity:\s*1(?:;|$)/);
    expect(foreground).toBeDefined();
    expect(background).toBeDefined();
    expect(contrastRatio(foreground!, background!)).toBeGreaterThanOrEqual(4.5);
    expect(declarations).toMatch(/border:\s*1px solid #[0-9a-fA-F]{6}/);
  });

  it('已故家庭成員標示在淺色閱讀背景達 WCAG AA 一般文字對比', () => {
    const deceased = lastRuleColor('.family-list .deceased,.deceased');
    for (const background of ['#f5eedf', '#f7f1e4', '#f2eadb']) {
      expect(contrastRatio(deceased, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('場景時間、抵達資訊及人物潛質註解在紙色背景達 WCAG AA 對比', () => {
    expect(contrastRatio(lastRuleColor('.scene-place span,.scene-arrivals'), '#f5eedf')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lastRuleColor('.profile .caption'), '#f5eedf')).toBeGreaterThanOrEqual(4.5);
  });

  it('州郡名錄的所屬欄文字在索引底色達 WCAG AA 對比', () => {
    expect(contrastRatio(lastRuleColor('.division-index li span'), '#f5eddd')).toBeGreaterThanOrEqual(4.5);
  });

  it('回合標記與世界線資訊在紙色底達 WCAG AA 對比', () => {
    const paper = '#f7f1e4';
    expect(contrastRatio(lastRuleColor('.round'), paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lastRuleColor('.worldline'), paper)).toBeGreaterThanOrEqual(4.5);
    const seal = stylesheet.match(/--seal:\s*(#[0-9a-fA-F]{6})/)![1];
    expect(contrastRatio(seal, paper)).toBeGreaterThanOrEqual(4.5);
    const wood = stylesheet.match(/--wood:\s*(#[0-9a-fA-F]{6})/)![1];
    expect(contrastRatio(wood, paper)).toBeGreaterThanOrEqual(4.5);
  });

  it('通知、場景對話、日誌及軍政表單文字在閱讀底色達 WCAG AA 對比', () => {
    expect(contrastRatio(lastRuleColor('.notice'), '#f0dfd2')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lastRuleColor('.scene-panel .speech'), '#f5eedf')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lastRuleColor('.log li p'), '#f5eedf')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lastRuleColor('.phase-panel label'), '#f5eedf')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lastRuleColor('.summary summary,.folds summary'), '#f5eedf')).toBeGreaterThanOrEqual(4.5);
  });

  it('開局表單標籤跟隨閱讀字級，出生確認文字至少 16px 並達 AA 對比', () => {
    expect(lastRule('.start-card label')).toMatch(/font-size:\s*1rem/);
    const confirmation = lastRule('.start-card .confirm');
    expect(confirmation).toMatch(/font-size:\s*1rem\s*!important/);
    expect(confirmation).toMatch(/color:\s*(#[0-9a-fA-F]{6})\s*!important/);
    const foreground = confirmation.match(/color:\s*(#[0-9a-fA-F]{6})\s*!important/)![1];
    expect(contrastRatio(foreground, '#1b2724')).toBeGreaterThanOrEqual(4.5);
  });

  it('Windows 強制色彩模式仍以系統色標示焦點、選取及按鈕狀態', () => {
    const rules = rulesForCondition('@media(forced-colors:active)');
    expect(rules.find((rule) => rule.selector.startsWith(':focus-visible,#ending-result:focus,#main-content:focus,#start-content:focus'))?.declarations).toMatch(/outline-color:Highlight!important/);
    const selectedIntent = rules.find((rule) => rule.selector === '.intent.selected')?.declarations;
    expect(selectedIntent).toMatch(/border:2px solid Highlight/);
    expect(selectedIntent).toMatch(/box-shadow:none/);
    expect(rules.find((rule) => rule.selector === '.feature-nav label.active')?.declarations).toMatch(/border-color:Highlight/);
    expect(rules.find((rule) => rule.selector === '.feature-nav label:focus-within')?.declarations).toMatch(/outline-color:Highlight/);
    expect(rules.find((rule) => rule.selector === '.skip-link')?.declarations).toMatch(/background:Canvas;color:CanvasText;border-color:Highlight/);
    expect(rules.find((rule) => rule.selector === '.primary,.quiet')?.declarations).toMatch(/background:ButtonFace;color:ButtonText/);
    const disabled = rules.find((rule) => rule.selector === '.primary:disabled,.quiet:disabled,button:disabled')?.declarations;
    expect(disabled).toMatch(/border-color:GrayText/);
    expect(disabled).toMatch(/color:GrayText/);
    expect(stylesheet).not.toMatch(/forced-color-adjust:\s*none/);
  });

  it('尊重減少動態效果偏好，停用平滑捲動及動畫轉場', () => {
    const motion = rulesForCondition('@media(prefers-reduced-motion:reduce)');
    const allElements = motion.find((rule) => rule.selector === '*,*::before,*::after')?.declarations;
    expect(allElements).toMatch(/scroll-behavior:auto!important/);
    expect(allElements).toMatch(/animation-duration:\.01ms!important/);
    expect(allElements).toMatch(/animation-iteration-count:1!important/);
    expect(allElements).toMatch(/transition-duration:\.01ms!important/);
  });

  it('跳轉連結抵達主要內容或開局表單時保留可見焦點框', () => {
    const targetFocus = ruleMatching('#main-content:focus,#start-content:focus', /outline:\s*3px solid var\(--seal\)/);
    expect(targetFocus).toMatch(/outline:\s*3px solid var\(--seal\)/);
    expect(targetFocus).not.toMatch(/outline:\s*none/);
    expect(ruleMatching('.skip-link:focus', /outline:\s*3px solid/)).toMatch(/outline:\s*3px solid/);
  });

  it('開局姓名及出生欄位覆寫基礎 outline:none，鍵盤聚焦時仍有清晰外框', () => {
    const textField = ruleMatching('.start-card input:not([type=checkbox]):focus-visible,.start-card select:focus-visible', /outline:\s*3px solid #a33b2d/);
    expect(textField).toMatch(/outline-offset:\s*2px/);
    const baseRule = lastRule('.start-card input:not([type=checkbox]),.start-card select');
    expect(baseRule).toMatch(/outline:\s*none/);
    expect(textField).not.toMatch(/outline:\s*none/);
  });

  it('跳轉連結、存檔救援及行動衝突文字在各自底色達 WCAG AA 對比', () => {
    expect(contrastRatio(lastRuleColor('.skip-link'), '#8e3329')).toBeGreaterThanOrEqual(4.5);

    const recoveryBackground = '#382a24';
    expect(contrastRatio(lastRuleColor('.save-recovery'), recoveryBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lastRuleColor('.save-recovery .quiet'), recoveryBackground)).toBeGreaterThanOrEqual(4.5);

    expect(contrastRatio(lastRuleColor('.plan-review .conflict'), '#f0dfd2')).toBeGreaterThanOrEqual(4.5);
  });

  it('高影響確認對話框的標題與說明文字達 WCAG AA 對比', () => {
    const dialogBackground = '#f5eedf';
    expect(contrastRatio(lastRuleColor('.confirm-dialog h2'), dialogBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lastRuleColor('.confirm-dialog p'), dialogBackground)).toBeGreaterThanOrEqual(4.5);
  });

  it('必要命名對話框標題、說明與標籤在紙色背景達 WCAG AA 對比', () => {
    const dialogBackground = '#f5eedf';
    for (const selector of ['.name-dialog h2', '.name-dialog p', '.name-dialog label']) {
      expect(contrastRatio(lastRuleColor(selector), dialogBackground), selector).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('結局方向與軍政文字欄在閱讀底色達 WCAG AA 並保留可操作高度', () => {
    const selector = '.phase-panel select,.phase-panel input,.phase-panel textarea,.phase4-panel select,.phase4-panel input,.phase4-panel textarea';
    const declarations = lastRule(selector);
    const foregroundValue = declarations.match(/(?:^|;)color:\s*(#[0-9a-fA-F]{6}|var\(--ink\))/)?.[1];
    const foreground = foregroundValue === 'var(--ink)' ? stylesheet.match(/--ink:\s*(#[0-9a-fA-F]{6})/)?.[1] : foregroundValue;
    const background = declarations.match(/(?:^|;)background:\s*(#[0-9a-fA-F]{6})/)?.[1];
    expect(foreground).toBeDefined();
    expect(background).toBeDefined();
    expect(contrastRatio(foreground!, background!)).toBeGreaterThanOrEqual(4.5);
    expect(declarations).toMatch(/min-height:\s*44px/);
  });

  it('ChatGPT 模型選擇欄使用高對比閱讀底色與易操作高度', () => {
    const select = lastRule('.chatgpt-connection select');
    const ink = stylesheet.match(/--ink:\s*(#[0-9a-fA-F]{6})/)![1];
    expect(select).toMatch(/min-height:\s*44px/);
    expect(select).toMatch(/padding:\s*8px 10px/);
    expect(select).toMatch(/background:\s*#fffaf0/);
    expect(select).toMatch(/color:\s*var\(--ink\)/);
    expect(select).toMatch(/border:\s*1px solid #b8a486/);
    expect(contrastRatio(ink, '#fffaf0')).toBeGreaterThanOrEqual(4.5);
  });

  it('強制色彩模式將程式焦點落點改用系統高亮色', () => {
    const focus = rulesForCondition('@media(forced-colors:active)').find((rule) => rule.selector.startsWith(':focus-visible,#ending-result:focus,#main-content:focus,#start-content:focus'))?.declarations;
    expect(focus).toMatch(/outline-color:Highlight!important/);
  });

  it('一般鍵盤焦點框對淺色介面達到 3:1 非文字對比', () => {
    const focus = ruleMatching('button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible', /outline:\s*3px solid #[0-9a-fA-F]{6}/);
    const color = focus.match(/outline:\s*3px solid (#[0-9a-fA-F]{6})/)?.[1];
    expect(color).toBeDefined();
    for (const background of ['#f5eedf', '#fffaf0', '#eee3cf']) {
      expect(contrastRatio(color!, background), background).toBeGreaterThanOrEqual(3);
    }
  });

  it('命名視窗的焦點框依實際淺色底達到 3:1', () => {
    const declarations = cssRules.filter((rule) => rule.selector === '.name-dialog input:focus-visible' && rule.conditions.length === 0).at(-1)?.declarations ?? '';
    const modalRule = cssRules.filter((rule) => rule.conditions.length === 0 && rule.selector.split(',').map((selector) => selector.trim()).includes('.name-dialog')).at(-1)?.declarations ?? '';
    const focusColor = declarations.match(/outline:\s*3px solid (#[0-9a-fA-F]{6})!important/)?.[1];
    const modalBackground = modalRule.match(/background:\s*(#[0-9a-fA-F]{6})/)?.[1];
    expect(focusColor).toBeDefined();
    expect(modalBackground).toBeDefined();
    expect(contrastRatio(focusColor!, modalBackground!)).toBeGreaterThanOrEqual(3);
    const forcedColors = rulesForCondition('@media(forced-colors:active)').find((rule) => rule.selector.includes('.name-dialog input:focus-visible'))?.declarations;
    expect(forcedColors).toMatch(/outline-color:Highlight!important/);
  });

  it('強制色彩模式保留選取、分頁、跳轉及按鈕的系統色辨識', () => {
    const rules = rulesForCondition('@media(forced-colors:active)');
    const declaration = (selector: string) => rules.find((rule) => rule.selector === selector)?.declarations ?? '';

    expect(declaration('.intent.selected')).toMatch(/border:2px solid Highlight/);
    expect(declaration('.intent.selected')).toMatch(/box-shadow:none/);
    expect(declaration('.feature-nav label.active')).toMatch(/border-color:Highlight/);
    expect(declaration('.feature-nav label:focus-within')).toMatch(/outline-color:Highlight/);
    expect(declaration('.skip-link')).toMatch(/background:Canvas/);
    expect(declaration('.skip-link')).toMatch(/color:CanvasText/);
    expect(declaration('.skip-link')).toMatch(/border-color:Highlight/);
    expect(declaration('.primary,.quiet')).toMatch(/background:ButtonFace/);
    expect(declaration('.primary,.quiet')).toMatch(/color:ButtonText/);
    expect(declaration('.primary:disabled,.quiet:disabled,button:disabled')).toMatch(/border-color:GrayText/);
    expect(declaration('.primary:disabled,.quiet:disabled,button:disabled')).toMatch(/color:GrayText/);
    const startFieldFocus = rules.find((rule) => rule.selector.includes('.start-card input:not([type=checkbox]):focus-visible') && rule.selector.includes('.start-card select:focus-visible'))?.declarations;
    expect(startFieldFocus).toMatch(/outline-color:Highlight!important/);
  });

  it('對話紀錄長字串允許斷行並維持一般正文尺寸',()=>{
    expect(lastRule('.dialogue-history li')).toMatch(/overflow-wrap:\s*anywhere/);
    const paragraph=lastRule('.dialogue-history li p');
    expect(paragraph).toMatch(/font-size:\s*16px\s*!important/);
    expect(paragraph).toMatch(/line-height:\s*1\.6/);
  });
});
