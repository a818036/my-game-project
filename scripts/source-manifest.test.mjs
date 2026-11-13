import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('原始規則來源清冊',()=>{
  it('所有手冊以 LF 正規化後的雜湊、位元組與行數均符合清冊',()=>{
    const manifest=JSON.parse(readFileSync(new URL('../SOURCE_MANIFEST.json',import.meta.url),'utf8'));
    expect(manifest.files.map(file=>file.path)).toEqual(expect.arrayContaining([
      'docs/source/神洲三國_規則手冊_v3.15.md',
      'docs/source/神洲三國_規則手冊_v3.16.md',
      'docs/source/神洲三國_規則手冊_v3.17.md',
      'docs/source/神洲三國_軒轅天生技全錄_v1.10.md',
    ]));
    for(const file of manifest.files){
      const original=readFileSync(new URL(`../${file.path}`,import.meta.url),'utf8');
      const canonical=Buffer.from(original.replace(/\r\n/g,'\n'),'utf8');
      const lines=canonical.toString('utf8').split('\n').length-(canonical.toString('utf8').endsWith('\n')?1:0);
      expect({path:file.path,sha256:createHash('sha256').update(canonical).digest('hex'),bytes:canonical.length,lines}).toEqual({path:file.path,sha256:file.sha256,bytes:file.bytes,lines:file.lines});
    }
  });
});
