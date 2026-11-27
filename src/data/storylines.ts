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
  {
    id: 'story-media-knowledge',
    title: '媒介革命：从泥板造纸到生成式 AI',
    subtitle: 'BC 3000 – 2025 · 信息载体每一次降本如何撬动文明飞跃',
    yearSpan: 'BC 3000 – 2025',
    description:
      '追踪人类存储与传播知识的载体革命：乌鲁克泥板记账、腓尼基拼音字母、蔡伦造纸术西传、古登堡活字印刷点燃科学革命，直到万维网与生成式 AI 重构人类认知边界。',
    accentColor: '#734B9B',
    steps: [
      {
        eventId: 'e1-uruk',
        narrative:
          '一切始于两河流域的神庙仓库：为了精准核算大麦与啤酒税赋，苏美尔人刻下首批楔形文字泥板，知识首次突破口耳相传的寿命极限。',
        center: [45.6, 31.3],
        zoom: 4,
      },
      {
        eventId: 'e1-phoenician',
        narrative:
          '黎凡特的腓尼基商人为跨海记账把复杂象形文字简化为 22 个辅音字母，极大降低了平民与商人学写字的门槛，衍生出希腊与拉丁字母。',
        center: [35.2, 33.3],
        zoom: 4.2,
      },
      {
        eventId: 'e2-cai-lun',
        narrative:
          '公元 105 年东汉蔡伦用树皮、麻头与破布改良造纸术，使书写成本相对羊皮纸、竹简断崖下跌，书籍从此具备大规模普及的物理底座。',
        center: [112.4, 34.6],
        zoom: 4,
        highlightRouteIds: ['route-paper-west'],
      },
      {
        eventId: 'e3-talas',
        narrative:
          '公元 751 年怛罗斯之战后造纸工匠传入中亚与巴格达，催生阿拉伯“智慧宫”百年翻译运动，并经安达卢西亚最终输入中世纪欧洲。',
        center: [64, 38],
        zoom: 3.3,
        highlightRouteIds: ['route-paper-west'],
      },
      {
        eventId: 'e4-gutenberg',
        narrative:
          '15 世纪中叶美因茨的古登堡将油墨、金属活字与螺旋压榨机结合：欧洲五十年内印出数千万册书籍，直接点爆宗教改革与知识爆炸。',
        center: [8.3, 50],
        zoom: 4.2,
      },
      {
        eventId: 'e5-copernicus-science',
        narrative:
          '印刷术让欧洲天文学家与物理学家得以即时交叉校验观测数据与公式，哥白尼、伽利略与牛顿的科学革命从此不可逆转。',
        center: [14, 49],
        zoom: 3.8,
      },
      {
        eventId: 'e8-www-maastricht',
        narrative:
          '1991 年万维网（WWW）向全球公众免费开放，超链接与浏览器把全人类图书馆和市场搬上同一张实时光缆网。',
        center: [6.1, 46.2],
        zoom: 3.6,
        highlightRouteIds: ['route-modern-supply'],
      },
      {
        eventId: 'e8-generative-ai',
        narrative:
          '2020 年代大模型将全人类累积的文本与知识压缩进高维权重空间，知识检索、科研辅助与软件生产率迎来新一轮范式跃迁。',
        center: [-122, 37.5],
        zoom: 3.2,
      },
    ],
  },
  {
    id: 'story-energy-transitions',
    title: '能源五千年：青铜、煤炭、石油与低碳',
    subtitle: 'BC 2000 – 2025 · 能源密度如何决定帝国上限与霸权更替',
    yearSpan: 'BC 2000 – 2025',
    description:
      '从早期的铜锡远途冶金和铁器牛耕突破，到瓦特蒸汽机引爆化石能源时代、电力内燃机普及、1973 年石油危机震荡，再到当代碳中和竞赛。',
    accentColor: '#296B9E',
    steps: [
      {
        eventId: 'e1-bronze-network',
        narrative:
          '青铜时代被迫把千里之外的阿富汗锡矿与地中海铜矿捏合在一起，金属工坊的能量与矿产瓶颈决定了早期帝国的武装上限。',
        center: [52, 34],
        zoom: 3.2,
      },
      {
        eventId: 'e1-hittite-iron',
        narrative:
          '冶铁技术普及与木炭高温炉破除了铜锡稀缺垄断，廉价铁犁与铁兵器让开垦重土与百万级人口大国成为现实。',
        center: [34.6, 40],
        zoom: 4,
      },
      {
        eventId: 'e6-watt-steam',
        narrative:
          '1769 年瓦特蒸汽机把地底沉积亿万年的煤炭化学能直接转化为机械功，人类文明历史上首次彻底打破“土地与肌肉能量”的天花板。',
        center: [-2, 53],
        zoom: 4.3,
        highlightRouteIds: ['route-industrial-spread'],
      },
      {
        eventId: 'e6-second-industrial',
        narrative:
          '19 世纪后期电网、内燃机与合成化工三大技术共振，石油以更高能量密度接替煤炭，将工业动力送进汽车、轮船与万家灯火。',
        center: [8, 50],
        zoom: 3.8,
        highlightRouteIds: ['route-industrial-spread'],
      },
      {
        eventId: 'e6-ford-assembly',
        narrative:
          '20 世纪初福特流水线配合廉价汽油把内燃机汽车推入普通家庭，石化工业、高速公路网与现代大众消费社会一体成形。',
        center: [-83, 42.3],
        zoom: 4.1,
      },
      {
        eventId: 'e7-oil-crisis-1973',
        narrative:
          '1973 年中东石油禁运令油价数月暴涨四倍：西方高能耗制造陷入滞胀危机，迫使全球狂飙节能技术并重估波斯湾地缘命脉。',
        center: [46, 26],
        zoom: 3.4,
      },
      {
        eventId: 'e8-paris-climate',
        narrative:
          '面对碳排放带来的气候红线，光伏、储能电池、电动车与电网智能化正推动人类开启从化石能源向可再生能源的第三次大转型。',
        center: [18, 36],
        zoom: 2.3,
        highlightRouteIds: ['route-modern-supply'],
      },
    ],
  },
  {
    id: 'story-money-finance',
    title: '货币、财政与现代金融帝国',
    subtitle: 'BC 600 – 2025 · 信用体系如何放大国家动员与全球资本',
    yearSpan: 'BC 600 – 2025',
    description:
      '理解大国兴衰背后的“钱袋子密码”：从吕底亚铸币、汉唐税制变革、北宋交子纸币、张居正白银财政，到荷兰股份与英国央行信用、布雷顿森林美元与数字资产探索。',
    accentColor: '#B47417',
    steps: [
      {
        eventId: 'e2-coins-lydia',
        narrative:
          '公元前 600 年安纳托利亚的吕底亚国王在琥珀金块上打下官方印记，标准铸币告别称重验金的繁琐，引爆地中海零售商业与雇佣兵财政。',
        center: [28, 38.5],
        zoom: 4.5,
      },
      {
        eventId: 'e2-han-salt-iron',
        narrative:
          '西汉武帝推行五铢钱官铸与盐铁专卖，用国家级商品垄断替代单纯田税，撑起了开拓丝绸之路与远征漠北的巨额军费。',
        center: [109, 34.3],
        zoom: 3.8,
        highlightRouteIds: ['route-silk-land'],
      },
      {
        eventId: 'e4-jiaozi',
        narrative:
          '1024 年北宋四川商户创制的“交子”收归官营，诞生人类最早由政府背书的纸币，摆脱笨重铜铁钱对商业扩张的物理束缚。',
        center: [104, 30.7],
        zoom: 4,
      },
      {
        eventId: 'e5-ming-single-whip',
        narrative:
          '1581 年明朝张居正推行“一条鞭法”，将繁杂力役与实物税统一折银征收，使庞大帝国财政深深嵌入全球美洲与日本白银循环。',
        center: [116.4, 39.9],
        zoom: 3.6,
        highlightRouteIds: ['route-manila-galleon'],
      },
      {
        eventId: 'e5-voc',
        narrative:
          '1602 年阿姆斯特丹为分散远洋香料贸易巨额风险，组建永续股份制的荷兰东印度公司并开放证券二级流通，现代股票交易所由此诞生。',
        center: [4.9, 52.4],
        zoom: 4.4,
      },
      {
        eventId: 'e5-south-sea-bank',
        narrative:
          '光荣革命后 1694 年英格兰银行成立，议会信用背书的长期国债把英国海军军费利率压到对手的一半以下，造就百年海上霸权底座。',
        center: [-0.1, 51.5],
        zoom: 4.4,
      },
      {
        eventId: 'e7-bretton-woods',
        narrative:
          '二战尾声美英确立以美元挂钩黄金、各国货币挂钩美元的布雷顿森林秩序与 IMF/世界银行，战后贸易黄金三十年由此启航。',
        center: [-71.3, 44.3],
        zoom: 3.6,
      },
      {
        eventId: 'e7-nixon-shock',
        narrative:
          '1971 年美国宣布美元与黄金脱钩，“尼克松冲击”宣告人类全面进入纯主权信用本位与浮动汇率时代，全球金融体量指数级膨胀。',
        center: [-77, 38.9],
        zoom: 3.6,
      },
      {
        eventId: 'e8-bitcoin-2009',
        narrative:
          '2008 年次贷危机动摇大众对华尔街与央行救市信任后，2009 年比特币创世区块上线，开启区块链与数字央行货币（CBDC）的跨界实验。',
        center: [10, 30],
        zoom: 2.1,
      },
    ],
  },
  {
    id: 'story-ecology-plagues',
    title: '瘟疫、气候与生态冲击改写历史',
    subtitle: 'BC 1200 – 2022 · 看得见的帝国与看不见的微生物',
    yearSpan: 'BC 1200 – 2022',
    description:
      '很多历史转折并非单纯出于帝王决策：从青铜时代末期的千年大旱、玛雅生态超载、黑死病重塑西欧劳工价格、哥伦布生物交换，到奎宁助推殖民非洲与当代全球供应链大考。',
    accentColor: '#059669',
    steps: [
      {
        eventId: 'e1-bronze-collapse',
        narrative:
          '公元前 1200 年前后持续干冷干旱叠加地震与“海上民族”迁徙，几年内接连震碎迈锡尼与赫梯两大青铜王权，迫使西亚地中海步入铁器时代。',
        center: [28, 36.5],
        zoom: 3.8,
      },
      {
        eventId: 'e3-maya-classic',
        narrative:
          '9 世纪中美洲玛雅低地遭遇严重多年干旱加森林过度砍伐与城邦混战，宏伟石灰岩金字塔群短短数代内遭热带雨林重新吞没。',
        center: [-89.6, 17.2],
        zoom: 4.2,
      },
      {
        eventId: 'e4-black-death',
        narrative:
          '1347 年鼠疫杆菌顺着商路船队横扫欧亚：西欧失去近半人口却意外推高人工工资、瓦解农奴依附关系，逼出节水节能的技术与金融升级。',
        center: [14, 44],
        zoom: 3.5,
      },
      {
        eventId: 'e5-columbus',
        narrative:
          '1492 年后的哥伦布生物大交换一边用旧大陆天花麻疹令美洲原住民锐减八九成，一边用玉米马铃薯甘薯突破欧亚山地承载上限。',
        center: [-68, 22],
        zoom: 3,
        highlightRouteIds: ['route-columbus'],
      },
      {
        eventId: 'e6-berlin-conference',
        narrative:
          '19 世纪后期直到廉价提纯抗疟疾药物奎宁与蒸汽内河船结合，欧洲殖民者才终于穿透曾被称为“白人坟墓”的非洲热带内陆疟疾带。',
        center: [16, 8],
        zoom: 2.7,
      },
      {
        eventId: 'e8-covid19',
        narrative:
          '2020 年新冠大流行瞬间冻结跨国航空与线下聚会，加速远程协作与供应链近岸回流，再次提醒人类全球化依然共享脆弱的生物圈。',
        center: [30, 26],
        zoom: 2,
        highlightRouteIds: ['route-modern-supply'],
      },
    ],
  },
  {
    id: 'story-law-governance',
    title: '法典、宪政与国家治理形态演进',
    subtitle: 'BC 1750 – 1948 · 从刻在玄武岩上的律条到国际契约',
    yearSpan: 'BC 1750 – 1948',
    description:
      '梳理人类如何反复解决“权力交接、官僚选拔、限权制衡与国际秩序”四大制度难题：汉谟拉比、雅典民主、秦郡县、科举、《大宪章》、威斯特伐利亚体系、美法宪政直至联合国框架。',
    accentColor: '#9E3434',
    steps: [
      {
        eventId: 'e1-hammurabi',
        narrative:
          '公元前 1750 年汉谟拉比把 282 条成文法律刻在巴比伦神庙黑色石柱上，尽管依等级量刑不平等，却是“公开成文法高于私刑”的关键一步。',
        center: [44.4, 32.5],
        zoom: 4.3,
      },
      {
        eventId: 'e2-athens-democracy',
        narrative:
          '雅典在公元前 5 世纪尝试抽签轮流执政、公民大会投票与陶片放逐法，在城邦尺度上把“主权在民与公职问责”推向极高纯度。',
        center: [23.7, 38],
        zoom: 4.6,
      },
      {
        eventId: 'e2-qin-unification',
        narrative:
          '秦始皇将法家“非世袭流官 + 郡县直辖”推广至千万级疆域，“大一统官僚文书治理”从此成为东亚国家形态的主脊梁。',
        center: [108.7, 34.3],
        zoom: 3.9,
      },
      {
        eventId: 'e3-justinian',
        narrative:
          '6 世纪查士丁尼系统编纂《民法大全》，留存下清晰精密的物权、契约与法人概念，千年后仍深刻支撑着欧陆民法体系。',
        center: [28.9, 41],
        zoom: 4.2,
      },
      {
        eventId: 'e3-keju',
        narrative:
          '隋唐科举制度用公平笔试打破贵族门阀对仕途的世袭垄断，搭建起“寒门凭学识晋升治理阶层”的文官选拔通道。',
        center: [108.9, 34.2],
        zoom: 3.9,
      },
      {
        eventId: 'e4-magna-carta',
        narrative:
          '1215 年英国《大宪章》迫使国王书面承认征税需经贵族议事同意、“国王亦在法律之下”，埋下日后议会与法治宪政的种子。',
        center: [-0.6, 51.4],
        zoom: 4.6,
      },
      {
        eventId: 'e5-westphalia',
        narrative:
          '1648 年《威斯特伐利亚和约》结束三十年宗教混战，确立了以“主权领土平等与互不干涉内政”为核心的现代国际关系原则。',
        center: [7.8, 52],
        zoom: 4.3,
      },
      {
        eventId: 'e5-glorious-revolution',
        narrative:
          '1688 年《权利法案》将最高征税权与立法权稳稳锚定在英国议会手中，实现罕见的“不动武流血却锁定分权”制度转型。',
        center: [-0.1, 51.5],
        zoom: 4.5,
      },
      {
        eventId: 'e6-us-constitution',
        narrative:
          '1787 年费城制宪会议首创大型共和国“联邦制 + 三权分立制衡”成文宪法，解决了既要统一大市场又要防止极权的两难。',
        center: [-75.1, 40],
        zoom: 4.1,
      },
      {
        eventId: 'e6-napoleon-code',
        narrative:
          '1804 年《拿破仑法典》把法律面前人人平等、世俗婚姻与私有产权不可侵犯写进清晰法条，随法国影响扩散至欧洲与拉美。',
        center: [2.3, 48.8],
        zoom: 4.2,
      },
      {
        eventId: 'e7-un-nuremberg',
        narrative:
          '历经两次世界大战浩劫，1945 年《联合国宪章》与纽伦堡国际审判首次试图以超国家机构和国际法约束主权国家的侵略暴力。',
        center: [-74, 40.7],
        zoom: 3.4,
      },
    ],
  },
  {
    id: 'story-financial-crises',
    title: '从郁金香到次贷：全球金融泡沫与危机应对史',
    subtitle: '人类如何在信用扩张、泡沫破碎与最后贷款人制度间反复校准边界',
    yearSpan: '1637 — 2024',
    description:
      '跟随史上重大金融危机与制度应对，看懂高杠杆衍生品泡沫、金本位紧缩传导、美联储最后贷款人演变，以及当代主权债务与汇率安全三角。',
    accentColor: '#C5831F',
    steps: [
      {
        eventId: 'e5-tulip-mania',
        narrative:
          '1637 年荷兰“郁金香狂热”借远期“风交易”零门槛撬动大众狂热投机，当拍卖一朝流拍，人类首份近代金融泡沫教材就此写就。',
        center: [4.64, 52.38],
        zoom: 4.5,
      },
      {
        eventId: 'e5-south-sea-bank',
        narrative:
          '1720 年英法“南海泡沫”与“密西西比危机”几乎同期破灭，证实银行印钞决不可与投机股票绑定，也促使英格兰银行锻造公共债务防线。',
        center: [-0.1, 51.5],
        zoom: 4.3,
      },
      {
        eventId: 'e6-long-depression-1873',
        narrative:
          '1873 年维也纳与华尔街铁路恐慌叠加各国刚性金本位通缩，拉响持续二十余年的“长萧条”并逆转 19 世纪自由贸易气氛。',
        center: [-74.0, 40.7],
        zoom: 3.5,
        highlightRouteIds: ['route-london-gold-cable'],
      },
      {
        eventId: 'e6-federal-reserve-1913',
        narrative:
          '吸取 1907 年只能靠老摩根私营救市的惊险教训，美国于 1913 年立起美联储体系，期望设立常设现代最后贷款人。',
        center: [-77.0, 38.9],
        zoom: 4.0,
      },
      {
        eventId: 'e7-great-depression',
        narrative:
          '1929 年华尔街股灾引爆史无前例大萧条，美联储任由银行缩表违约加深灾难，最终倒逼罗斯福新政、存款保险与凯恩斯调控。',
        center: [-74.0, 40.7],
        zoom: 3.4,
      },
      {
        eventId: 'e7-volcker-shock',
        narrative:
          '1979 年面对大滞胀，沃尔克把美元利率拉升至 20% 刺破恶性通胀，但也直接引爆 1982 年拉美美元外债全面违约潮。',
        center: [-99.1, 19.4],
        zoom: 3.2,
      },
      {
        eventId: 'e8-asian-crisis',
        narrative:
          '1997 年泰铢失守引爆亚洲金融危机，打破“固定汇率+短期热钱开放”美梦，倒逼东亚痛攒外汇储备并铸成区域货币互换盾牌。',
        center: [105.0, 15.0],
        zoom: 3.4,
      },
      {
        eventId: 'e8-gfc-2008',
        narrative:
          '2008 年美国次贷衍生品崩盘冻住全球同业拆借，联储开启史无前例 QE 救市并将全球拖入十余年低利率与地缘重构新局。',
        center: [-74.0, 40.7],
        zoom: 3.0,
      },
    ],
  },
  {
    id: 'story-trade-globalization',
    title: '贸易秩序与产业链重塑：从丝路、汉萨到芯片全球化',
    subtitle: '跨越两千年的运费压缩、港口变迁与世界制造业重心西移又东归',
    yearSpan: '前 138 — 2025',
    description:
      '追踪推动跨洲商品汇流的交通路线、统一市场制度与关税秩序变革，重现“亚洲双中心 -> 欧美大西洋世界工厂 -> 东亚复合全球供应链”的历史钟摆。',
    accentColor: '#2E7D6B',
    steps: [
      {
        eventId: 'e2-zhang-qian',
        narrative:
          '公元前 138 年张骞凿空打通长安至地中海丝绸大道，汉代丝绸与帕提亚安息、罗马金银首次建立制度化陆上远程商业循环。',
        center: [76.0, 39.5],
        zoom: 3.0,
        highlightRouteIds: ['route-silk-land'],
      },
      {
        eventId: 'e4-hanseatic-league',
        narrative:
          '14 世纪北欧自治港市结成汉萨同盟，通过大宗粮食、木材与鲱鱼海运把波罗的海—北海塑造成高契约度的跨国区域商业网。',
        center: [12.0, 54.5],
        zoom: 4.0,
        highlightRouteIds: ['route-hanseatic'],
      },
      {
        eventId: 'e5-manila-galleon',
        narrative:
          '1565 年起墨西哥阿卡普尔科—马尼拉太平洋大帆船起航，把美洲波托西白银换取中国丝瓷的双向贸易织入史上首轮真实全球市场。',
        center: [130.0, 18.0],
        zoom: 2.3,
        highlightRouteIds: ['route-manila-galleon'],
      },
      {
        eventId: 'e6-zollverein',
        narrative:
          '1834 年德意志关税同盟拆除内部重重路卡并铺设铁路，论证了构建洲际级统一内部市场是后发制造业起飞的核心跳板。',
        center: [11.0, 51.0],
        zoom: 4.4,
        highlightRouteIds: ['route-industrial-spread'],
      },
      {
        eventId: 'e6-corn-laws-repeal',
        narrative:
          '1846 年英国单边废除谷物关税拥抱全球粮食进口，辅以 1869 年苏伊士运河通航，奠基“欧美工业制成品 + 世界其他地区农矿供给”百年大分流分工。',
        center: [16.0, 42.0],
        zoom: 2.8,
        highlightRouteIds: ['route-suez-panama'],
      },
      {
        eventId: 'e7-treaty-of-rome',
        narrative:
          '1957 年西欧六国签下《罗马条约》启动共同市场，彻底在核心战火区建立零关税产业集群并一步步迈向欧元单一货币区。',
        center: [10.0, 48.0],
        zoom: 4.0,
      },
      {
        eventId: 'e8-china-wto',
        narrative:
          '2001 年中国入世使十四亿人口高效率制造业融入全球市场，形成美欧研发、东亚核心晶圆、中国集成组装与中东能源互补的超级全球化黄金链。',
        center: [116.0, 31.0],
        zoom: 2.9,
        highlightRouteIds: ['route-modern-supply', 'route-gulf-oil-sea'],
      },
      {
        eventId: 'e8-us-china-trade',
        narrative:
          '2018 年起大国关税竞争、芯片出口管制与“中国+N / 友岸重构”打破单一追求极致效率时代，世界供应链进入成本、安全与区域多元化再平衡期。',
        center: [145.0, 28.0],
        zoom: 2.2,
        highlightRouteIds: ['route-modern-supply'],
      },
    ],
  },
];
