import type { Storyline } from '../types/history';

export const STORYLINES: Storyline[] = [
  {
    id: 'story-axial-empires',
    title: '轴心时代与古典秩序诞生',
    subtitle: '公元前 550 – 公元 105 年 · 思想突破如何塑造超大型帝国',
    yearSpan: 'BC 550 – AD 105',
    description:
      '观察几乎在同一千年窗口内，波斯帝国、儒法百家、释迦牟尼佛教、雅典民主、秦汉郡县与罗马元首制如何分别给出了治理复杂人类社会的终极方案。',
    accentColor: '#B83B3B',
    steps: [
      {
        eventId: 'e2-cyrus-persia',
        narrative:
          '旅程从伊朗高原出发：阿契美尼德波斯率先示范了“宽容行省 + 驿道御道”的大帝国治理术，连接起印度河、两河与地中海。',
        center: [50, 31],
        zoom: 3.3,
      },
      {
        eventId: 'e2-confucius',
        narrative:
          '同一世纪的东亚春秋，孔子与诸子百家面对礼崩乐坏展开大辩论，奠定了融合德治礼乐与法家官僚效率的中华文明精神底色。',
        center: [115, 35],
        zoom: 4,
      },
      {
        eventId: 'e2-buddha',
        narrative:
          '同一时期的恒河平原，乔达摩·悉达多打破种姓壁垒创立佛教，沿着商人城镇网络准备走向全亚洲。',
        center: [83, 26],
        zoom: 4,
        highlightRouteIds: ['route-buddhism-east'],
      },
      {
        eventId: 'e2-athens-democracy',
        narrative:
          '视线西移至爱琴海：希腊城邦走出了完全相反的小国寡民公民自治路径，理性逻辑与政治哲学在广场辩论中成型。',
        center: [23, 38],
        zoom: 4.5,
      },
      {
        eventId: 'e2-qin-unification',
        narrative:
          '三百年铁血兼并后，秦朝用商鞅锤炼出的郡县与“书同文、车同轨”打破分封，建立起东亚绵延两千年的大一统国家基因。',
        center: [109, 34],
        zoom: 3.8,
      },
      {
        eventId: 'e2-roman-empire',
        narrative:
          '欧亚另一端，罗马共和国吞并迦太基与希腊化世界后经屋大维转为帝制，靠成文万民法与海上零关税实现“罗马和平”。',
        center: [14, 41],
        zoom: 3.5,
      },
      {
        eventId: 'e2-cai-lun',
        narrative:
          '最后来到东汉洛阳：蔡伦廉价造纸术的诞生，将让这五大古典轴心文明的所有思想与律法获得跨越千年的保存与传播带宽。',
        center: [112, 34],
        zoom: 4,
        highlightRouteIds: ['route-paper-west'],
      },
    ],
  },
  {
    id: 'story-eurasian-arteries',
    title: '欧亚大动脉：丝路、草原与季风海网',
    subtitle: '公元前 138 – 公元 1433 年 · 技术与宗教如何穿透千里阻隔',
    yearSpan: 'BC 138 – 1433',
    description:
      '追踪张骞凿空西域后一千五百年的欧亚陆海联通史：从沙漠绿洲商队、造纸术西传、宋代海商巨港到蒙古草原驿道与郑和宝船。',
    accentColor: '#C5831F',
    steps: [
      {
        eventId: 'e2-zhang-qian',
        narrative:
          '汉武帝原本只为联络大月氏夹击匈奴，张骞十三年苦旅却意外接通长安与中亚撒马尔罕，陆上丝绸之路自此成形。',
        center: [82, 38],
        zoom: 3.2,
        highlightRouteIds: ['route-silk-land'],
      },
      {
        eventId: 'e2-kushan',
        narrative:
          '中亚贵霜帝国扼守丝路十字路口：大月氏王族用罗马金币结算中国丝绸，并让希腊雕刻师塑出了第一批佛像传入中国。',
        center: [71, 34],
        zoom: 4,
        highlightRouteIds: ['route-silk-land', 'route-buddhism-east'],
      },
      {
        eventId: 'e3-talas',
        narrative:
          '751 年怛罗斯一役使造纸工匠经撒马尔罕进入巴格达，“智慧宫”百年翻译运动因此有了廉价耐用的书写材料。',
        center: [62, 38],
        zoom: 3.3,
        highlightRouteIds: ['route-paper-west'],
      },
      {
        eventId: 'e4-song-commerce',
        narrative:
          '北宋交子与南移经济将航运中心推向东南海洋，泉州港凭借水密隔舱与指南针成为世界级季风海商枢纽。',
        center: [115, 25],
        zoom: 3.6,
        highlightRouteIds: ['route-silk-sea'],
      },
      {
        eventId: 'e4-mongol-empire',
        narrative:
          '13 世纪蒙古铁骑拆除了欧亚全部内陆关卡，站赤驿道让威尼斯商人马可·波罗与阿拉伯学者得以横穿大漠直抵大都。',
        center: [80, 44],
        zoom: 2.5,
        highlightRouteIds: ['route-mongol-yam'],
      },
      {
        eventId: 'e4-zhenghe',
        narrative:
          '东亚传统陆海联通在 1405 年达至巅峰——郑和宝船抵达东非海岸；但赔本的朝贡政治逻辑却在 1433 年突然按下停止键。',
        center: [85, 14],
        zoom: 2.7,
        highlightRouteIds: ['route-zhenghe'],
      },
    ],
  },
  {
    id: 'story-silver-globalization',
    title: '白银、大帆船与第一次全球化',
    subtitle: '1453 – 1688 年 · 大洋连为一体如何改写明清税制与欧洲金融',
    yearSpan: '1453 – 1688',
    description:
      '理解一段极易被忽略的世界经济因果链：奥斯曼封锁与欧洲求富 → 哥伦布与达·伽马 → 波托西银矿 → 马尼拉大帆船 → 张居正一条鞭法 → 荷兰股票与英国金融革命。',
    accentColor: '#296B9E',
    steps: [
      {
        eventId: 'e4-constantinople-1453',
        narrative:
          '1453 年君士坦丁堡城破后，奥斯曼帝国扼住传统地中海—黑海商道，沉重的中转溢价逼使伊比利亚王国冒险投身深海。',
        center: [29, 41],
        zoom: 4,
      },
      {
        eventId: 'e5-columbus',
        narrative:
          '1492 年哥伦布抵达加勒比海，开启改变全人类饮食（玉米马铃薯番薯）与人口版图的“哥伦布大交换”。',
        center: [-68, 23],
        zoom: 3.2,
        highlightRouteIds: ['route-columbus'],
      },
      {
        eventId: 'e5-da-gama',
        narrative:
          '六年之后达·伽马绕过好望角在卡利卡特上岸，用舰炮和直接海运彻底取代了奥斯曼与威尼斯香料垄断。',
        center: [60, 5],
        zoom: 2.8,
        highlightRouteIds: ['route-da-gama'],
      },
      {
        eventId: 'e5-potosi-silver',
        narrative:
          '玻利维亚四千米高原的波托西发现超级银矿，在安第斯原住民矿工的血汗下每年铸出巨量西班牙银元涌入世界。',
        center: [-66, -19],
        zoom: 3.8,
        highlightRouteIds: ['route-manila-galleon'],
      },
      {
        eventId: 'e5-manila-galleon',
        narrative:
          '1565 年开辟的马尼拉大帆船航线横跨太平洋：把美洲白银直接运至马尼拉，换取中国丝绸与瓷器装船运回美洲与欧洲。',
        center: [155, 16],
        zoom: 2.2,
        highlightRouteIds: ['route-manila-galleon'],
      },
      {
        eventId: 'e5-ming-single-whip',
        narrative:
          '正是依靠美洲与日本白银的大规模输入，张居正才得以在 1581 年推行“一条鞭法”，把中国正式带入白银货币财政时代。',
        center: [116, 36],
        zoom: 3.6,
        highlightRouteIds: ['route-manila-galleon'],
      },
      {
        eventId: 'e5-voc',
        narrative:
          '而在大西洋彼岸，荷兰发明了永续股份制的东印度公司（VOC）与阿姆斯特丹股票交易所，随后英国“光荣革命”接棒完善议会与央行信用。',
        center: [4, 52],
        zoom: 4.2,
      },
    ],
  },
  {
    id: 'story-industrial-divergence',
    title: '双元革命、大分流与殖民霸权',
    subtitle: '1769 – 1911 年 · 煤炭蒸汽、宪政民族主义与东西方易位',
    yearSpan: '1769 – 1911',
    description:
      '英国的煤炭机械革命与美法政治革命几乎同步爆发，彻底打破东西方万年农耕均势；看清工业、贸易、殖民瓜分与中日两国截然不同的追赶反应。',
    accentColor: '#1E5B70',
    steps: [
      {
        eventId: 'e6-watt-steam',
        narrative:
          '1769 年瓦特蒸汽机走出英国工场，人类首次把地下蕴藏数亿年的化石煤炭转化为无限机械动力，突破农业生长天花板。',
        center: [-2, 53],
        zoom: 4.3,
        highlightRouteIds: ['route-industrial-spread'],
      },
      {
        eventId: 'e6-us-independence',
        narrative:
          '政治上，1776 年北美十三州发表《独立宣言》并在费城试验联邦成文宪法，同年亚当·斯密在英国出版《国富论》。',
        center: [-75, 40],
        zoom: 3.8,
      },
      {
        eventId: 'e6-french-revolution',
        narrative:
          '1789 年巴黎大革命炸毁欧陆封建贵族特权，把“公民平等、民法典与民族主义”随拿破仑大军扩散至整个欧洲大陆。',
        center: [3, 48],
        zoom: 4,
      },
      {
        eventId: 'e6-opium-war',
        narrative:
          '工业炮舰撞向古老东方：1840 年英国发动鸦片战争打破广州十三行体制，逼迫中国在屈辱中痛苦卷入世界条约体系。',
        center: [114, 24],
        zoom: 4,
      },
      {
        eventId: 'e6-meiji',
        narrative:
          '面对同样“黑船”危机，日本凭借封建分权韧性与德川高识字底座在 1868 年成功明治维新工业化，却随后走上侵略邻居的歧途。',
        center: [138, 36],
        zoom: 4.2,
      },
      {
        eventId: 'e6-berlin-conference',
        narrative:
          '随着二次工业革命电力化工与机枪奎宁普及，1884 年欧洲列强用直尺在柏林桌上强行瓜分整个非洲。',
        center: [16, 15],
        zoom: 2.5,
      },
      {
        eventId: 'e6-qing-1911',
        narrative:
          '重重内忧外患冲击下，1911 年辛亥革命终结中国两千年皇权帝制，亚洲首个民主共和国在武昌枪声中艰难诞生。',
        center: [114, 31],
        zoom: 4,
      },
    ],
  },
  {
    id: 'story-century-of-reordering',
    title: '战争、冷战、全球化与多极重构',
    subtitle: '1914 – 2025 年 · 从欧亚废墟到数字全球与当代变局',
    yearSpan: '1914 – 2025',
    description:
      '梳理一战、大萧条与二战如何彻底打掉欧洲霸权；美苏冷战与去殖民化如何重塑世界；以及 1978 年后中国融入与当代芯片、AI 及气候转型的新博弈。',
    accentColor: '#8C2D2D',
    steps: [
      {
        eventId: 'e7-ww1',
        narrative:
          '1914 年一战绞肉机打垮四大传统帝国、重创欧洲金融积累，并催生俄国十月革命开辟出另一条计划经济赛道。',
        center: [14, 48],
        zoom: 3.5,
      },
      {
        eventId: 'e7-great-depression',
        narrative:
          '1929 年华尔街股灾引爆全球大萧条，金本位溃散，美英选择罗斯福新政和凯恩斯改良，而德意日则滑向二战法西斯深渊。',
        center: [-74, 41],
        zoom: 3.6,
      },
      {
        eventId: 'e7-bretton-woods',
        narrative:
          '1944–1945 年同盟国胜利确立联合国与布雷顿森林美元体系，而随后的冷战铁幕在核均势威慑下反而催生了西欧一体化与互联网前身阿帕网。',
        center: [-72, 43],
        zoom: 3.2,
      },
      {
        eventId: 'e7-india-partition',
        narrative:
          '1947 年印度独立与 1960 年非洲独立年彻底埋葬持续四百年的海外殖民体制，亚非拉主权国家借万隆会议登上世界舞台。',
        center: [76, 26],
        zoom: 3.5,
      },
      {
        eventId: 'e7-china-reform',
        narrative:
          '1978 年中国开启改革开放并于 2001 年加入 WTO，释放出史无前例的人力与制造供应链增量，令 90 年代后的互联网全球化如虎添翼。',
        center: [116, 28],
        zoom: 3.5,
        highlightRouteIds: ['route-modern-supply'],
      },
      {
        eventId: 'e8-gfc-2008',
        narrative:
          '2008 年全球金融危机终结了自由放任的绝对神话，刺激各国转向政府干预、去全球化民粹以及基建和战略产业竞争。',
        center: [-74, 40],
        zoom: 3.5,
      },
      {
        eventId: 'e8-generative-ai',
        narrative:
          '站在 2020 年代中叶：全球同时面临芯片算力 AI 跃迁、绿色能源低碳重构与俄乌/中美多极竞争，古代与现代在此交汇照亮未来。',
        center: [30, 26],
        zoom: 2,
        highlightRouteIds: ['route-modern-supply'],
      },
    ],
  },
];
