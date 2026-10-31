import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(resolve(root, 'docs/HISTORY_CONTENT.md'), 'utf8');
const urls = [...new Set([...source.matchAll(/\[[^\]]+\]\((https:\/\/[^)]+)\)/g)].map((match) => match[1]))];
if (urls.length === 0) {
  console.error('失敗：來源索引中找不到任何 HTTPS 原典連結');
  process.exit(1);
}
const results = new Array(urls.length);
const maxAttempts = 5;
const concurrency = 4;
let next = 0;

async function checkNext() {
  while (next < urls.length) {
    const index = next++;
    const url = urls[index];
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(20_000),
        });
        const shouldRetry = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
        if (shouldRetry && attempt < maxAttempts - 1) {
          await response.body?.cancel().catch(() => {});
        } else {
          results[index] = { url, status: response.status, finalUrl: response.url, attempts: attempt + 1 };
          await response.body?.cancel().catch(() => {});
          break;
        }
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          const cause = error instanceof Error && 'cause' in error ? error.cause : undefined;
          results[index] = {
            url,
            error: error instanceof Error ? error.message : String(error),
            attempts: attempt + 1,
            ...(cause && typeof cause === 'object' && 'code' in cause ? { cause: cause.code } : {}),
          };
          break;
        }
      }

      await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * 2 ** attempt));
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => checkNext()));

const failures = results.filter((result) => result.error || result.status < 200 || result.status >= 300);
if (failures.length > 0) {
  for (const failure of failures) console.error(JSON.stringify(failure));
  console.error(`失敗：${failures.length}/${urls.length} 個不同網址無法取得`);
  process.exitCode = 1;
} else {
  const retries = results.reduce((total, result) => total + (result.attempts ?? 1) - 1, 0);
  console.log(`通過：${urls.length} 個不同來源網址均回應 HTTP 2xx（共 ${retries} 次重試，依本次網路狀態）`);
}
