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
    const foreground = ruleColor('.feature-nav button span');
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
    expect(rules.find((rule) => rule.selector === ':focus-visible,#ending-result:focus,#main-content:focus,#start-content:focus')?.declarations).toMatch(/outline-color:Highlight!important/);
    expect(rules.find((rule) => rule.selector === '.intent.selected')?.declarations).toMatch(/border:2px solid Highlight/);
    expect(rules.find((rule) => rule.selector === '.primary,.quiet')?.declarations).toMatch(/background:ButtonFace;color:ButtonText/);
    expect(rules.find((rule) => rule.selector === '.primary:disabled,.quiet:disabled,button:disabled')?.declarations).toMatch(/color:GrayText/);
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

  it('強制色彩模式將程式焦點落點改用系統高亮色', () => {
    const focus = rulesForCondition('@media(forced-colors:active)').find((rule) => rule.selector === ':focus-visible,#ending-result:focus,#main-content:focus,#start-content:focus')?.declarations;
    expect(focus).toMatch(/outline-color:Highlight!important/);
  });

  it('對話紀錄長字串允許斷行並維持一般正文尺寸',()=>{
    expect(lastRule('.dialogue-history li')).toMatch(/overflow-wrap:\s*anywhere/);
    const paragraph=lastRule('.dialogue-history li p');
    expect(paragraph).toMatch(/font-size:\s*16px\s*!important/);
    expect(paragraph).toMatch(/line-height:\s*1\.6/);
  });
});
