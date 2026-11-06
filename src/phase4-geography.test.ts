import {describe,expect,it} from 'vitest';
import {HAN_DONGHAI_COUNTY_NAMES,HAN_LANGYA_COUNTY_NAMES,HAN_PENGCHENG_COUNTY_NAMES,HAN_GUANGLING_COUNTY_NAMES,HAN_XIAPI_COUNTY_NAMES,HAN_DIVISION_SOURCE_URLS} from './phase4-geography';

describe('《後漢書》徐州刺史部名錄',()=>{
  it('依卷一一一原文順序核對五郡國共六十二項',()=>{
    const registers=[HAN_DONGHAI_COUNTY_NAMES,HAN_LANGYA_COUNTY_NAMES,HAN_PENGCHENG_COUNTY_NAMES,HAN_GUANGLING_COUNTY_NAMES,HAN_XIAPI_COUNTY_NAMES];
    expect(registers.map(names=>names.length)).toEqual([13,13,8,11,17]);
    expect(registers.reduce((sum,names)=>sum+names.length,0)).toBe(62);
    expect(HAN_DONGHAI_COUNTY_NAMES).toEqual(['郯','蘭陵','戚','朐','襄賁','昌慮','承','陰平','利城','合鄉','祝其','厚丘','贛楡']);
    expect(HAN_LANGYA_COUNTY_NAMES).toEqual(['開陽','東武','琅邪','東莞','西海','諸','莒','東安','陽都','臨沂','即丘','繒','姑幕']);
    expect(HAN_PENGCHENG_COUNTY_NAMES).toEqual(['彭城','武原','傅陽','呂','留','梧','菑丘','廣戚']);
    expect(HAN_GUANGLING_COUNTY_NAMES).toEqual(['廣陵','江都','髙郵','平安','淩','東陽','射陽','鹽瀆','輿','堂邑','海西']);
    expect(HAN_XIAPI_COUNTY_NAMES).toEqual(['下邳','徐','僮','睢陵','下相','淮陰','淮浦','盱臺','髙山','潘旌','淮陵','取慮','東成','曲陽','司吾','良成','夏丘']);
    for(const key of ['donghai','langya','pengcheng','guangling','xiapi'] as const)expect(HAN_DIVISION_SOURCE_URLS[key]).toBe(HAN_DIVISION_SOURCE_URLS.chenliu);
  });
});
