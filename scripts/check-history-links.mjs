import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(resolve(root, 'docs/HISTORY_CONTENT.md'), 'utf8');
const urls = [...new Set([...source.matchAll(/\[[^\]]+\]\((https:\/\/[^)]+)\)/g)].map((match) => match[1]))];
const results = new Array(urls.length);
let next = 0;

async function checkNext() {
  while (next < urls.length) {
    const index = next++;
    const url = urls[index];
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
      });
      await response.body?.cancel().catch(() => {});
      results[index] = { url, status: response.status, finalUrl: response.url };
    } catch (error) {
      results[index] = { url, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

await Promise.all(Array.from({ length: 6 }, () => checkNext()));

const failures = results.filter((result) => result.error || result.status < 200 || result.status >= 400);
if (failures.length > 0) {
  for (const failure of failures) console.error(JSON.stringify(failure));
  console.error(`失敗：${failures.length}/${urls.length} 個不同網址無法取得`);
  process.exitCode = 1;
} else {
  console.log(`通過：${urls.length} 個不同來源網址均回應 HTTP 2xx（依本次網路狀態）`);
}
