import {
  HAN_BEIHAI_COUNTY_NAMES,
  HAN_DANYANG_COUNTY_NAMES,
  HAN_DONGLAI_COUNTY_NAMES,
  HAN_DIVISION_SOURCE_URLS,
  HAN_HENAN_YIN_COUNTY_NAMES,
  HAN_JIUJIANG_COUNTY_NAMES,
  HAN_JINAN_COUNTY_NAMES,
  HAN_LEAN_COUNTY_NAMES,
  HAN_KUAIJI_COUNTY_NAMES,
  HAN_LUJIANG_COUNTY_NAMES,
  HAN_NANYANG_COUNTY_NAMES,
  HAN_PINGYUAN_COUNTY_NAMES,
  HAN_QI_COUNTY_NAMES,
  HAN_WU_COUNTY_NAMES,
  HAN_YINGCHUAN_COUNTY_NAMES,
  HAN_YUZHANG_COUNTY_NAMES,
} from '../phase4-geography';

const registers = [
  {
    id: 'jinan',
    summary: '展開濟南國縣名錄（史料所列十城）',
    description: '《後漢書》卷一一二〈郡國志四〉濟南國條列十城。以下照錄原文名稱與次序；志文包含不同沿革記載，不據此還原某一年份的疆界、座標或控制者。',
    ariaLabel: '後漢書濟南國十城名錄',
    names: HAN_JINAN_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一一二〈郡國志四〉濟南國條',
  },
  {
    id: 'pingyuan',
    summary: '展開平原郡縣名錄（史料所列九城）',
    description: '《後漢書》卷一一二〈郡國志四〉平原郡條列九城。以下照錄原文名稱與次序；志文包含不同沿革記載，不據此還原某一年份的疆界、座標或控制者。',
    ariaLabel: '後漢書平原郡九城名錄',
    names: HAN_PINGYUAN_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一一二〈郡國志四〉平原郡條',
  },
  {
    id: 'lean',
    summary: '展開樂安國縣名錄（史料所列九城）',
    description: '《後漢書》卷一一二〈郡國志四〉樂安國條列九城，原文並記國名沿革及部分縣的舊屬。以下保留本志的名稱與次序，不拼成單一年份地圖。',
    ariaLabel: '後漢書樂安國九城名錄',
    names: HAN_LEAN_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一一二〈郡國志四〉樂安國條',
  },
  {
    id: 'beihai',
    summary: '展開北海國縣名錄（史料所列十八城）',
    description: '《後漢書》卷一一二〈郡國志四〉北海國條列十八城，並記置廢、復置及舊屬沿革。以下照錄原文名稱與次序，這不是單一年份的行政快照或疆界圖。',
    ariaLabel: '後漢書北海國十八城名錄',
    names: HAN_BEIHAI_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一一二〈郡國志四〉北海國條',
  },
  {
    id: 'donglai',
    summary: '展開東萊郡縣名錄（史料所列十三城）',
    description: '《後漢書》卷一一二〈郡國志四〉東萊郡條列十三城，部分條目註明舊屬琅邪。以下照錄原文名稱與次序，不推定單一年份疆界或遊戲控制狀態。',
    ariaLabel: '後漢書東萊郡十三城名錄',
    names: HAN_DONGLAI_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一一二〈郡國志四〉東萊郡條',
  },
  {
    id: 'qi',
    summary: '展開齊國縣名錄（史料所列六城）',
    description: '《後漢書》卷一一二〈郡國志四〉齊國條列六城，並記部分城邑舊屬。以下照錄原文名稱與次序，不拼成單一年份地圖。',
    ariaLabel: '後漢書齊國六城名錄',
    names: HAN_QI_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一一二〈郡國志四〉齊國條',
  },
  {
    id: 'henanYin',
    summary: '展開河南尹縣名錄（史料所列二十一城）',
    description: '《後漢書》卷一〇九〈志第十九·郡國志一〉河南尹條列二十一城。以下保留來源的名稱用字與次序；郡國志總敘記錄中興以來的郡縣改異，這不是精確對應某一遊戲年份的名單，也不含疆界、座標或控制者。',
    ariaLabel: '後漢書河南尹二十一城名錄',
    names: HAN_HENAN_YIN_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一〇九〈郡國志一〉河南尹條',
  },
  {
    id: 'yingchuan',
    summary: '展開潁川郡縣名錄（史料所列十七城）',
    description: '《後漢書》卷一一〇〈志第二十·郡國志二十〉在潁川郡條下列十七城。此處照錄名稱與次序，未補座標、疆界或控制者，也不表示它們同時對應某一遊戲年份。',
    ariaLabel: '後漢書所列潁川郡十七城',
    names: HAN_YINGCHUAN_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一一〇〈郡國志二十〉潁川郡條',
  },
  {
    id: 'nanyang',
    summary: '展開南陽郡縣名錄（史料所列三十七城）',
    description: '《後漢書》卷一一二〈志第二十八·郡國志二十八〉南陽郡條列三十七城。以下照錄來源名稱與次序；此為該志編錄的行政名錄，不代表單一年份的完整疆界或遊戲控制狀態。',
    ariaLabel: '後漢書南陽郡三十七城名錄',
    names: HAN_NANYANG_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一一二〈郡國志二十八〉南陽郡條',
  },
  {
    id: 'yuzhang',
    summary: '展開豫章郡縣名錄（史料所列二十一城）',
    description: '《後漢書》卷一一二〈志第二十八·郡國志二十八〉豫章郡條列二十一城；原文並記部分縣於中平年間、永元年間或建安年間設置。以下照錄來源名稱與次序，是跨時段沿革名錄，不表示二十一城曾在單一年份同時存在，也不代表疆界、座標、路線或遊戲控制狀態。',
    ariaLabel: '後漢書豫章郡二十一城名錄',
    names: HAN_YUZHANG_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一一二〈郡國志二十八〉豫章郡條',
  },
  {
    id: 'kuaiji',
    summary: '展開會稽郡縣名錄（史料所列十四城）',
    description: '《後漢書》卷一一二〈志第二十八·郡國志二十八〉會稽郡條列十四城，並記漢末分縣及永和年間置縣等沿革。同卷校勘記質疑末項「東部」有誤或衍文；以下保留原文並標明疑點。這是跨時段行政名錄，不代表單一年份疆界或遊戲控制狀態。',
    ariaLabel: '後漢書會稽郡十四城名錄',
    names: HAN_KUAIJI_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一一二〈郡國志二十八〉會稽郡條及校勘記',
  },
  {
    id: 'danyang',
    summary: '展開丹陽郡縣名錄（史料所列十六城）',
    description: '《後漢書》卷一一二〈志第二十八·郡國志二十八〉丹陽郡條列十六城，並記孫權於建安十三年分新都郡、秣陵後改名建業等沿革。以下照錄條目主文與次序；不把跨年記載拼成單一年份疆界或遊戲控制狀態。',
    ariaLabel: '後漢書丹陽郡十六城名錄',
    names: HAN_DANYANG_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一一二〈郡國志二十八〉丹陽郡條',
  },
  {
    id: 'jiujiang',
    summary: '展開九江郡縣名錄（史料所列十四城）',
    description: '《後漢書》卷一一二〈志第二十八·郡國志二十八〉九江郡條列十四城。註文另記刺史治所說法與郡志不同，故本頁只保留郡志列名及順序，不推成唯一疆界、坐標或遊戲控制狀態。',
    ariaLabel: '後漢書九江郡十四城名錄',
    names: HAN_JIUJIANG_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一一二〈郡國志二十八〉九江郡條',
  },
  {
    id: 'lujiang',
    summary: '展開廬江郡縣名錄（史料所列十四城）',
    description: '《後漢書》卷一一二〈郡國志四〉廬江郡條記十四城，以下保留繁體底本文字與原文次序。郡志總錄不同時期郡縣沿革，這不是單一年份的行政快照，不含座標、疆界、路線或控制者。',
    ariaLabel: '後漢書廬江郡十四城名錄',
    names: HAN_LUJIANG_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一一二〈郡國志四〉廬江郡條',
  },
  {
    id: 'wu',
    summary: '展開吳郡縣名錄（傳本文字有校勘異文）',
    description: '《後漢書》卷一一二〈志第二十二·郡國志三〉吳郡條傳本文字列十三城；同卷校勘記指出數量或應作十二，「安」疑為「婁」之訛，後文另補「婁」亦可能重出。以下保留傳本順序並將疑點標出，不把縣數或名稱當成定論；本名錄不代表某一年份的疆界或遊戲控制狀態。',
    ariaLabel: '後漢書吳郡傳本縣名及校勘異文',
    names: HAN_WU_COUNTY_NAMES,
    sourceText: '查閱《後漢書》卷一一二〈郡國志三〉吳郡條及校勘記',
  },
] as const;

export function HistoricalGeographyRegisters() {
  return <>
    {registers.map((register) => <details className="county-index-details" key={register.id}>
      <summary>{register.summary}</summary>
      <p className="caption">{register.description}</p>
      <ol className="county-index" aria-label={register.ariaLabel}>{register.names.map((name) => <li key={name}>{name}</li>)}</ol>
      <p className="caption"><a href={HAN_DIVISION_SOURCE_URLS[register.id]} target="_blank" rel="noreferrer">{register.sourceText}</a></p>
    </details>)}
  </>;
}
