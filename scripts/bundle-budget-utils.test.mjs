import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectStaticJavaScriptClosure, staticJavaScriptImports } from './bundle-budget-utils.mjs';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('首頁 JavaScript 靜態相依預算', () => {
  it('辨認 minified 靜態匯入並忽略動態匯入', () => {
    const source = 'import{a}from"./engine.js";import"./style.css";export{b}from"../shared.js";import("./deferred.js");';
    expect(staticJavaScriptImports(source)).toEqual(['./engine.js', './style.css', '../shared.js']);
  });

  it('遞迴計算首頁靜態相依、只計一次循環檔案，且排除動態 chunk', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'bundle-budget-'));
    temporaryDirectories.push(directory);
    const entry = join(directory, 'index.js');
    const engine = join(directory, 'engine.js');
    const nested = join(directory, 'nested.js');
    const deferred = join(directory, 'deferred.js');
    await writeFile(entry, 'import{run}from"./engine.js";import("./deferred.js");');
    await writeFile(engine, 'import"./index.js";import{value}from"./nested.js";');
    await writeFile(nested, 'export const value=1;');
    await writeFile(deferred, 'export const deferred=true;');

    const files = await collectStaticJavaScriptClosure(entry);
    expect(files.map((file) => file.path).sort()).toEqual([entry, engine, nested].sort());
    expect(files.reduce((total, file) => total + file.bytes, 0)).toBe(
      (await readFile(entry)).byteLength + (await readFile(engine)).byteLength + (await readFile(nested)).byteLength,
    );
  });
});
