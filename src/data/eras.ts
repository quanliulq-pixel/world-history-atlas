import type { Dimension, Era, FigureRole, WorldRegion } from '../types/history';

export const MIN_YEAR = -3000;
export const MAX_YEAR = 2025;

export const DIMENSION_META: Record<
  Dimension,
  { label: string; shortLabel: string; color: string; darkColor: string; bgTint: string }
> = {
  politics: {
    label: '政治与地缘',
    shortLabel: '政治',
    color: '#B83B3B',
    darkColor: '#E0635A',
    bgTint: 'rgba(184, 59, 59, 0.12)',
  },
  economy: {
    label: '经济与贸易',
    shortLabel: '经济',
    color: '#C5831F',
    darkColor: '#E5A94C',
    bgTint: 'rgba(197, 131, 31, 0.14)',
  },
  culture: {
    label: '文化与思想',
    shortLabel: '文化',
    color: '#734B9B',
    darkColor: '#A982D1',
    bgTint: 'rgba(115, 75, 155, 0.12)',
  },
  tech: {
    label: '科技与能源',
    shortLabel: '科技',
    color: '#296B9E',
    darkColor: '#58A3D9',
    bgTint: 'rgba(41, 107, 158, 0.12)',
  },
};

export const REGION_META: Record<WorldRegion, { label: string; center: [number, number] }> = {
  'east-asia': { label: '东亚', center: [112, 34] },
  'south-asia': { label: '南亚与东南亚', center: [82, 20] },
  'middle-east': { label: '西亚与中亚', center: [48, 32] },
  europe: { label: '欧洲', center: [14, 48] },
  africa: { label: '非洲', center: [20, 4] },
  americas: { label: '美洲', center: [-82, 12] },
  global: { label: '跨洲/全球', center: [20, 22] },
};

export const FIGURE_ROLE_META: Record<
  FigureRole,
  { label: string; shortLabel: string; color: string; darkColor: string; bgTint: string }
> = {
  ruler: {
    label: '帝王与政治家',
    shortLabel: '政要',
    color: '#9E3434',
    darkColor: '#E06B63',
    bgTint: 'rgba(158, 52, 52, 0.12)',
  },
  thinker: {
    label: '思想家与宗师',
    shortLabel: '思想',
    color: '#6B4594',
    darkColor: '#AF8AD9',
    bgTint: 'rgba(107, 69, 148, 0.13)',
  },
  scientist: {
    label: '科学家与发明家',
    shortLabel: '科学',
    color: '#24618F',
    darkColor: '#5CA9DE',
    bgTint: 'rgba(36, 97, 143, 0.12)',
  },
  reformer: {
    label: '改革家与航海家',
    shortLabel: '开拓',
    color: '#AD6E16',
    darkColor: '#E5A94C',
    bgTint: 'rgba(173, 110, 22, 0.14)',
  },
};

