import { describe, expect, it } from 'vitest';
// @ts-expect-error Node types are not part of the browser app; Vitest runs this test in Node.
import { readFileSync } from 'node:fs';

const stylesheet: string = readFileSync(new URL('./style.css', import.meta.url), 'utf8');

function ruleColor(selector: string): string {
  const declaration = stylesheet.split('}').map((rule) => rule.split('{')).find(([name]) => name.trim() === selector)?.[1];
  const match = declaration?.match(/(?:^|;)\s*color:\s*(#[0-9a-fA-F]{6})/);
  if (!match) throw new Error(`Missing color declaration for ${selector}`);
  return match[1];
}

function lastRule(selector: string): string {
  const declarations = stylesheet.split('}').map((rule) => rule.split('{')).filter(([name]) => name?.trim() === selector).at(-1)?.[1];
  if (!declarations) throw new Error(`Missing CSS rule for ${selector}`);
  return declarations;
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

  it('開局表單標籤跟隨閱讀字級，出生確認文字至少 16px 並達 AA 對比', () => {
    expect(lastRule('.start-card label')).toMatch(/font-size:\s*1rem/);
    const confirmation = lastRule('.start-card .confirm');
    expect(confirmation).toMatch(/font-size:\s*1rem\s*!important/);
    expect(confirmation).toMatch(/color:\s*(#[0-9a-fA-F]{6})\s*!important/);
    const foreground = confirmation.match(/color:\s*(#[0-9a-fA-F]{6})\s*!important/)![1];
    expect(contrastRatio(foreground, '#1b2724')).toBeGreaterThanOrEqual(4.5);
  });

  it('Windows 強制色彩模式仍以系統色標示焦點、選取及按鈕狀態', () => {
    expect(stylesheet).toMatch(/@media\s*\(forced-colors:\s*active\)/);
    expect(stylesheet).toMatch(/:focus-visible\s*\{[^}]*outline-color:\s*Highlight/s);
    expect(stylesheet).toMatch(/\.intent\.selected\s*\{[^}]*border:[^}]*Highlight/s);
    expect(stylesheet).toMatch(/\.primary\s*,\s*\.quiet\s*\{[^}]*ButtonFace[^}]*ButtonText/s);
    expect(stylesheet).not.toMatch(/forced-color-adjust:\s*none/);
  });
});