export const ERAS: Era[] = [
  {
    id: 'era-1',
    name: '大河文明与青铜时代',
    shortName: '青铜时代',
    startYear: -3000,
    endYear: -800,
    weight: 0.1,
    accentColor: '#A66E38',
    subPeriods: [
      {
        id: 'sp-1-1',
        eraId: 'era-1',
        name: '城邦与文字起源',
        startYear: -3000,
        endYear: -2000,
        themeSummary: '苏美尔楔形文字、古埃及统一与金字塔工程、印度河谷都市成形',
      },
      {
        id: 'sp-1-2',
        eraId: 'era-1',
        name: '青铜帝国与礼制',
        startYear: -2000,
        endYear: -1200,
        themeSummary: '汉谟拉比法典、二里头至殷商青铜礼制、赫梯—埃及卡迭石外交均势',
      },
      {
        id: 'sp-1-3',
        eraId: 'era-1',
        name: '青铜崩溃与周制',
        startYear: -1200,
        endYear: -800,
        themeSummary: '东地中海青铜体系崩溃与铁器外溢、腓尼基字母、西周分封与宗法',
      },
    ],
    overview: {
      geopolitics:
        '两河、尼罗河、印度河与黄河流域率先跨过城市与国家门槛，王权与神权合一的早期领土国家兴起，东地中海与安纳托利亚形成最早的多极均势外交。',
      economy:
        '灌溉农业支撑人口剩余与社会分层，青铜冶炼倒逼跨地域锡铜远程贸易网络；泥板契约、度量衡与贝壳/金属称量货币萌芽。',
      culture:
        '楔形文字、象形文字与甲骨文使行政与历史记忆得以固化；成文法典、史诗与宇宙观奠定早期文明基因。',
    },
  },
  {
    id: 'era-2',
    name: '轴心时代与古典帝国',
    shortName: '轴心与古典',
    startYear: -800,
    endYear: 220,
    weight: 0.13,
    accentColor: '#B83B3B',
    subPeriods: [
      {
        id: 'sp-2-1',
        eraId: 'era-2',
        name: '轴心思想大觉醒',
        startYear: -800,
        endYear: -400,
        themeSummary: '希腊城邦民主、波斯一统近东、孔子百家争鸣与释迦牟尼沙门思潮同步绽放',
      },
      {
        id: 'sp-2-2',
        eraId: 'era-2',
        name: '变法兼并与希腊化',
        startYear: -400,
        endYear: -200,
        themeSummary: '商鞅耕战变法、亚历山大东征、阿育王护持佛教普世传播与秦灭六国',
      },
      {
        id: 'sp-2-3',
        eraId: 'era-2',
        name: '秦汉与罗马双雄',
        startYear: -200,
        endYear: 220,
        themeSummary: '张骞凿空打通丝路、奥古斯都开启罗马和平、基督教兴起与蔡伦改良造纸术',
      },
    ],
    overview: {
      geopolitics:
        '铁器普及加速吞并战，欧亚大陆两端诞生秦汉郡县官僚帝国与罗马地中海霸权，中间经由波斯、孔雀与贵霜连接。',
      economy:
        '铸币普及与税赋货币化推动跨欧亚陆海贸易，丝绸之路在汉朝与帕提亚/罗马间成形，大地产庄园与编户齐民成为核心组织形式。',
      culture:
        '希腊哲学、诸子百家、印度佛陀与希伯来先知几乎同时重塑人类伦理与政治想象，其思想至今仍是主要文明的底色。',
    },
  },
  {
    id: 'era-3',
    name: '宗教传播与欧亚重构',
    shortName: '帝国重构',
    startYear: 220,
    endYear: 1000,
    weight: 0.11,
    accentColor: '#734B9B',
    subPeriods: [
      {
        id: 'sp-3-1',
        eraId: 'era-3',
        name: '帝国裂变与迁徙',
        startYear: 220,
        endYear: 580,
        themeSummary: '欧亚大迁徙、西罗马落幕、东亚门阀南北融合与《查士丁尼法典》汇编',
      },
      {
        id: 'sp-3-2',
        eraId: 'era-3',
        name: '盛唐与伊斯兰兴起',
        startYear: 580,
        endYear: 800,
        themeSummary: '隋唐大运河与科举确立、伊斯兰帝国横跨亚非欧、怛罗斯促成造纸术西传',
      },
      {
        id: 'sp-3-3',
        eraId: 'era-3',
        name: '封建化与多中心',
        startYear: 800,
        endYear: 1000,
        themeSummary: '查理曼奠基西欧采邑制度、维京罗斯河道贸易网与北宋文官体制成型',
      },
    ],
    overview: {
      geopolitics:
        '古典帝国受游牧南下与瘟疫冲击而分裂重组：西欧进入封建碎片化，东罗马坚守千载，阿拉伯哈里发横跨亚非欧，隋唐重建东亚帝国秩序。',
      economy:
        '唐代均田与两税法转换税制，阿拉伯商业网络打通印度洋与地中海黄金流通，高产作物与造纸术沿商路跨文明扩散。',
      culture:
        '基督教、伊斯兰教与大乘佛教分别成为三大洲际文明的粘合剂；巴格达智慧宫与长安成为翻译、律法与科技的高地。',
    },
  },
  {
    id: 'era-4',
    name: '宋元贸易与草原帝国',
    shortName: '草原与商网',
    startYear: 1000,
    endYear: 1453,
    weight: 0.12,
    accentColor: '#C5831F',
    subPeriods: [
      {
        id: 'sp-4-1',
        eraId: 'era-4',
        name: '宋商潮与十字军',
        startYear: 1000,
        endYear: 1200,
        themeSummary: '北宋纸币交子与海外市舶、靖康经济南移、十字军东征与欧洲大学兴起',
      },
      {
        id: 'sp-4-2',
        eraId: 'era-4',
        name: '蒙古欧亚大贯通',
        startYear: 1200,
        endYear: 1350,
        themeSummary: '成吉思汗至忽必烈驿站畅行欧亚、英国《大宪章》、黑死病冲击西欧劳役',
      },
      {
        id: 'sp-4-3',
        eraId: 'era-4',
        name: '明海权与文艺复兴',
        startYear: 1350,
        endYear: 1453,
        themeSummary: '佛罗伦萨复式记账银行业、郑和下西洋、古登堡活字与奥斯曼攻陷君士坦丁堡',
      },
    ],
    overview: {
      geopolitics:
        '蒙古征服打造人类史上最大连续陆地帝国并重构欧亚政区；西欧王权借城市复兴崛起，奥斯曼帝国崛起并最终攻陷君士坦丁堡。',
      economy:
        '宋代出现纸币、市舶司与海上贸易高峰；意大利城邦借复式记账与银行融资地中海贸易，黑死病则重塑欧洲劳动力价格与农奴制度。',
      culture:
        '宋明理学、欧洲大学兴起与早期文艺复兴并进；火药、指南针与活字印刷西传彻底改变欧洲战争与知识传播条件。',
    },
  },
  {
    id: 'era-5',
    name: '大航海与白银全球化',
    shortName: '大航海时代',
    startYear: 1453,
    endYear: 1750,
    weight: 0.13,
    accentColor: '#296B9E',
    subPeriods: [
      {
        id: 'sp-5-1',
        eraId: 'era-5',
        name: '远洋地理大发现',
        startYear: 1453,
        endYear: 1525,
        themeSummary: '哥伦布大交换、达·伽马直航印度、路德宗教改革与麦哲伦首次环球航行',
      },
      {
        id: 'sp-5-2',
        eraId: 'era-5',
        name: '白银环流与改革',
        startYear: 1525,
        endYear: 1618,
        themeSummary: '哥白尼日心启蒙、波托西银山、大帆船银链汇入张居正一条鞭法及 VOC 成立',
      },
      {
        id: 'sp-5-3',
        eraId: 'era-5',
        name: '主权国家与启蒙',
        startYear: 1618,
        endYear: 1750,
        themeSummary: '《威斯特伐利亚和约》、光荣革命与英格兰银行信用体制、欧洲启蒙思想',
      },
    ],
    overview: {
      geopolitics:
        '欧洲借远洋船炮建立跨洋帝国，威斯特伐利亚体系确立主权国家法则；同时东亚明清、奥斯曼、萨法维与莫卧儿仍维持强大陆权秩序。',
      economy:
        '哥伦布大交换重塑全球物种与人口；美洲白银经大西洋和马尼拉大帆船汇入明清财政（一条鞭法），股份制特许公司与现代金融诞生。',
      culture:
        '文艺复兴、宗教改革与科学革命打破神学垄断；启蒙运动提出主权在民与宪政分权理念，世界进入现代性前夜。',
    },
  },
  {
    id: 'era-6',
    name: '工业革命与殖民帝国',
    shortName: '双元革命',
    startYear: 1750,
    endYear: 1914,
    weight: 0.15,
    accentColor: '#1E5B70',
    subPeriods: [
      {
        id: 'sp-6-1',
        eraId: 'era-6',
        name: '蒸汽与双元革命',
        startYear: 1750,
        endYear: 1815,
        themeSummary: '瓦特蒸汽机、美法革命立宪、《国富论》《拿破仑法典》与维也纳均势',
      },
      {
        id: 'sp-6-2',
        eraId: 'era-6',
        name: '铁路殖民与大分流',
        startYear: 1815,
        endYear: 1870,
        themeSummary: '拉美独立、鸦片战争与晚清震荡、《共产党宣言》、达尔文进化论与美国内战',
      },
      {
        id: 'sp-6-3',
        eraId: 'era-6',
        name: '电气时代与争霸',
        startYear: 1870,
        endYear: 1914,
        themeSummary: '德意志统一、明治维新工业化、电气流水线、柏林瓜分非洲与帝国同盟积聚',
      },
    ],
    overview: {
      geopolitics:
        '美法革命普及民族主权与宪政浪潮，英国凭制海权与工业霸权构建日不落帝国，列强瓜分亚非并迫使清朝、奥斯曼与日本应对近代化冲击。',
      economy:
        '煤炭、蒸汽机、铁路与电力打破农业马尔萨斯陷阱，东西方“大分流”急剧拉大；金本位制度与全球商品期货市场形成。',
      culture:
        '民族主义、自由主义、社会主义三大意识形态成型；进化论、现代医学与普及教育深刻改变社会结构。',
    },
  },
  {
    id: 'era-7',
    name: '两次大战与冷战格局',
    shortName: '战争与冷战',
    startYear: 1914,
    endYear: 1991,
    weight: 0.15,
    accentColor: '#8C2D2D',
    subPeriods: [
      {
        id: 'sp-7-1',
        eraId: 'era-7',
        name: '大战、革命与萧条',
        startYear: 1914,
        endYear: 1945,
        themeSummary: '一战四帝国解体、十月革命、1929大萧条、凯恩斯新政与二战反法西斯胜利',
      },
      {
        id: 'sp-7-2',
        eraId: 'era-7',
        name: '冷战两极与独立潮',
        startYear: 1945,
        endYear: 1971,
        themeSummary: '联合国与布雷顿森林、《罗马条约》、印巴非殖民化、新中国诞生与阿帕网雏形',
      },
      {
        id: 'sp-7-3',
        eraId: 'era-7',
        name: '滞胀、改革与剧变',
        startYear: 1971,
        endYear: 1991,
        themeSummary: '石油危机与尼克松冲击、1978中国改革开放、广场协议与柏林墙倒塌苏联解体',
      },
    ],
    overview: {
      geopolitics:
        '两次世界大战终结欧洲数百年全球霸权，美苏两极冷战重塑地球阵营，同时亚非拉掀起大规模非殖民化与民族独立浪潮。',
      economy:
        '大萧条催生凯恩斯国家干预，布雷顿森林体系确立美元霸权与国际货币秩序；战后东亚与西欧创造高速工业追赶奇迹，1978 年中国开启改革开放。',
      culture:
        '核武器与太空竞赛悬置热战极限，计算机与信息理论奠基数字化未来；人权宣言、民权运动与大众消费文化普及全球。',
    },
  },
  {
    id: 'era-8',
    name: '全球化与多极数字时代',
    shortName: '当代全球',
    startYear: 1991,
    endYear: 2025,
    weight: 0.11,
    accentColor: '#2E7D6B',
    subPeriods: [
      {
        id: 'sp-8-1',
        eraId: 'era-8',
        name: '万维网与入世分工',
        startYear: 1991,
        endYear: 2008,
        themeSummary: '万维网商用与欧盟诞生、亚洲金融危机、2001中国入世构建全球超级制造业网',
      },
      {
        id: 'sp-8-2',
        eraId: 'era-8',
        name: '移动互联与危机反思',
        startYear: 2008,
        endYear: 2019,
        themeSummary: '2008金融海啸、比特币实验、移动智能手机普及、《巴黎协定》与供应链调整',
      },
      {
        id: 'sp-8-3',
        eraId: 'era-8',
        name: 'AI 算力与多极秩序',
        startYear: 2019,
        endYear: 2025,
        themeSummary: '新冠疫情压力测试、俄乌地缘重构、生成式 AI 浪潮与全球南方多极化兴起',
      },
    ],
    overview: {
      geopolitics:
        '冷战结束后的“单极时刻”逐步过渡为中美欧印等多极博弈与供应链重构；气候治理与地区冲突考验既有国际机制。',
      economy:
        '世贸组织与中国深度融入构建了高效率全球价值链；2008 金融危机、新能源革命与人工智能算力竞赛成为新的增长与博弈焦点。',
      culture:
        '万维网、智能手机与生成式 AI 重构知识生产与社会舆论；全球化与本土文化认同的张力持续存在。',
    },
  },
];
