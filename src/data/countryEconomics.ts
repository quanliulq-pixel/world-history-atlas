import type { CountryEconomicProfile } from '../types/history';

export const COUNTRY_ECON_BENCHMARK_YEARS = [
  1, 1000, 1500, 1700, 1820, 1870, 1913, 1950, 1990, 2024,
] as const;

/**
 * 30 个精编国家长周期经济档案（Maddison 2011 Int$ PPP 历史重建口径与现代可比 PPP 衔接）。
 * 用于国家演进「经济档案」标签页、经济图谱多国横向排行榜与 AI 深度经济问答底座。
 */
export const COUNTRY_ECONOMIC_PROFILES: Record<string, CountryEconomicProfile> = {
  china: {
    countryId: 'china',
    structuralSignature:
      '超大规模农耕赋役—工商业早熟帝国，经历明清全球白银贸易巅峰、近代百余年大分流下探，1978 年后借工业化与 WTO 超级跃升至全球制造与供应链第一极。',
    currencyHistory:
      '秦半两/汉五铢 -> 唐开元通宝 -> 北宋交子（全球首创官方纸币）-> 明清白银—铜钱双轨 -> 1935 法币 -> 1948 起人民币及当代数字人民币与 CIPS。',
    fiscalEvolution:
      '租庸调制 -> 两税法（财产折钱税）-> 王安石市易青苗 -> 一条鞭法（税役并入白银）-> 摊丁入亩 -> 1994 分税制改革奠定现代财政基座。',
    pillarIndustries: [
      { era: '古代帝国', sectors: '铁犁精耕稻麦农业、丝绸纺织、景德镇瓷器与茶叶外销、官营盐铁茶专卖' },
      { era: '近代转型', sectors: '通商口岸纺纱面粉、铁路矿冶开端与长期战乱农业低水平循环' },
      { era: '当代经济', sectors: '全门类高端制造、光伏/锂电/新能源车、数字平台经济、AI 算力与全球出口供应链' },
    ],
    turningPoints: [
      { year: 605, title: '隋代大运河贯通统一国内水运大市场', impact: '低成本北运江南余粮与税赋，支撑帝国千年大一统财政循环。' },
      { year: 1024, title: '北宋官办交子纸币诞生与宋代商业革命', impact: '城镇化率与商税占比创前现代高峰，海上丝绸之路与市舶司关税崛起。' },
      { year: 1581, title: '一条鞭法全国铺开并吸附全球半数白银', impact: '把中国手工业高竞争力与波托西—马尼拉白银网络绑定成全球贸易闭环。' },
      { year: 1978, title: '改革开放、家庭联产承包与特区招商引资', impact: '重接全球化分工，开启人类史上规模最大的快速脱贫与工业跃迁。' },
      { year: 2001, title: '加入 WTO 成为“世界工厂”与全球最大货物贸易国', impact: '深度嵌入欧美跨国产业链，按 PPP 计占全球 GDP 比重回升至近五分之一。' },
    ],
    series: [
      { year: 1, gdpSharePct: 26.2, gdpPerCapitaPPP: 720, populationM: 59.6, note: '西汉平帝户籍人口高峰' },
      { year: 1000, gdpSharePct: 22.8, gdpPerCapitaPPP: 880, populationM: 59.0, note: '北宋稻作与商税爆发前夜' },
      { year: 1500, gdpSharePct: 25.0, gdpPerCapitaPPP: 960, populationM: 103.0, note: '明中叶江南棉丝手工业繁荣' },
      { year: 1700, gdpSharePct: 22.3, gdpPerCapitaPPP: 960, populationM: 138.0, note: '康熙统一海疆与摊丁入亩前夕' },
      { year: 1820, gdpSharePct: 32.9, gdpPerCapitaPPP: 890, populationM: 381.0, note: '世界总量占比峰顶但人口膨胀摊薄人均' },
      { year: 1870, gdpSharePct: 17.1, gdpPerCapitaPPP: 790, populationM: 358.0, note: '战乱与大分流冲击' },
      { year: 1913, gdpSharePct: 8.8, gdpPerCapitaPPP: 810, populationM: 437.0, note: '清末民初现代工业微弱起步' },
      { year: 1950, gdpSharePct: 4.5, gdpPerCapitaPPP: 710, populationM: 547.0, note: '近代谷底，战后重工业奠基起步' },
      { year: 1990, gdpSharePct: 6.4, gdpPerCapitaPPP: 2460, populationM: 1143.0, note: '改革开放第一个十年乡镇企业与沿海起飞' },
      { year: 2024, gdpSharePct: 18.9, gdpPerCapitaPPP: 19300, populationM: 1409.0, note: '全球最大制造业基地与 PPP 第一大经济体' },
    ],
  },

  india: {
    countryId: 'india',
    structuralSignature:
      '长期稳居全球总量前二的手工棉纺与印度洋香料枢纽，殖民时期去工业化导致份额骤跌，1991 年自由化改革后凭 IT 服务外包与人口红利重回世界前列。',
    currencyHistory:
      '孔雀帝国银冲压币（Karshapana）-> 莫卧儿银卢比（Sher Shah 定型）-> 英属印度纸币卢比 -> 现代印度卢比及 UPI 即时数字支付体系。',
    fiscalEvolution:
      '阿克巴“扎布蒂”土地测产定额税 -> 英属殖民柴明达尔包税制 -> 1991 关税大幅削减 -> 2017 年全国统一商品服务税（GST）。',
    pillarIndustries: [
      { era: '古代至莫卧儿', sectors: '恒河高产农业、全球垄断的平纹细布（Muslin）手工棉纺、胡椒靛蓝贸易' },
      { era: '殖民与独立初', sectors: '原棉/黄麻/茶叶出口、塔塔早期钢铁、进口替代重工与国营计划体系' },
      { era: '当代经济', sectors: '全球软件与 BPO 外包（班加罗尔）、仿制药化工、本地数字金融与制造业追赶' },
    ],
    turningPoints: [
      { year: -260, title: '孔雀帝国贯通恒河—印度洋商路统一', impact: '标准化银币与商路保护使印度洋贸易初成网络。' },
      { year: 1580, title: '莫卧儿阿克巴土地财税标准化与南亚手工纺织巅峰', impact: '吸引美洲与欧洲白银源源流入换取孟加拉及古吉拉特棉布。' },
      { year: 1813, title: '英国取消东印度公司垄断并倾销兰开夏机织棉布', impact: '触发持续百年的逆向去工业化与饥荒危机。' },
      { year: 1991, title: '国际收支危机倒逼取消“许可证体制”（Licence Raj）', impact: '开放外资、民营航空与信息科技，经济增速从“印度速率”跃上高增长轨道。' },
    ],
    series: [
      { year: 1, gdpSharePct: 32.0, gdpPerCapitaPPP: 715, populationM: 75.0, note: '人口与产值据全球第一梯队' },
      { year: 1000, gdpSharePct: 28.9, gdpPerCapitaPPP: 720, populationM: 75.0, note: '朱罗王朝跨海贸航时代' },
      { year: 1500, gdpSharePct: 24.4, gdpPerCapitaPPP: 870, populationM: 110.0, note: '维查耶那伽罗与德里苏丹手工业中心' },
      { year: 1700, gdpSharePct: 24.4, gdpPerCapitaPPP: 880, populationM: 165.0, note: '莫卧儿经济总量超越欧洲单一强权' },
      { year: 1820, gdpSharePct: 16.0, gdpPerCapitaPPP: 780, populationM: 209.0, note: '殖民征服加深与手工业退坡开始' },
      { year: 1870, gdpSharePct: 12.1, gdpPerCapitaPPP: 760, populationM: 253.0, note: '英属印度铁路修筑但人均停滞' },
      { year: 1913, gdpSharePct: 7.5, gdpPerCapitaPPP: 940, populationM: 303.7, note: '孟买棉纺与塔塔钢铁艰难崛起' },
      { year: 1950, gdpSharePct: 4.2, gdpPerCapitaPPP: 920, populationM: 359.0, note: '印巴分治后重工进口替代起步' },
      { year: 1990, gdpSharePct: 4.1, gdpPerCapitaPPP: 1860, populationM: 839.0, note: '市场自由化变革前夜' },
      { year: 2024, gdpSharePct: 8.0, gdpPerCapitaPPP: 8250, populationM: 1441.0, note: '人口第一大国与世界第三大 PPP 经济体' },
    ],
  },

  usa: {
    countryId: 'usa',
    structuralSignature:
      '靠大洲级统一国内市场、开放移民、高效资本市场与持续技术前沿垄断（电力汽车、微电子、互联网至生成式 AI）连续百余年居世界霸权首位。',
    currencyHistory:
      '独立战争大陆币 -> 1792 汉密尔顿金银复本位美元 -> 1913 美联储创立 -> 1944 布雷顿森林黄金锚 -> 1971 至今纯信用全球储备主币美元。',
    fiscalEvolution:
      '汉密尔顿联邦承接各州债务建国信用 -> 长期保护关税时代 -> 1913 个人所得税宪法第 16 修正案 -> 新政社保与现代万亿赤字国债金融化循环。',
    pillarIndustries: [
      { era: '建国与西进', sectors: '南方种植园原棉、中西部粮仓运河、东部轻纺与大陆铁路建设' },
      { era: '二十世纪', sectors: '福特流水线汽车、钢铁石化、好莱坞文化、军工航天与半导体硅谷' },
      { era: '当代经济', sectors: '云计算与大模型 AI、华尔街金融霸权、生物医药与页岩油气出口' },
    ],
    turningPoints: [
      { year: 1791, title: '汉密尔顿《制造业报告》与国家信用银行建立', impact: '将违约边缘的独立邦联债务变成伦敦投资者追捧的一流国债。' },
      { year: 1869, title: '太平洋铁路合龙打通洲际单一国内大市场', impact: '标准化规模经济使美国钢产量与制造业迅速超越英德。' },
      { year: 1913, title: '美联储成立与福特流水线开启大众消费时代', impact: '工业生产率与现代金融调节工具同时登顶全球首位。' },
      { year: 1944, title: '布雷顿森林体系确立美元霸权与科技研发总动员', impact: '战后欧洲日本受摧毁背景下，美国占据全球经济绝对领先地位。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.3, gdpPerCapitaPPP: 400, populationM: 0.7, note: '北美原住民采集与早期农业部落' },
      { year: 1000, gdpSharePct: 0.5, gdpPerCapitaPPP: 420, populationM: 1.3, note: '卡霍基亚等密西西比河农业聚落' },
      { year: 1500, gdpSharePct: 0.4, gdpPerCapitaPPP: 450, populationM: 2.0 },
      { year: 1700, gdpSharePct: 0.2, gdpPerCapitaPPP: 880, populationM: 1.0, note: '北美十三殖民地早期海运烟草木业' },
      { year: 1820, gdpSharePct: 1.8, gdpPerCapitaPPP: 2180, populationM: 9.9, note: '伊利运河与棉花带扩张，高工资吸引欧洲移民' },
      { year: 1870, gdpSharePct: 8.8, gdpPerCapitaPPP: 4200, populationM: 40.2, note: '南北战争后统一市场制造业突飞猛进' },
      { year: 1913, gdpSharePct: 18.9, gdpPerCapitaPPP: 8460, populationM: 97.6, note: '已成全球最大单一工业与消费强权' },
      { year: 1950, gdpSharePct: 27.3, gdpPerCapitaPPP: 15240, populationM: 152.3, note: '历史性全球份额峰值' },
      { year: 1990, gdpSharePct: 21.4, gdpPerCapitaPPP: 36980, populationM: 250.1, note: 'IT 信息技术与华尔街金融化转型' },
      { year: 2024, gdpSharePct: 15.4, gdpPerCapitaPPP: 61800, populationM: 336.0, note: '按美元计名义第一，AI 与资本市场继续吸纳全球资本' },
    ],
  },

  britain: {
    countryId: 'britain',
    structuralSignature:
      '首个突破马尔萨斯陷阱的工业革命先驱，先后凭借海军海外市场、金本位金融城霸权与现当代高端金融—专业服务业延续超小国体量之外的影响力。',
    currencyHistory:
      '英镑银币 -> 1694 英格兰银行可兑纸币 -> 1717 牛顿定金价实质金本位 -> 1914 停金/1931 退金本位 -> 当代浮动英镑。',
    fiscalEvolution:
      '1688 光荣革命确立议会征税权 -> 永久低息国债市场 -> 1846 废除《谷物法》转向自由贸易零关税与早期个人所得税。',
    pillarIndustries: [
      { era: '前工业化', sectors: '高品质羊毛出口、圈地集约农牧与早期海运殖民重商贸易' },
      { era: '世界工厂期', sectors: '煤矿焦铁、曼彻斯特机械棉纺、铁路基建与全球蒸汽轮船造船业' },
      { era: '当代经济', sectors: '伦敦金融城外汇/保险、医药研发、高等教育文化与精密航空服务' },
    ],
    turningPoints: [
      { year: 1694, title: '英格兰银行成立与金融革命降息融资', impact: '公共信用利率从两位数降至 3%–4%，战胜国力更庞大的法国。' },
      { year: 1769, title: '瓦特改进蒸汽机叠加煤炭富矿与高工资激励', impact: '引爆化石能源驱动的持续生产力大爆炸。' },
      { year: 1846, title: '废除《谷物法》开启全球自由贸易霸权期', impact: '放弃本土农业保护以换取世界工业品主导权。' },
      { year: 1986, title: '伦敦金融城“大爆炸”去监管改革', impact: '制造业衰退后靠欧洲美元与离岸金融重建伦敦国际金融中心地位。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.4, gdpPerCapitaPPP: 540, populationM: 1.5, note: '不列颠铁器部落与罗马行省边缘' },
      { year: 1000, gdpSharePct: 0.6, gdpPerCapitaPPP: 750, populationM: 2.0 },
      { year: 1500, gdpSharePct: 1.1, gdpPerCapitaPPP: 1280, populationM: 3.9, note: '毛呢出口开始积累乡村手工业资本' },
      { year: 1700, gdpSharePct: 2.9, gdpPerCapitaPPP: 2150, populationM: 8.6, note: '光荣革命后金融与大西洋海贸跃升' },
      { year: 1820, gdpSharePct: 5.2, gdpPerCapitaPPP: 3080, populationM: 21.2, note: '工业革命首位完成，人均冠绝大国' },
      { year: 1870, gdpSharePct: 9.0, gdpPerCapitaPPP: 5310, populationM: 31.4, note: '大英帝国与世界工厂全盛高点' },
      { year: 1913, gdpSharePct: 8.2, gdpPerCapitaPPP: 7940, populationM: 45.6, note: '金融主导仍强但工业份额被美德超越' },
      { year: 1950, gdpSharePct: 6.5, gdpPerCapitaPPP: 10980, populationM: 50.1, note: '战后帝国解体与福利国家建立' },
      { year: 1990, gdpSharePct: 3.5, gdpPerCapitaPPP: 26300, populationM: 57.2, note: '撒切尔去工业化转型金融服务业' },
      { year: 2024, gdpSharePct: 2.2, gdpPerCapitaPPP: 41600, populationM: 68.3, note: '全球顶尖外汇清算与知识服务强国' },
    ],
  },

  japan: {
    countryId: 'japan',
    structuralSignature:
      '亚洲首个跨入工业文明的国家：江户商业网络打底、明治政府“殖产兴业”、二战后通产省产业政策创造了东亚雁阵经济奇迹，也是全球应对老龄化资产泡沫的先驱实验室。',
    currencyHistory:
      '进口宋明铜钱 -> 江户德川三货制（金两/银匁/钱文）-> 1871 明治日元（金本位）-> 1971 升值浮动 -> 当代超宽松 QQ 日元。',
    fiscalEvolution:
      '德川石高实物年贡 -> 1873 地租改正现金定额税支撑铁路矿业 -> 战后主银行制与财政投融资 -> 消费税提升应对老龄化社保赤字。',
    pillarIndustries: [
      { era: '江户—明治', sectors: '大阪大米期货贸易、生丝外销、八幡制铁、三菱造船与轻纺工业化' },
      { era: '高度成长期', sectors: '索尼随身听消费电子、丰田精益汽车制造、造船与机械出口顺差' },
      { era: '当代经济', sectors: '半导体关键材料与光刻胶/精密机床隐形冠军、动漫文化与海外投资收益净大国' },
    ],
    turningPoints: [
      { year: 1868, title: '明治维新与“殖产兴业”国营示范工厂私有化', impact: '迅速建立现代铁路、银行与三菱三井等综合商社财阀格局。' },
      { year: 1955, title: '“国民收入倍增计划”与东亚出口导向高速增长', impact: '连续二十年实际增速近两位数，1968 年跃居资本主义世界第二。' },
      { year: 1985, title: '《广场协议》日元急速升值催化地产股市超级泡沫', impact: '金融自由化监管滞后埋下 1990 年破灭与长期通缩阴影。' },
    ],
    series: [
      { year: 1, gdpSharePct: 1.2, gdpPerCapitaPPP: 425, populationM: 3.0, note: '弥生时代稻作与铁器引入期' },
      { year: 1000, gdpSharePct: 2.7, gdpPerCapitaPPP: 680, populationM: 7.5, note: '平安庄园经济扩张' },
      { year: 1500, gdpSharePct: 3.1, gdpPerCapitaPPP: 800, populationM: 15.4, note: '战国城下町与石见银矿涌现前夜' },
      { year: 1700, gdpSharePct: 4.1, gdpPerCapitaPPP: 920, populationM: 27.0, note: '江户和平人口高密度城市化与识字率提升' },
      { year: 1820, gdpSharePct: 3.0, gdpPerCapitaPPP: 1020, populationM: 31.0, note: '原初商业高度成熟（堂岛米市）' },
      { year: 1870, gdpSharePct: 2.3, gdpPerCapitaPPP: 1180, populationM: 34.4, note: '明治维新刚起步追赶欧美' },
      { year: 1913, gdpSharePct: 2.6, gdpPerCapitaPPP: 2210, populationM: 51.7, note: '日俄战后轻重工业全面成型' },
      { year: 1950, gdpSharePct: 3.0, gdpPerCapitaPPP: 3060, populationM: 83.8, note: '战败废墟重建与朝鲜战争特需起点' },
      { year: 1990, gdpSharePct: 8.5, gdpPerCapitaPPP: 30040, populationM: 123.5, note: '“日本第一”泡沫巅峰，全球占比冲至近 9%' },
      { year: 2024, gdpSharePct: 3.6, gdpPerCapitaPPP: 39600, populationM: 123.8, note: '老龄化下仍具雄厚海外净资产与上游供应链控制力' },
    ],
  },

  germany: {
    countryId: 'germany',
    structuralSignature:
      '关税同盟破除邦国壁垒后凭借研究型大学实验室、全能银行长期信贷与“双元制”技工生态，在第二工业革命电化工领域弯道超车成为欧洲永久制造业核心引擎。',
    currencyHistory:
      '散碎莱茵塔勒银币 -> 1873 金马克 -> 1923 恶性通胀与地租马克 -> 1948 西德马克“货币奇迹” -> 1999 欧元主权核心支柱。',
    fiscalEvolution:
      '1834 普鲁士主导德意志关税同盟（Zollverein）-> 俾斯麦全国社会保障养老立法 -> 当代严格控制赤字的“债务刹车”社会市场经济。',
    pillarIndustries: [
      { era: '十九世纪末', sectors: '鲁尔煤铁、克虏伯重机、拜耳与巴斯夫合成化工染料、西门子电气工程' },
      { era: '战后黄金期', sectors: '莱茵模式精密机床、奔驰宝马大众汽车、医疗光学与“隐形冠军”家族中小企业' },
      { era: '当代经济', sectors: '工业 4.0 自动化、精密化工、汽车电动化转型与高储蓄贸易顺差经济' },
    ],
    turningPoints: [
      { year: 1834, title: '德意志关税同盟取消邦国内部关隘并修建统一铁路', impact: '在政治统一之前率先建构了德语区工业市场。' },
      { year: 1871, title: '统一金马克及“科研+全能银行”产业追赶模式', impact: '仅用三十年在钢铁、化工与电气专利上全面超越英国。' },
      { year: 1948, title: '艾哈德货币改革废除配给与价格管制引爆莱茵奇迹', impact: '社会市场经济确保低通胀高效率工业复兴。' },
    ],
    series: [
      { year: 1, gdpSharePct: 1.4, gdpPerCapitaPPP: 610, populationM: 3.0, note: '莱茵罗马边境与日耳曼林牧' },
      { year: 1000, gdpSharePct: 1.5, gdpPerCapitaPPP: 640, populationM: 4.1 },
      { year: 1500, gdpSharePct: 3.3, gdpPerCapitaPPP: 1120, populationM: 12.0, note: '奥格斯堡富格尔铜银矿业金融及汉萨贸易' },
      { year: 1700, gdpSharePct: 3.7, gdpPerCapitaPPP: 1410, populationM: 15.0, note: '三十年战争后缓慢恢复' },
      { year: 1820, gdpSharePct: 3.9, gdpPerCapitaPPP: 1720, populationM: 24.9, note: '分裂关税林立待统一' },
      { year: 1870, gdpSharePct: 6.5, gdpPerCapitaPPP: 2940, populationM: 39.2, note: '关税同盟叠加鲁尔铁路工业起飞' },
      { year: 1913, gdpSharePct: 8.7, gdpPerCapitaPPP: 5830, populationM: 65.0, note: '欧洲大陆头号工业霸主' },
      { year: 1950, gdpSharePct: 5.0, gdpPerCapitaPPP: 6200, populationM: 68.4, note: '分裂后的西德“经济奇迹”起点' },
      { year: 1990, gdpSharePct: 4.7, gdpPerCapitaPPP: 25400, populationM: 79.4, note: '两德统一负担与欧元区筹建' },
      { year: 2024, gdpSharePct: 3.1, gdpPerCapitaPPP: 44100, populationM: 84.5, note: '欧洲最大经济体与高端机电出口强国' },
    ],
  },

  france: {
    countryId: 'france',
    structuralSignature:
      '中世纪欧陆人口与富饶农业中心，19 世纪工业化节奏偏缓但保有精致工程与金融资本；二战后靠“国家指示性计划+核电高铁+奢侈品航宇”重塑高效率现代福利大国。',
    currencyHistory:
      '查理曼第纳尔银制 -> 1720 约翰·劳纸币崩盘 -> 大革命指券 -> 1803 拿破仑“芽月法郎”金银稳健币 -> 1999 欧元创始主力。',
    fiscalEvolution:
      '路易十四柯尔贝尔重商关税与包税制积弊 -> 拿破仑现代中央审计财政 -> 战后欧洲高公共开支（约占 GDP 五成余）社会再分配体系。',
    pillarIndustries: [
      { era: '前现代', sectors: '欧洲首屈一指的谷物与葡萄酒农业、里昂丝织、巴黎奢侈手工工坊' },
      { era: '二十世纪后半叶', sectors: '空中客车航空联盟、TGV 高铁、70% 核能电力自主与标致雪铁龙制造' },
      { era: '当代经济', sectors: 'LVMH 为首全球奢侈品牌、军工核能、旅游服务、药业及农业食品深加工' },
    ],
    turningPoints: [
      { year: 1665, title: '柯尔贝尔重商主义统一关税并扶植皇家手工工场', impact: '为法国工艺品、军舰与海外公司确立百年品质优势。' },
      { year: 1804, title: '《拿破仑法典》与法兰西银行固化产权与稳定币值', impact: '彻底清除封建行会地租障碍，小农产权得以全国化。' },
      { year: 1958, title: '战后“光辉三十年”统筹核电基建并领衔欧洲共同市场', impact: '迅速完成农村向高技能都市工程制造业转型。' },
    ],
    series: [
      { year: 1, gdpSharePct: 2.3, gdpPerCapitaPPP: 750, populationM: 5.0, note: '罗马高卢富裕行省' },
      { year: 1000, gdpSharePct: 2.3, gdpPerCapitaPPP: 710, populationM: 6.5 },
      { year: 1500, gdpSharePct: 4.4, gdpPerCapitaPPP: 1210, populationM: 15.0, note: '西欧人口与赋税最雄厚王国' },
      { year: 1700, gdpSharePct: 5.3, gdpPerCapitaPPP: 1490, populationM: 21.5, note: '太阳王鼎盛期与欧陆霸主' },
      { year: 1820, gdpSharePct: 5.1, gdpPerCapitaPPP: 1830, populationM: 31.3, note: '革命分配小农土地减缓城市化但民生温和提升' },
      { year: 1870, gdpSharePct: 6.5, gdpPerCapitaPPP: 3000, populationM: 38.4, note: '第二帝国巴黎改造与早期国际铁路金融放贷国' },
      { year: 1913, gdpSharePct: 5.3, gdpPerCapitaPPP: 5560, populationM: 41.5, note: '航空汽车发明先驱，俄国债重要债权国' },
      { year: 1950, gdpSharePct: 4.1, gdpPerCapitaPPP: 8390, populationM: 41.8, note: '莫内计划开启战后高速现代化' },
      { year: 1990, gdpSharePct: 3.8, gdpPerCapitaPPP: 28700, populationM: 56.7, note: '高福利、核能与高铁现代社会成熟期' },
      { year: 2024, gdpSharePct: 2.2, gdpPerCapitaPPP: 40800, populationM: 68.4, note: '航空、核电与全球奢侈消费品重镇' },
    ],
  },

  italy: {
    countryId: 'italy',
    structuralSignature:
      '曾两度站上欧洲经济巅峰——古典罗马地中海统一市场与文艺复兴银行业/复式记账诞生地；现代呈现“工业重镇北方 + 低增长高老龄化高国债”二元张力。',
    currencyHistory:
      '罗马第纳里银币与奥雷乌斯金币 -> 佛罗伦萨弗罗林与威尼斯杜卡特（欧洲中世纪“美元”）-> 1861 统一里拉 -> 1999 欧元。',
    fiscalEvolution:
      '罗马行省税收与奥古斯都土地普查 -> 中世纪意大利城邦率先发明公债（Monte）货币财政 -> 现代高主权债务比率挑战。',
    pillarIndustries: [
      { era: '古代与复兴期', sectors: '地中海小麦橄榄酒海运、威尼斯东地中海香料垄断、佛罗伦萨羊毛银行' },
      { era: '战后工业化', sectors: '北方“经济奇迹”菲亚特汽车、家用电器、精密包装机械与服装皮具集群' },
      { era: '当代经济', sectors: '工业机械制造（欧洲第二大制造业规模）、时尚奢侈品、食品与文化遗产旅游' },
    ],
    turningPoints: [
      { year: -27, title: '“罗马和平”扫除地中海海盗实现零内部壁垒统一度量币', impact: '使意大利及罗马周边成为公元 1 世纪全欧最富裕区域。' },
      { year: 1252, title: '佛罗伦萨与热那亚铸造纯金币开启商业信用复兴', impact: '支票、海上保险、股份合伙（Commenda）与复式记账成型。' },
      { year: 1958, title: '加入欧洲共同市场并爆发北方工业城市经济奇迹', impact: '将贫困南欧农业国改造成七国集团现代化工业会员。' },
    ],
    series: [
      { year: 1, gdpSharePct: 6.3, gdpPerCapitaPPP: 1290, populationM: 7.0, note: '罗马帝国核心心脏，前工业人均顶峰之一' },
      { year: 1000, gdpSharePct: 1.9, gdpPerCapitaPPP: 730, populationM: 5.0, note: '海洋共和国开始恢复地中海贸易' },
      { year: 1500, gdpSharePct: 4.7, gdpPerCapitaPPP: 1760, populationM: 10.5, note: '文艺复兴人均收入领跑全欧洲' },
      { year: 1700, gdpSharePct: 3.9, gdpPerCapitaPPP: 1760, populationM: 13.3, note: '重心转移至大西洋，保持温和商业繁荣' },
      { year: 1820, gdpSharePct: 3.2, gdpPerCapitaPPP: 1780, populationM: 20.2, note: '邦国割裂等待统一' },
      { year: 1870, gdpSharePct: 3.8, gdpPerCapitaPPP: 2390, populationM: 27.9, note: '新统一王国推动“米兰-都灵-热那亚”工业三角' },
      { year: 1913, gdpSharePct: 3.5, gdpPerCapitaPPP: 4090, populationM: 37.2, note: '早期电气汽车赶超期' },
      { year: 1950, gdpSharePct: 3.1, gdpPerCapitaPPP: 5580, populationM: 47.1, note: '战后迅速工业重建' },
      { year: 1990, gdpSharePct: 3.4, gdpPerCapitaPPP: 26100, populationM: 56.7, note: '经济奇迹余晖与欧元区入场前财政整顿' },
      { year: 2024, gdpSharePct: 1.7, gdpPerCapitaPPP: 38200, populationM: 58.9, note: '精密制造集群扎实但面临停滞与老龄债务压力' },
    ],
  },

  netherlands: {
    countryId: 'netherlands',
    structuralSignature:
      '人口微薄却曾是首个现代金融与贸易资本主义样板（股票、央行与全球航运霸权），至今借鹿特丹物流枢纽与 ASML 半导体光刻设备独占技术制高点。',
    currencyHistory:
      '西班牙里亚尔 -> 1609 阿姆斯特丹贴现银行创“银行弗罗林”固定信用记账单位 -> 荷兰盾 -> 1999 欧元。',
    fiscalEvolution:
      '低税低成本高效商业省份契约联合公债 -> 当代高开放度贸易税收与强劲养老金储蓄体系。',
    pillarIndustries: [
      { era: '黄金时代', sectors: '波罗的海谷物海上马车夫、东印度公司香料股权融资、造船风车锯木、精密印刷' },
      { era: '二十世纪后', sectors: '飞利浦电气研发、壳牌联合利华跨国企业、现代温室高值农业出口' },
      { era: '当代经济', sectors: 'ASML 极紫外光刻机（全球芯片心脏）、鹿特丹欧陆第一深水港与数字跨境枢纽' },
    ],
    turningPoints: [
      { year: 1602, title: '荷兰东印度公司（VOC）与永久股票二级市场成立', impact: '革命性解决了大洋航运巨额长期资本锁定与大众分散持股问题。' },
      { year: 1609, title: '阿姆斯特丹交易所银行消除杂币成色混杂摩擦', impact: '令阿姆斯特丹称霸十七世纪国际低息金融中心。' },
      { year: 1984, title: '飞利浦与 ASMI 分拆孵出 ASML 光刻机制造生态', impact: '使这个 1800 万人口的小国掌控了现代信息文明硬件基座。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.1, gdpPerCapitaPPP: 680, populationM: 0.2 },
      { year: 1000, gdpSharePct: 0.1, gdpPerCapitaPPP: 690, populationM: 0.3 },
      { year: 1500, gdpSharePct: 0.3, gdpPerCapitaPPP: 1450, populationM: 1.0, note: '北海鲱鱼捕捞与造船专业化领先' },
      { year: 1700, gdpSharePct: 1.0, gdpPerCapitaPPP: 3390, populationM: 1.9, note: '黄金时代人均收入稳居全人类第一高地' },
      { year: 1820, gdpSharePct: 0.6, gdpPerCapitaPPP: 2940, populationM: 2.3 },
      { year: 1870, gdpSharePct: 0.9, gdpPerCapitaPPP: 4400, populationM: 3.6, note: '受益莱茵河出口工业腹地重新加速' },
      { year: 1913, gdpSharePct: 0.9, gdpPerCapitaPPP: 6450, populationM: 6.2 },
      { year: 1950, gdpSharePct: 1.1, gdpPerCapitaPPP: 9550, populationM: 10.1 },
      { year: 1990, gdpSharePct: 0.9, gdpPerCapitaPPP: 27400, populationM: 15.0, note: '欧洲高生产力与现代物流农业强国' },
      { year: 2024, gdpSharePct: 0.8, gdpPerCapitaPPP: 49200, populationM: 17.9, note: '欧洲人均富足前茅与半导体光刻霸主' },
    ],
  },

  russia: {
    countryId: 'russia',
    structuralSignature:
      '资源辽阔的大陆霸权：从莫斯科公国毛皮贸易起步，历经彼得沙俄重工业赶超、苏联计划体制极端加速建起超级军事重工帝国，解体后回归能源矿产与军事工业混合体制。',
    currencyHistory:
      '白银格里夫纳与基辅外银 -> 彼得十进制银卢布 -> 1897 维特金本位 -> 苏联非兑换卢布 -> 现代外汇与本币管制卢布。',
    fiscalEvolution:
      '毛皮实物贡赋与农奴人头税 -> 彼得及维特酒类专卖与外债修铁路 -> 苏联国家计划统购统销 -> 当代油气资源特许税与主权基金。',
    pillarIndustries: [
      { era: '帝俄时期', sectors: '毛皮蜂蜜出口、乌拉尔矿冶、乌克兰黑土小麦输出与巴库早期油田' },
      { era: '苏联时期', sectors: '高重工与航天核工业全产业链、西伯利亚油气管道与军工研发体' },
      { era: '当代经济', sectors: '原油天然气管道与 LNG 出口、军工核电技术输出、化肥钛金属及谷物全球供应' },
    ],
    turningPoints: [
      { year: 1861, title: '农奴制废除与维特金本位引入欧洲铁路外资', impact: '1890 年代爆发高速度铁路重工业建设潮。' },
      { year: 1928, title: '斯大林第一个五年计划强力工业化与农业集体化', impact: '不到十五年把农业国改造成能制造大批坦克飞机的全球第二工业极。' },
      { year: 1991, title: '苏联解体休克疗法私有化引发近半深度收缩', impact: '2000 年代借大宗能源超级周期恢复财政，2022 后深度重构“向东转”战时产业。' },
    ],
    series: [
      { year: 1, gdpSharePct: 1.6, gdpPerCapitaPPP: 450, populationM: 3.9, note: '东欧平原早期林牧定居点' },
      { year: 1000, gdpSharePct: 2.4, gdpPerCapitaPPP: 620, populationM: 7.1, note: '基辅罗斯河道商路网' },
      { year: 1500, gdpSharePct: 3.4, gdpPerCapitaPPP: 780, populationM: 17.0, note: '莫斯科大公国统一罗斯心腹' },
      { year: 1700, gdpSharePct: 4.4, gdpPerCapitaPPP: 950, populationM: 26.6, note: '彼得大帝东拓西伯利亚并开启矿冶' },
      { year: 1820, gdpSharePct: 5.4, gdpPerCapitaPPP: 1090, populationM: 54.8, note: '抗法胜利后版图辽阔但农奴制阻碍效率' },
      { year: 1870, gdpSharePct: 7.5, gdpPerCapitaPPP: 1500, populationM: 88.7 },
      { year: 1913, gdpSharePct: 8.5, gdpPerCapitaPPP: 2370, populationM: 156.2, note: '外资铁路热推高欧洲第 4 工业体量' },
      { year: 1950, gdpSharePct: 9.6, gdpPerCapitaPPP: 4520, populationM: 179.6, note: '苏联全境工业超级大国' },
      { year: 1990, gdpSharePct: 7.3, gdpPerCapitaPPP: 11200, populationM: 289.0, note: '计划体制崩溃临近，轻工消费严重匮乏' },
      { year: 2024, gdpSharePct: 3.3, gdpPerCapitaPPP: 28900, populationM: 144.2, note: '现代俄罗斯联邦：能源、粮食与防务工业重心' },
    ],
  },

  spain: {
    countryId: 'spain',
    structuralSignature:
      '借美洲金银涌入一度掌全球金融咽喉，却因王室屡次破产违约与过度依赖海外矿产引发“资源诅咒”沦为半边缘国；20 世纪后半叶凭欧盟融合、高铁路网与旅游新能源重建现代化强国。',
    currencyHistory: '卡斯蒂利亚马拉维迪与“八里亚尔西班牙银元”（全球贸易硬通货）-> 1868 比塞塔 -> 1999 欧元。',
    fiscalEvolution: '美洲皇家五分之一税（Quinto Real）叠加高利息战争借款反复违约 -> 当代欧盟财政框架下的自治区与国家税制。',
    pillarIndustries: [
      { era: '帝国期', sectors: '梅斯塔美丽奴羊毛出口、波托西与萨卡特卡斯银矿输欧、塞维利亚跨洋贸易税' },
      { era: '当代转型', sectors: '欧洲高密度高铁基建与工程承包、风电光伏、现代汽车组装、Zara 快时尚与全球顶级旅游业' },
    ],
    turningPoints: [
      { year: 1545, title: '波托西银山开矿引发百年“价格革命”', impact: '巨量白银未留本土产业化，反而外流向热那亚银行与低地荷英债权人。' },
      { year: 1986, title: '加入欧共体引入结构基金与现代企业竞争', impact: '快速抹平佛朗哥封闭时期落差，跻身西欧主流发达经济体。' },
    ],
    series: [
      { year: 1, gdpSharePct: 1.5, gdpPerCapitaPPP: 780, populationM: 3.8 },
      { year: 1000, gdpSharePct: 1.4, gdpPerCapitaPPP: 740, populationM: 4.0, note: '科尔多瓦后倭马亚水利城市繁华期' },
      { year: 1500, gdpSharePct: 1.9, gdpPerCapitaPPP: 1050, populationM: 6.8 },
      { year: 1700, gdpSharePct: 1.9, gdpPerCapitaPPP: 1360, populationM: 8.8 },
      { year: 1820, gdpSharePct: 1.8, gdpPerCapitaPPP: 1600, populationM: 12.2, note: '丧失绝大多数拉美殖民地陷入长期内乱' },
      { year: 1870, gdpSharePct: 1.8, gdpPerCapitaPPP: 1920, populationM: 16.2 },
      { year: 1913, gdpSharePct: 1.5, gdpPerCapitaPPP: 3280, populationM: 20.3 },
      { year: 1950, gdpSharePct: 1.2, gdpPerCapitaPPP: 3490, populationM: 28.0 },
      { year: 1990, gdpSharePct: 1.6, gdpPerCapitaPPP: 19500, populationM: 38.9, note: '加入欧共体爆发追赶热潮' },
      { year: 2024, gdpSharePct: 1.3, gdpPerCapitaPPP: 34800, populationM: 48.6, note: '旅游、清洁能源、食品与服务出口重镇' },
    ],
  },

  portugal: {
    countryId: 'portugal',
    structuralSignature:
      '人类首支跨洋全球贸易与香料垄断网络开辟者（果阿—马六甲—长崎白银三角），后续受限于本土狭小资源转向巴西甘蔗与黄金；当代借欧洲一体化发展现代海洋物流、风能与软木精工。',
    currencyHistory: '克鲁扎多金币与雷亚尔 -> 1911 埃斯库多 -> 1999 欧元。',
    fiscalEvolution: '里斯本“印度之家”（Casa da Índia）王室贸易专利税 -> 当代欧盟协同公共财政与绿色税制。',
    pillarIndustries: [
      { era: '大航海期', sectors: '胡椒丁香香料专卖、巴西糖厂种植园、米纳斯吉拉斯黄金开采与波特酒出口' },
      { era: '当代经济', sectors: '欧洲软木制品垄断、可再生风潮能发电、鞋履汽车零部件代工及远程科技文旅中心' },
    ],
    turningPoints: [
      { year: 1498, title: '绕行好望角建立印度洋要塞与长崎—澳门贸易圈', impact: '将香料利润改道里斯本与安特卫普。' },
      { year: 1703, title: '《梅休因条约》换取英国葡萄酒特惠但延迟本国纺织工业化', impact: '巴西黄金大量经葡国直接流向伦敦金融体系。' },
      { year: 1986, title: '加入欧共体结束长期半封闭农业出口状态', impact: '加速公路基建升级与高教育水准科技外包崛起。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.3, gdpPerCapitaPPP: 710, populationM: 0.5 },
      { year: 1000, gdpSharePct: 0.2, gdpPerCapitaPPP: 690, populationM: 0.6 },
      { year: 1500, gdpSharePct: 0.3, gdpPerCapitaPPP: 970, populationM: 1.0, note: '印度航线正刚启动收益爆炸' },
      { year: 1700, gdpSharePct: 0.4, gdpPerCapitaPPP: 1300, populationM: 2.0 },
      { year: 1820, gdpSharePct: 0.4, gdpPerCapitaPPP: 1470, populationM: 3.3, note: '巴西独立严重削弱里斯本财政来源' },
      { year: 1870, gdpSharePct: 0.4, gdpPerCapitaPPP: 1560, populationM: 4.3 },
      { year: 1913, gdpSharePct: 0.3, gdpPerCapitaPPP: 2000, populationM: 6.0 },
      { year: 1950, gdpSharePct: 0.3, gdpPerCapitaPPP: 3320, populationM: 8.4 },
      { year: 1990, gdpSharePct: 0.4, gdpPerCapitaPPP: 17300, populationM: 9.9 },
      { year: 2024, gdpSharePct: 0.3, gdpPerCapitaPPP: 31200, populationM: 10.6, note: '欧盟内稳健增长与科技宜居枢纽' },
    ],
  },

  korea: {
    countryId: 'korea',
    structuralSignature:
      '东亚最极端的“压缩式现代工业奇迹”样本：战后仅半世纪从全球最贫穷农业国跃居半导体（存储芯片）、尖端造船与新能源电池顶级出口强国。',
    currencyHistory:
      '高丽银瓶与朝鲜“常平通宝”铜钱 -> 1910 殖民朝鲜银行券 -> 1953 现代韩元。',
    fiscalEvolution:
      '新罗/高丽田柴科 -> 朝鲜“大同法”米布并银赋税折纳 -> 朴正熙时期政府主导政策性金融分配财阀融资 -> 现代研发税收激励。',
    pillarIndustries: [
      { era: '传统—冷战初', sectors: '稻作与高丽青瓷、白银棉布转口、1960s 假发服装轻工代工与汉江基建出海' },
      { era: '当代经济', sectors: '全球存储芯片垄断（三星/SK 海力士）、高附加值 LNG 造船、动力电池、汽车与 K-Pop 文化产业' },
    ],
    turningPoints: [
      { year: 1608, title: '李氏朝鲜推广“大同法”将实物贡纳折合米布钱推动商业货币化', impact: '培育出开城商人等早期全半岛商品批发网。' },
      { year: 1962, title: '首轮五年经济开发计划以出口导向扶持重化及财阀骨干', impact: '创造近三十年平均逾 8% 的汉江奇迹。' },
      { year: 1998, title: '亚洲金融危机倒逼财阀去杠杆与全力豪赌 IT 半导体赛道', impact: '把危机转化成高净利率科技领先优势。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.4, gdpPerCapitaPPP: 460, populationM: 1.6 },
      { year: 1000, gdpSharePct: 0.9, gdpPerCapitaPPP: 620, populationM: 3.1, note: '高丽王朝商业与海上瓷贸发展' },
      { year: 1500, gdpSharePct: 1.4, gdpPerCapitaPPP: 780, populationM: 8.0, note: '朝鲜世宗后农学测雨与人口稳定上升' },
      { year: 1700, gdpSharePct: 1.4, gdpPerCapitaPPP: 780, populationM: 12.2 },
      { year: 1820, gdpSharePct: 1.2, gdpPerCapitaPPP: 760, populationM: 13.8 },
      { year: 1870, gdpSharePct: 0.7, gdpPerCapitaPPP: 780, populationM: 14.2 },
      { year: 1913, gdpSharePct: 0.4, gdpPerCapitaPPP: 1310, populationM: 16.0 },
      { year: 1950, gdpSharePct: 0.3, gdpPerCapitaPPP: 1380, populationM: 20.8, note: '朝鲜战争爆发前极低农业起点' },
      { year: 1990, gdpSharePct: 1.2, gdpPerCapitaPPP: 13890, populationM: 42.9, note: '跻身亚洲四小龙工业核心成员' },
      { year: 2024, gdpSharePct: 1.6, gdpPerCapitaPPP: 38200, populationM: 51.7, note: '研发占比世界前二的高端制造标杆' },
    ],
  },

  vietnam: {
    countryId: 'vietnam',
    structuralSignature:
      '依托红河三角洲精耕农业与狭长沿海良港，历史融入东亚白银与东南亚海商网；1986 年“革新开放”后积极拥抱全球 FTA，加速承接东亚电子与纺织制造业转移。',
    currencyHistory:
      '丁朝“太平兴宝”至阮朝嘉隆铜钱白银条 -> 法属印度支那银皮阿斯特 -> 现代越南盾。',
    fiscalEvolution:
      '李陈均田租税 -> 阮朝法属殖民盐酒鸦片专卖 -> 当代积极免税工业园与全面自由贸易协定政策。',
    pillarIndustries: [
      { era: '古代至近代', sectors: '双季水稻余粮、清化升龙陶瓷外销、法殖时期红河煤与湄公河稻胶出口' },
      { era: '当代经济', sectors: '智能手机与电子总装（北宁/海防）、鞋服纺织、咖啡水产及全球制造业承接枢纽' },
    ],
    turningPoints: [
      { year: 1600, title: '广南会安发展成明朝海禁期日中白银丝瓷大中转港', impact: '南部商业化程度跃上东南亚前列。' },
      { year: 1986, title: '“革新开放”（Đổi Mới）承认私有制与吸引跨国制造业', impact: '从粮食短缺蜕变为全球重要出口基地与高增速明星。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.3, gdpPerCapitaPPP: 510, populationM: 1.1 },
      { year: 1000, gdpSharePct: 0.4, gdpPerCapitaPPP: 630, populationM: 1.5 },
      { year: 1500, gdpSharePct: 0.6, gdpPerCapitaPPP: 780, populationM: 3.3 },
      { year: 1700, gdpSharePct: 0.6, gdpPerCapitaPPP: 820, populationM: 4.5, note: '会安海商大中转繁荣期' },
      { year: 1820, gdpSharePct: 0.6, gdpPerCapitaPPP: 840, populationM: 6.6 },
      { year: 1870, gdpSharePct: 0.4, gdpPerCapitaPPP: 810, populationM: 10.5 },
      { year: 1913, gdpSharePct: 0.4, gdpPerCapitaPPP: 1150, populationM: 15.0 },
      { year: 1950, gdpSharePct: 0.3, gdpPerCapitaPPP: 1050, populationM: 25.3 },
      { year: 1990, gdpSharePct: 0.3, gdpPerCapitaPPP: 1640, populationM: 66.2, note: '革新开放早期高速爬坡起点' },
      { year: 2024, gdpSharePct: 0.8, gdpPerCapitaPPP: 10200, populationM: 100.3, note: '亚洲制造业新枢纽与高贸易开放度经济体' },
    ],
  },

  thailand: {
    countryId: 'thailand',
    structuralSignature:
      '依托湄南河谷地与免于殖民统治的自主外交平衡，大城至曼谷王朝靠白米锡矿出口平滑转型为东南亚汽车底特律（“东方底特律”）、旅游度假中心与精密硬盘基地。',
    currencyHistory:
      '素可泰/大城特征十足的铸银币“钵印币”（Pod Duang）-> 1897 现代分进制泰铢。',
    fiscalEvolution:
      '王室对华商米糖海上朝贡贸易垄断 -> 1855《鲍林条约》自由贸易开放固定低关税 -> 当代外资汽车免税园区与金融审慎调节。',
    pillarIndustries: [
      { era: '古代至近代', sectors: '湄南河大米、锡矿、柚木与中暹朝贡丝瓷贸易' },
      { era: '当代经济', sectors: '日系及新能源车东南亚最大整车制造中心、计算机硬盘、大米橡胶农产品与全球旅业' },
    ],
    turningPoints: [
      { year: 1855, title: '《鲍林条约》促成朱拉隆功现代化与湄南河开荒成全球最大稻米出口地', impact: '稳定外汇收入避免陷入西方全殖民统治。' },
      { year: 1985, title: '承接日语“广场协议”后日资汽车与电子大举南迁', impact: '奠定东南亚制造业关键组装和零部件腹地。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.3, gdpPerCapitaPPP: 490, populationM: 1.0 },
      { year: 1000, gdpSharePct: 0.4, gdpPerCapitaPPP: 620, populationM: 1.5 },
      { year: 1500, gdpSharePct: 0.6, gdpPerCapitaPPP: 790, populationM: 2.8, note: '大城王国海商都会勃兴' },
      { year: 1700, gdpSharePct: 0.5, gdpPerCapitaPPP: 860, populationM: 3.5 },
      { year: 1820, gdpSharePct: 0.4, gdpPerCapitaPPP: 910, populationM: 4.7 },
      { year: 1870, gdpSharePct: 0.3, gdpPerCapitaPPP: 980, populationM: 5.8 },
      { year: 1913, gdpSharePct: 0.3, gdpPerCapitaPPP: 1340, populationM: 8.7 },
      { year: 1950, gdpSharePct: 0.3, gdpPerCapitaPPP: 1310, populationM: 19.4 },
      { year: 1990, gdpSharePct: 0.7, gdpPerCapitaPPP: 7400, populationM: 55.8, note: '亚洲“小虎”高增长中后期' },
      { year: 2024, gdpSharePct: 0.9, gdpPerCapitaPPP: 16200, populationM: 71.7, note: '东盟制造、农业深加工与旅游支柱核心' },
    ],
  },

  indonesia: {
    countryId: 'indonesia',
    structuralSignature:
      '马六甲咽喉与群岛香料矿产富藏体：经历了三佛齐满者伯夷海商盛世与荷兰强迫种植剥削，如今成长为东盟最大人口市场与全球镍矿、新能源产业链上游巨擘。',
    currencyHistory:
      '古代室利佛逝金币 -> 荷属东印度盾 -> 1945 独立印度尼西亚盾（Rupiah）。',
    fiscalEvolution:
      '港口海关船税 -> 1830 荷印“强迫种植制”（Cultivation System）压榨现金作物支撑荷兰财政 -> 现代大宗禁矿本土冶炼升级。',
    pillarIndustries: [
      { era: '传统与殖民期', sectors: '马鲁古丁香肉豆蔻香料垄断、爪哇蔗糖、苏门答腊橡胶锡矿与早期石油' },
      { era: '当代经济', sectors: '全球第一大镍矿加工与动力电池前驱体基地、棕榈油煤炭出口、2.8 亿内需数字化消费' },
    ],
    turningPoints: [
      { year: 1602, title: '荷兰东印度公司以武力夺取香料群岛控制巴达维亚枢纽', impact: '把印度洋东端收益系统性地转输阿姆斯特丹。' },
      { year: 2020, title: '全面禁止原镍矿直接出口强迫外资建精炼深加工园', impact: '显著推升产业链附加值，成为全球电动车关键矿产枢纽。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.6, gdpPerCapitaPPP: 510, populationM: 2.8 },
      { year: 1000, gdpSharePct: 0.9, gdpPerCapitaPPP: 680, populationM: 4.5, note: '室利佛逝与爪哇湿稻航贸兴盛' },
      { year: 1500, gdpSharePct: 1.5, gdpPerCapitaPPP: 860, populationM: 10.7, note: '马六甲与爪哇北岸港市繁荣' },
      { year: 1700, gdpSharePct: 1.5, gdpPerCapitaPPP: 890, populationM: 13.1 },
      { year: 1820, gdpSharePct: 1.5, gdpPerCapitaPPP: 970, populationM: 17.9 },
      { year: 1870, gdpSharePct: 1.3, gdpPerCapitaPPP: 1040, populationM: 28.9, note: '爪哇蔗糖咖啡殖民种植高产期' },
      { year: 1913, gdpSharePct: 1.3, gdpPerCapitaPPP: 1450, populationM: 49.9 },
      { year: 1950, gdpSharePct: 0.9, gdpPerCapitaPPP: 1310, populationM: 79.0 },
      { year: 1990, gdpSharePct: 1.2, gdpPerCapitaPPP: 4030, populationM: 181.4, note: '工业化多样出口降低单一石油依赖' },
      { year: 2024, gdpSharePct: 2.3, gdpPerCapitaPPP: 11200, populationM: 279.8, note: '东盟体量冠军与绿色矿产产业链新贵' },
    ],
  },

  iran: {
    countryId: 'iran',
    structuralSignature:
      '居于欧亚丝绸枢纽的波斯高原文明：古代凭借皇家御道与驿站中介获取欧亚过境红利；近现代拥有巨量油气储藏，长期在能源开发、内生科技与地缘制裁困局间剧烈摆动。',
    currencyHistory:
      '大流士达里克金币与西格罗斯银币 -> 萨珊德拉克马纯银币 -> 萨非阿巴斯银币 -> 现代伊朗里亚尔。',
    fiscalEvolution:
      '阿契美尼德标准化行省白银定额贡赋 -> 现代高度依赖国家石油公司外汇收入与内部双重汇率补贴网络。',
    pillarIndustries: [
      { era: '古代帝国', sectors: '坎儿井灌溉水果、丝绸地毯织造与连接中国地中海的陆上丝路居间贸易' },
      { era: '近现代', sectors: '中东最早发现石油（1908）、大型石化炼油、自主钢铁汽车与受制裁制约下的国内替代制造' },
    ],
    turningPoints: [
      { year: -518, title: '大流士铸达里克金币与贯通御道打造帝国财政样板', impact: '开创统一铸币推动欧亚跨区贸易先河。' },
      { year: 1951, title: '摩萨台推进石油国有化触发油权主权觉醒', impact: '能源主权争夺主导此后半个多世纪伊朗政治与制裁轨迹。' },
    ],
    series: [
      { year: 1, gdpSharePct: 1.8, gdpPerCapitaPPP: 780, populationM: 4.0, note: '帕提亚安息控制丝路中段咽喉' },
      { year: 1000, gdpSharePct: 2.2, gdpPerCapitaPPP: 920, populationM: 4.5, note: '伊朗学者与城市商贸黄金期' },
      { year: 1500, gdpSharePct: 1.1, gdpPerCapitaPPP: 950, populationM: 4.0, note: '萨非王朝重构波斯丝绸外销国家垄断' },
      { year: 1700, gdpSharePct: 1.2, gdpPerCapitaPPP: 980, populationM: 5.0 },
      { year: 1820, gdpSharePct: 0.7, gdpPerCapitaPPP: 930, populationM: 6.6 },
      { year: 1870, gdpSharePct: 0.5, gdpPerCapitaPPP: 1120, populationM: 8.4 },
      { year: 1913, gdpSharePct: 0.4, gdpPerCapitaPPP: 1580, populationM: 10.9, note: '英伊石油开采刚启程' },
      { year: 1950, gdpSharePct: 0.4, gdpPerCapitaPPP: 2740, populationM: 16.3 },
      { year: 1990, gdpSharePct: 0.6, gdpPerCapitaPPP: 5750, populationM: 56.2 },
      { year: 2024, gdpSharePct: 0.8, gdpPerCapitaPPP: 12100, populationM: 89.2, note: '油气丰沛但在长期制裁下承压运行' },
    ],
  },

  mongolia: {
    countryId: 'mongolia',
    structuralSignature:
      '高纬度欧亚草原游牧—驿站文明：13–14 世纪凭借横跨欧亚的“牌子驿站”主导了史无前例的大陆税收与白银流通网；当代转为人口少、矿产极丰富的高顺周期铜煤输出经济体。',
    currencyHistory:
      '马匹丝帛贸易 -> 忽必烈大元“中统交钞”全纸币流通网 -> 苏联时代图格里克。',
    fiscalEvolution:
      '草原部落牧税与汗廷驿站税（站赤） -> 当代严重依赖奥尤陶勒盖铜金矿及对华焦煤输出财政周期。',
    pillarIndustries: [
      { era: '汗国盛世', sectors: '骑兵畜牧供给、斡脱（Ortoq）国际商队放贷、跨欧亚丝路保护费与安全保障' },
      { era: '当代经济', sectors: '超大型铜金煤炭矿业开采、羊绒畜牧深加工与中俄陆桥运输走廊' },
    ],
    turningPoints: [
      { year: 1235, title: '草原各部联合大驿站贯通从大都到伏尔加与大不里士的欧亚和平', impact: '把横贯世界最大陆块贸易运费风险压至低点。' },
      { year: 2009, title: '奥尤陶勒盖超大型铜金矿与煤炭开发接入中国工业需求', impact: '草原经济出现一轮资源热潮飙升与高外债周期波动。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.2, gdpPerCapitaPPP: 480, populationM: 0.6, note: '匈奴游牧草原帝国控制西域贡物' },
      { year: 1000, gdpSharePct: 0.3, gdpPerCapitaPPP: 580, populationM: 0.8 },
      { year: 1500, gdpSharePct: 0.2, gdpPerCapitaPPP: 690, populationM: 1.0 },
      { year: 1700, gdpSharePct: 0.1, gdpPerCapitaPPP: 680, populationM: 1.0 },
      { year: 1820, gdpSharePct: 0.1, gdpPerCapitaPPP: 700, populationM: 1.1 },
      { year: 1870, gdpSharePct: 0.1, gdpPerCapitaPPP: 760, populationM: 1.2 },
      { year: 1913, gdpSharePct: 0.1, gdpPerCapitaPPP: 890, populationM: 1.3 },
      { year: 1950, gdpSharePct: 0.1, gdpPerCapitaPPP: 1450, populationM: 0.8 },
      { year: 1990, gdpSharePct: 0.1, gdpPerCapitaPPP: 3800, populationM: 2.2 },
      { year: 2024, gdpSharePct: 0.1, gdpPerCapitaPPP: 10800, populationM: 3.5, note: '稀缺铜煤输出带来高增速与商品周期波动' },
    ],
  },

  greece: {
    countryId: 'greece',
    structuralSignature:
      '地中海古典贸易银币制高点与拜占庭“中世纪美元”发源地；现代依托全球规模居首的商船航运船队与爱琴海文旅业，在欧债深渊整固后呈现强韧服务业复苏。',
    currencyHistory:
      '雅典“猫头鹰”标准银币（劳里昂银矿）-> 君士坦丁“索利多”高纯金币维持 700 年信誉 -> 德拉克马 -> 2001 欧元。',
    fiscalEvolution:
      '雅典城邦海运税与同盟金库 -> 拜占庭稳定土税与金本位支撑军区 -> 2010–2018 欧债三驾马车紧缩改革实现基本财政盈余。',
    pillarIndustries: [
      { era: '古典与拜占庭', sectors: '黑海粮食与橄榄油双耳瓶出口、劳里昂银矿、君士坦丁堡丝绸紫袍垄断与欧亚转口税' },
      { era: '当代经济', sectors: '全球运力第一梯队的希腊船王远洋船队、地中海航运港口与世界级海岛历史旅游' },
    ],
    turningPoints: [
      { year: -483, title: '劳里昂深层大银矿发现催生雅典三列桨海军与德拉克马全地中海通用', impact: '以金融金属矿铸出霸权秩序。' },
      { year: 2010, title: '欧债危机触发现代史上发达经济体最大规模主权债务重组', impact: '严酷去杠杆十余年后在船运和投资拉动下重返稳步增长。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.7, gdpPerCapitaPPP: 1120, populationM: 2.0 },
      { year: 1000, gdpSharePct: 0.6, gdpPerCapitaPPP: 810, populationM: 1.5, note: '拜占庭马其顿王朝海商复苏高峰' },
      { year: 1500, gdpSharePct: 0.3, gdpPerCapitaPPP: 790, populationM: 1.0 },
      { year: 1700, gdpSharePct: 0.3, gdpPerCapitaPPP: 860, populationM: 1.5 },
      { year: 1820, gdpSharePct: 0.2, gdpPerCapitaPPP: 1020, populationM: 2.3 },
      { year: 1870, gdpSharePct: 0.2, gdpPerCapitaPPP: 1410, populationM: 3.7 },
      { year: 1913, gdpSharePct: 0.3, gdpPerCapitaPPP: 2540, populationM: 5.4 },
      { year: 1950, gdpSharePct: 0.2, gdpPerCapitaPPP: 3050, populationM: 7.6 },
      { year: 1990, gdpSharePct: 0.3, gdpPerCapitaPPP: 15900, populationM: 10.2 },
      { year: 2024, gdpSharePct: 0.2, gdpPerCapitaPPP: 27400, populationM: 10.3, note: '航运与文旅引领后危机持续修复' },
    ],
  },

  austria: {
    countryId: 'austria',
    structuralSignature:
      '维也纳长期统领多瑙河农业—矿冶—铁路混合帝国，更是现代“奥地利经济学派”理论摇篮；战后精简为阿尔卑斯高福利精密工业、冬夏季旅游与中东欧金融桥梁。',
    currencyHistory:
      '哈布斯堡“玛丽亚·特蕾莎银塔勒”（全球非洲中东通行百余年）-> 克朗 -> 奥地利先令 -> 1999 欧元。',
    fiscalEvolution:
      '奥匈二元帝国关税统一内贸市场 -> 战后中性小国高水准职业培训、国有基础企业逐步民营化接入德国汽车供应圈。',
    pillarIndustries: [
      { era: '帝国时期', sectors: '波希米亚纺织冶金（斯柯达机械）、施蒂利亚铁矿、多瑙河粮食金融统筹中心' },
      { era: '当代经济', sectors: '精密机械与特种钢材（奥钢联）、奥地利银行向巴尔干和中东欧扩张及高山文旅' },
    ],
    turningPoints: [
      { year: 1918, title: '奥匈帝国瓦解令维也纳瞬间失去多瑙河广阔免税市场腹地', impact: '触发 1931 维也纳信贷银行危机导火索，彻底倒逼战后走向精密小国路线。' },
      { year: 1995, title: '加入欧盟并在东欧转轨潮中成维也纳跨国总部中心', impact: '重新接通昔日中东欧传统贸易血脉。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.2, gdpPerCapitaPPP: 690, populationM: 0.5 },
      { year: 1000, gdpSharePct: 0.2, gdpPerCapitaPPP: 670, populationM: 0.7 },
      { year: 1500, gdpSharePct: 0.5, gdpPerCapitaPPP: 1120, populationM: 2.0 },
      { year: 1700, gdpSharePct: 0.7, gdpPerCapitaPPP: 1580, populationM: 2.5 },
      { year: 1820, gdpSharePct: 0.6, gdpPerCapitaPPP: 1940, populationM: 3.4 },
      { year: 1870, gdpSharePct: 0.7, gdpPerCapitaPPP: 2970, populationM: 4.5, note: '铁路建设推升维也纳金融繁荣' },
      { year: 1913, gdpSharePct: 0.8, gdpPerCapitaPPP: 5520, populationM: 6.8, note: '一战前多瑙河大都会黄金期' },
      { year: 1950, gdpSharePct: 0.5, gdpPerCapitaPPP: 5900, populationM: 6.9 },
      { year: 1990, gdpSharePct: 0.5, gdpPerCapitaPPP: 26900, populationM: 7.7 },
      { year: 2024, gdpSharePct: 0.4, gdpPerCapitaPPP: 44600, populationM: 9.1, note: '人均富足稳居欧盟核心优等生' },
    ],
  },

  poland: {
    countryId: 'poland',
    structuralSignature:
      '早期凭维斯瓦河“欧洲大粮仓”致富但农奴化庄园迟滞城市工商业；1990 年代开启欧洲史上最成功转轨之一，30 余年连续无硬着陆成长为欧盟第五制造中心。',
    currencyHistory: '波兰立陶宛兹罗提与银格罗申 -> 计划经济兹罗提 -> 1995 去四零换新可兑换兹罗提。',
    fiscalEvolution:
      '格但斯克粮食出口封建贵族免税特权 -> 1989 巴尔采罗维奇休克稳定物价 + 欧盟凝聚基金基建改造升级税制。',
    pillarIndustries: [
      { era: '近世期', sectors: '格但斯克向西欧荷兰输出大量黑麦小麦与波罗的海木材钾碱' },
      { era: '当代经济', sectors: '德国产业链近岸制造中心（家电、汽车电池电机、家具全球出口前三）、游戏及 IT 外包' },
    ],
    turningPoints: [
      { year: 1550, title: '格但斯克粮食繁荣固化东欧“二次农奴制”城乡失衡', impact: '享受短期出口红利却失去本国市民制造梯队。' },
      { year: 2004, title: '正式入盟融入德国中欧工业腹地并与英国西欧劳工互联', impact: '创造欧洲现代史罕见近三十年无衰退连续追赶记录。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.2, gdpPerCapitaPPP: 450, populationM: 0.5 },
      { year: 1000, gdpSharePct: 0.3, gdpPerCapitaPPP: 580, populationM: 1.2 },
      { year: 1500, gdpSharePct: 0.7, gdpPerCapitaPPP: 830, populationM: 4.0, note: '波兰立陶宛大粮食商业开端' },
      { year: 1700, gdpSharePct: 0.8, gdpPerCapitaPPP: 910, populationM: 6.0 },
      { year: 1820, gdpSharePct: 0.9, gdpPerCapitaPPP: 1120, populationM: 10.4 },
      { year: 1870, gdpSharePct: 0.9, gdpPerCapitaPPP: 1510, populationM: 14.0, note: '罗兹纺织与西里西亚煤炭开发' },
      { year: 1913, gdpSharePct: 1.0, gdpPerCapitaPPP: 2770, populationM: 26.7 },
      { year: 1950, gdpSharePct: 0.7, gdpPerCapitaPPP: 3900, populationM: 24.8 },
      { year: 1990, gdpSharePct: 0.7, gdpPerCapitaPPP: 8150, populationM: 38.1, note: '华沙市场化转型阵痛起点' },
      { year: 2024, gdpSharePct: 1.1, gdpPerCapitaPPP: 33200, populationM: 36.7, note: '已翻四倍实现欧盟核心生活水平趋同' },
    ],
  },

  sweden: {
    countryId: 'sweden',
    structuralSignature:
      '早期靠法伦铜矿与高纯度铁矿出口发家，曾率先发出现代欧洲首批纸币与世界上最古老央行；历经十九世纪贫穷移民潮后，靠爱立信/沃尔沃工业创新+“瑞典模式”高福利与今日独角兽密集孵化实现华丽逆袭。',
    currencyHistory: '重如铜桌的铜板币 -> 1661 帕尔姆斯特鲁赫全球欧洲首创纸币与 1668 瑞典国家银行 -> 现代克朗。',
    fiscalEvolution: '高税收全覆盖公共医疗教育搭配私有大财团（瓦伦堡家族）保护与严谨零赤字准则。',
    pillarIndustries: [
      { era: '前现代至工业化', sectors: '法伦铜矿（一战前全欧关键原料）、高品质木炭炼钢与斯堪的纳维亚木材纸浆' },
      { era: '当代经济', sectors: '爱立信 5G 通信、斯堪尼亚沃尔沃重卡、绿氢炼钢与欧洲密度最高科技独角兽（Spotify 等）' },
    ],
    turningPoints: [
      { year: 1668, title: '世界最古老持续运营央行瑞典国家银行（Riksbank）成立', impact: '奠定现代北欧理性信用审慎框架。' },
      { year: 1938, title: '《萨尔茨巴登协议》劳资和平共治与全面开放贸易出口导向', impact: '打造“高税高福利 + 高度亲商创新”平衡典范。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.1, gdpPerCapitaPPP: 490, populationM: 0.2 },
      { year: 1000, gdpSharePct: 0.1, gdpPerCapitaPPP: 620, populationM: 0.4, note: '维京北海与东线河道商网收尾' },
      { year: 1500, gdpSharePct: 0.2, gdpPerCapitaPPP: 1040, populationM: 0.6 },
      { year: 1700, gdpSharePct: 0.3, gdpPerCapitaPPP: 1380, populationM: 1.3 },
      { year: 1820, gdpSharePct: 0.3, gdpPerCapitaPPP: 1910, populationM: 2.6, note: '1870前大批穷困农民移民美国中西部' },
      { year: 1870, gdpSharePct: 0.4, gdpPerCapitaPPP: 2650, populationM: 4.2, note: '林产造纸滚珠轴承工业加速' },
      { year: 1913, gdpSharePct: 0.4, gdpPerCapitaPPP: 4940, populationM: 5.6, note: '战间期欧洲增速最快工业化楷模之一' },
      { year: 1950, gdpSharePct: 0.6, gdpPerCapitaPPP: 10720, populationM: 7.0 },
      { year: 1990, gdpSharePct: 0.5, gdpPerCapitaPPP: 28100, populationM: 8.6 },
      { year: 2024, gdpSharePct: 0.4, gdpPerCapitaPPP: 45400, populationM: 10.6, note: '北欧绿色低碳与科技创业翘楚' },
    ],
  },

  turkey: {
    countryId: 'turkey',
    structuralSignature:
      '安纳托利亚陆桥连接巴尔干与中东市场：奥斯曼靠海峡商税曾雄踞地中海；共和时代阿塔图尔克以国家主义工业起步，现代借欧洲关税同盟崛起为跨欧亚家电、纺织与无人机防务枢纽，近期正经历高通胀治理挑战。',
    currencyHistory:
      '奥斯曼阿克切银币与苏丹金币 -> 奥斯曼银行帝国票据 -> 1927 共和土耳其里拉（2005 砍掉 6 个零重值）。',
    fiscalEvolution:
      '“蒂马尔”骑兵采邑军事农税与包税制 -> 奥斯曼公共债务局破产托管外债 -> 现代出口导向制造业加上高波动物价利率调控。',
    pillarIndustries: [
      { era: '奥斯曼期', sectors: '伊兹密尔—布尔萨丝织与棉花香料转口、巴尔干农牧与小亚细亚矿业' },
      { era: '当代经济', sectors: '贝科/博世欧洲家电出口工厂、汽车组装、土耳其建筑出海、纺织、航空文旅与防务无人机' },
    ],
    turningPoints: [
      { year: 1881, title: '奥斯曼外债违约成立列强“公共债务局”接管盐烟关税', impact: '主权财政失血迫使青年土耳其党人反思现代化工业自强。' },
      { year: 1995, title: '与欧盟缔结工业品关税同盟', impact: '促使安纳托利亚成欧洲制造业极具性价比的近岸大厂房。' },
    ],
    series: [
      { year: 1, gdpSharePct: 1.5, gdpPerCapitaPPP: 860, populationM: 4.5, note: '罗马富裕小亚细亚城邦林立' },
      { year: 1000, gdpSharePct: 1.6, gdpPerCapitaPPP: 820, populationM: 5.0 },
      { year: 1500, gdpSharePct: 1.4, gdpPerCapitaPPP: 950, populationM: 6.3, note: '奥斯曼兴起掌黑海—爱琴海门户' },
      { year: 1700, gdpSharePct: 1.3, gdpPerCapitaPPP: 1020, populationM: 8.4 },
      { year: 1820, gdpSharePct: 0.9, gdpPerCapitaPPP: 1050, populationM: 10.1 },
      { year: 1870, gdpSharePct: 0.8, gdpPerCapitaPPP: 1320, populationM: 11.8 },
      { year: 1913, gdpSharePct: 0.6, gdpPerCapitaPPP: 1930, populationM: 15.0 },
      { year: 1950, gdpSharePct: 0.5, gdpPerCapitaPPP: 2580, populationM: 21.1 },
      { year: 1990, gdpSharePct: 0.9, gdpPerCapitaPPP: 8650, populationM: 56.1 },
      { year: 2024, gdpSharePct: 1.9, gdpPerCapitaPPP: 26500, populationM: 85.4, note: '规模跃居欧亚前 12 大 PPP 制造与商贸枢纽' },
    ],
  },

  arabia: {
    countryId: 'arabia',
    structuralSignature:
      '经历两重千年跃迁：阿拔斯黄金时代凭三洲汇票金融成为中世纪商贸重心，其后长期边缘；二十世纪中东大油田开发改写人类能源地缘，如今沙特阿联酋倾主权财富全力推进“2030 愿景”多元化转型。',
    currencyHistory:
      '阿拔斯纯金币第纳尔与“萨克（支票）”汇票 -> 印度卢比/奥斯曼银币 -> 沙特里亚尔与阿联酋迪拉姆（严格挂钩美元）。',
    fiscalEvolution:
      '早期伊斯兰地租天课与红海海商关税 -> 当代近零个人所得税全靠石油天然气国家特许收入及数万亿美元主权基金（PIF/ADIA）。',
    pillarIndustries: [
      { era: '阿拔斯盛期', sectors: '阿拉伯海季风香料帆船贸易、巴士拉大枣玻璃、大马士革织锦与造纸工坊' },
      { era: '石油与当代', sectors: '全球最低开采成本原油输出、迪拜航运物流金融免税自贸、AI 算力基地与沙漠绿氢新城' },
    ],
    turningPoints: [
      { year: 780, title: '巴格达建城整合印度洋与地中海打通汇票自由兑换', impact: '开启阿拉伯金融契约黄金期。' },
      { year: 1938, title: '达曼 7 号井喷发现世界最大规模沙特油藏', impact: '在极度荒漠之上仅两代人构建起超高净资产福利与石油美元枢纽。' },
      { year: 2016, title: '宣布后石油时代“2030 愿景”主权基金转向科技、体育文旅基建', impact: '力图抢在碳中和拐点之前重塑阿联酋—沙特新中心地位。' },
    ],
    series: [
      { year: 1, gdpSharePct: 1.3, gdpPerCapitaPPP: 780, populationM: 3.0, note: '乳香之路与新月沃地早期农业城市' },
      { year: 1000, gdpSharePct: 2.1, gdpPerCapitaPPP: 1090, populationM: 4.5, note: '巴格达城市经济全欧洲亚前列' },
      { year: 1500, gdpSharePct: 0.7, gdpPerCapitaPPP: 860, populationM: 3.5 },
      { year: 1700, gdpSharePct: 0.6, gdpPerCapitaPPP: 880, populationM: 3.9 },
      { year: 1820, gdpSharePct: 0.4, gdpPerCapitaPPP: 890, populationM: 4.5 },
      { year: 1870, gdpSharePct: 0.3, gdpPerCapitaPPP: 960, populationM: 5.5 },
      { year: 1913, gdpSharePct: 0.3, gdpPerCapitaPPP: 1150, populationM: 7.0 },
      { year: 1950, gdpSharePct: 0.6, gdpPerCapitaPPP: 3820, populationM: 9.0, note: '海湾油田全面爆发收入骤增' },
      { year: 1990, gdpSharePct: 1.3, gdpPerCapitaPPP: 14800, populationM: 32.0 },
      { year: 2024, gdpSharePct: 2.1, gdpPerCapitaPPP: 31800, populationM: 76.0, note: '沙特、阿联酋、卡塔尔领衔海湾巨额主权资本网络' },
    ],
  },

  egypt: {
    countryId: 'egypt',
    structuralSignature:
      '尼罗河泛滥馈赠的三千年“地中海大粮仓”，从法老仓储官僚到马穆鲁克卡里米胡椒大商；近现代依赖苏伊士运河通行费、棉花、侨汇与旅游收入，正着力基建与制造业吸引外资脱困。',
    currencyHistory:
      '法老称量黄金白银谷物凭证 -> 托勒密金银币 -> 法蒂玛与马穆鲁克纯金第纳尔 -> 现代埃及镑。',
    fiscalEvolution:
      '尼罗河水位计（Nilometer）预测定税的古代国家再分配 -> 1876 外债崩盘触发英法共管财政 -> 当代国际收支周期求助 IMF 与海湾盟友注资。',
    pillarIndustries: [
      { era: '古代至马穆鲁克', sectors: '尼罗河小麦、纸莎草、亚麻布以及垄断欧亚红海香料的卡里米商团税收' },
      { era: '近现代', sectors: '高品长绒棉出口、苏伊士运河战略船费、地中海红海文旅、天然气与新兴电子制造自贸园' },
    ],
    turningPoints: [
      { year: 1869, title: '苏伊士运河通航却因修建高利贷债台引发 1882 英军占领', impact: '掌握世界海运捷径却被迫历经长期债务依附。' },
      { year: 1956, title: '纳赛尔宣布运河国有化并在苏联援建下修筑阿斯旺高坝', impact: '实现工业用电独立自主，同时承受人口高增长消费压力。' },
    ],
    series: [
      { year: 1, gdpSharePct: 2.1, gdpPerCapitaPPP: 920, populationM: 4.5, note: '罗马帝国命脉粮仓行省' },
      { year: 1000, gdpSharePct: 1.4, gdpPerCapitaPPP: 860, populationM: 5.0, note: '开罗法蒂玛取代巴格达成为地中海海贸新中心' },
      { year: 1500, gdpSharePct: 0.8, gdpPerCapitaPPP: 780, populationM: 4.0 },
      { year: 1700, gdpSharePct: 0.7, gdpPerCapitaPPP: 760, populationM: 4.5 },
      { year: 1820, gdpSharePct: 0.5, gdpPerCapitaPPP: 750, populationM: 4.2, note: '阿里帕夏推行国家垄断工业化被列强打断' },
      { year: 1870, gdpSharePct: 0.5, gdpPerCapitaPPP: 1030, populationM: 7.0, note: '美国内战触发埃及棉花大热与苏伊士开河' },
      { year: 1913, gdpSharePct: 0.4, gdpPerCapitaPPP: 1440, populationM: 12.1 },
      { year: 1950, gdpSharePct: 0.4, gdpPerCapitaPPP: 1450, populationM: 21.2 },
      { year: 1990, gdpSharePct: 0.5, gdpPerCapitaPPP: 4030, populationM: 54.9 },
      { year: 2024, gdpSharePct: 1.1, gdpPerCapitaPPP: 12600, populationM: 114.5, note: '运河扩建与新能源基建面对通胀与人口压力' },
    ],
  },

  ethiopia: {
    countryId: 'ethiopia',
    structuralSignature:
      '东非唯一保持主权与高地基督教书写历史的古老高原文明，阿克苏姆曾自主发行与罗马同步的金币；当代借亚的斯亚贝巴铁路电力基建跃为撒哈拉以南非洲增长最快的非油农业与轻工航空中心。',
    currencyHistory:
      '阿克苏姆王朝非罗马罕见自主铸造金币 -> 长年流通奥地利玛丽亚特蕾莎银币 -> 1945 现代埃塞俄比亚比尔。',
    fiscalEvolution:
      '高原“古尔特”（Gult）采邑谷赋 -> 当代大型水电（复兴大坝）、国家航空基建融资拉动投资转型。',
    pillarIndustries: [
      { era: '古典至近代', sectors: '红海阿杜里斯象牙乳香贸易、卡法高原原生阿拉比卡咖啡种植与梯田画眉草（Teff）' },
      { era: '当代经济', sectors: '非洲首屈一指的埃塞航空物流、咖啡鲜花出口、工业园纺织与青尼罗河水电能源' },
    ],
    turningPoints: [
      { year: 300, title: '阿克苏姆控扼红海曼德海峡以金币与罗马拜占庭通商', impact: '跻身世界三大古帝国商贸圈。' },
      { year: 2011, title: '复兴大坝与亚吉电气铁路启动非洲少见制造业园赶超模式', impact: '开启连续多年高双位数增长直到内战冲击与债务整顿。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.3, gdpPerCapitaPPP: 450, populationM: 1.2 },
      { year: 1000, gdpSharePct: 0.4, gdpPerCapitaPPP: 510, populationM: 1.8 },
      { year: 1500, gdpSharePct: 0.4, gdpPerCapitaPPP: 560, populationM: 2.4 },
      { year: 1700, gdpSharePct: 0.3, gdpPerCapitaPPP: 580, populationM: 2.8 },
      { year: 1820, gdpSharePct: 0.2, gdpPerCapitaPPP: 580, populationM: 3.4 },
      { year: 1870, gdpSharePct: 0.2, gdpPerCapitaPPP: 590, populationM: 4.5 },
      { year: 1913, gdpSharePct: 0.2, gdpPerCapitaPPP: 630, populationM: 6.5 },
      { year: 1950, gdpSharePct: 0.1, gdpPerCapitaPPP: 620, populationM: 18.4 },
      { year: 1990, gdpSharePct: 0.1, gdpPerCapitaPPP: 680, populationM: 48.0, note: '连年旱灾内战后的历史极低洼期' },
      { year: 2024, gdpSharePct: 0.25, gdpPerCapitaPPP: 2350, populationM: 129.7, note: '实现脱离极端贫困快步基建发展' },
    ],
  },

  'west-africa': {
    countryId: 'west-africa',
    structuralSignature:
      '中世纪“黄金与食盐”跨撒哈拉帝国的诞生地（加纳、马里与桑海），曾一度供给全欧洲与北非超半数黄金；经历跨大西洋惨痛贸易后，尼日利亚与加纳等今日凭借石油可可、数字金融与年轻人口重塑西非增量。',
    currencyHistory:
      '班布克金砂与盐板、马尔代夫海贝（Cowrie shells）-> 法属西非法郎 CFA 与英镑 -> 尼日利亚奈拉 / 加纳塞地。',
    fiscalEvolution:
      '萨赫勒帝国对南北驼队黄金课税制 -> 现代油气出口分成、农产可可委员会与数字税网建设。',
    pillarIndustries: [
      { era: '帝国盛期', sectors: '加纳/马里金矿开采、撒哈拉陶德尼岩盐、延巴克图藏书抄本贸易与象牙' },
      { era: '当代经济', sectors: '西非可可全球过半供应（科特迪瓦/加纳）、尼日利亚油气、非洲硅谷拉各斯 Fintech 支付' },
    ],
    turningPoints: [
      { year: 1324, title: '曼萨·穆萨携庞大黄金驼队朝觐令开罗金价暴跌十二年', impact: '把西非撒哈拉帝国的富有直接印入欧洲地中海世界地图（加泰罗尼亚地图集）。' },
      { year: 1956, title: '尼日尔三角洲发现高品位低硫原油与当代移动支付普及', impact: '驱动非洲第一大人口体加速城市化与商业转型。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.8, gdpPerCapitaPPP: 450, populationM: 4.5 },
      { year: 1000, gdpSharePct: 1.5, gdpPerCapitaPPP: 610, populationM: 8.5, note: '加纳与加奥跨撒哈拉黄金大道兴盛' },
      { year: 1500, gdpSharePct: 1.6, gdpPerCapitaPPP: 680, populationM: 15.0, note: '桑海帝国及贝宁青铜城镇繁荣' },
      { year: 1700, gdpSharePct: 1.5, gdpPerCapitaPPP: 680, populationM: 18.0 },
      { year: 1820, gdpSharePct: 1.1, gdpPerCapitaPPP: 660, populationM: 21.0, note: '奴隶贸易创伤后转向棕榈油贸易' },
      { year: 1870, gdpSharePct: 0.8, gdpPerCapitaPPP: 720, populationM: 24.0 },
      { year: 1913, gdpSharePct: 0.7, gdpPerCapitaPPP: 920, populationM: 32.0, note: '殖民铁路打通花生可可港口运输' },
      { year: 1950, gdpSharePct: 0.7, gdpPerCapitaPPP: 1150, populationM: 58.0 },
      { year: 1990, gdpSharePct: 0.7, gdpPerCapitaPPP: 1750, populationM: 180.0 },
      { year: 2024, gdpSharePct: 1.4, gdpPerCapitaPPP: 3850, populationM: 446.0, note: '拉各斯与阿克拉引领非洲人口城市与数字消费跃迁' },
    ],
  },

  mexico: {
    countryId: 'mexico',
    structuralSignature:
      '新大陆最早的城邦市场网络之一（黑曜石与可可豆交易），也是“改变全球物价与大一统白银流通”的墨西哥银元（八里亚尔）诞生地；NAFTA/USMCA 之后深嵌北美汽车电器供应链制造。',
    currencyHistory:
      '阿兹特克可可豆与棉布 -> 1536 墨西哥城美洲首家铸币厂“西班牙墨西哥银元”（中国俗称鹰洋/本洋）-> 1993 新比索。',
    fiscalEvolution:
      '殖民白银五分之一皇家税 -> 革命后卡德纳斯石油国有化 -> 1994 NAFTA 开启关税一体化北美精密组装。',
    pillarIndustries: [
      { era: '古代至白银期', sectors: '特奥蒂瓦坎黑曜石工具、奇南帕水田玉米与瓜纳华托/萨卡特卡斯世界级银矿' },
      { era: '当代经济', sectors: '对美最大贸易伙伴——北美汽车制造组装、电子航天精密器件、牛油果龙舌兰农业及侨汇' },
    ],
    turningPoints: [
      { year: 1565, title: '阿卡普尔科成为马尼拉大帆船太平洋银贸母港', impact: '墨西哥鹰洋长期流通全中国、东南亚与美国建国早期法定辅币。' },
      { year: 1994, title: '北美自由贸易协定（NAFTA）生效接通欧美跨国制造近岸迁入', impact: '摆脱拉美单一资源出口陷阱，制造品占比突破八成。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.7, gdpPerCapitaPPP: 510, populationM: 2.2 },
      { year: 1000, gdpSharePct: 1.0, gdpPerCapitaPPP: 580, populationM: 4.5, note: '托尔特克至阿兹特克前夕中美洲市场' },
      { year: 1500, gdpSharePct: 1.1, gdpPerCapitaPPP: 690, populationM: 7.5, note: '特诺奇蒂特兰特大水城贸易圈高峰' },
      { year: 1700, gdpSharePct: 0.6, gdpPerCapitaPPP: 910, populationM: 4.5, note: '疫情人口大降后白银开采与西班牙庄园重构' },
      { year: 1820, gdpSharePct: 0.6, gdpPerCapitaPPP: 1180, populationM: 6.6 },
      { year: 1870, gdpSharePct: 0.4, gdpPerCapitaPPP: 1070, populationM: 9.2 },
      { year: 1913, gdpSharePct: 0.6, gdpPerCapitaPPP: 2760, populationM: 15.0, note: '迪亚斯时期铁路与早期石油增长但分配极不均' },
      { year: 1950, gdpSharePct: 0.8, gdpPerCapitaPPP: 3770, populationM: 28.5, note: '战后“墨西哥奇迹”进口替代工业高速增长期' },
      { year: 1990, gdpSharePct: 1.3, gdpPerCapitaPPP: 9700, populationM: 84.9, note: '债务失去的十年后准备 NAFTA 对美近岸接轨' },
      { year: 2024, gdpSharePct: 1.8, gdpPerCapitaPPP: 17900, populationM: 129.7, note: '北美工业腹地关键一环与最大近岸制造受益者' },
    ],
  },

  peru: {
    countryId: 'peru',
    structuralSignature:
      '印加曾创造了人类史上绝无仅有的“无货币、无文字但依托奇普结绳精密再分配”垂直山岳帝国；殖民发现波托西巨型银矿震动全欧洲中国；当代作为全球铜金银重要供给者稳健推行财政审慎规则。',
    currencyHistory:
      '前哥伦布奇普（Quipu）谷物劳动账目（无通用钱币）-> 西班牙银元（波托西铸币厂）-> 现代秘鲁索尔（近三十年保持南美最稳定汇率之一）。',
    fiscalEvolution:
      '印加全民生力劳役制（Mita 轮役）-> 19 世纪末鸟粪与硝酸盐垄断税 -> 1990 年代起强硬央行独立防通胀与主权财政储备纪律。',
    pillarIndustries: [
      { era: '印加至殖民期', sectors: '安第斯垂直梯田百种马铃薯、库斯科库房、波托西银矿及 19 世纪钦查岛“鸟粪化肥出口潮”' },
      { era: '当代经济', sectors: '全球前三的铜矿出口与高海拔锌金银、全球第一大鱼粉渔业、高附加值蓝莓芦笋农业出口' },
    ],
    turningPoints: [
      { year: 1545, title: '安第斯山波托西发现超巨型银矿并套用印加劳役制开采', impact: '开启跨越欧亚非美的第一轮白银价格潮。' },
      { year: 1993, title: '货币锚定独立与大宗商品矿业外资法治落地', impact: '终结八十年代超级恶性通胀，打造南美少见低债务稳健典范。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.3, gdpPerCapitaPPP: 490, populationM: 1.0 },
      { year: 1000, gdpSharePct: 0.6, gdpPerCapitaPPP: 610, populationM: 3.0 },
      { year: 1500, gdpSharePct: 0.6, gdpPerCapitaPPP: 690, populationM: 4.0, note: '印加巅峰靠梯田库房养活数百万山地人口' },
      { year: 1700, gdpSharePct: 0.2, gdpPerCapitaPPP: 860, populationM: 1.3 },
      { year: 1820, gdpSharePct: 0.1, gdpPerCapitaPPP: 940, populationM: 1.3 },
      { year: 1870, gdpSharePct: 0.1, gdpPerCapitaPPP: 1120, populationM: 2.6, note: '“鸟粪时代”昙花一现的资本狂欢' },
      { year: 1913, gdpSharePct: 0.15, gdpPerCapitaPPP: 1650, populationM: 4.3 },
      { year: 1950, gdpSharePct: 0.2, gdpPerCapitaPPP: 3610, populationM: 7.6 },
      { year: 1990, gdpSharePct: 0.2, gdpPerCapitaPPP: 4820, populationM: 21.8, note: '恶通胀治理改革起步低谷' },
      { year: 2024, gdpSharePct: 0.3, gdpPerCapitaPPP: 12100, populationM: 34.4, note: '钱凯港贯通太平洋直航的南美矿农新枢纽' },
    ],
  },

  brazil: {
    countryId: 'brazil',
    structuralSignature:
      '葡萄牙建起的跨大西洋糖矿种植园体，靠十九世纪圣保罗咖啡热潮支撑起最初工业化积累，二十世纪中叶实现高增速，如今已蜕变为农业科技粮食肉类超级出口国与大宗能源巨头。',
    currencyHistory:
      '蔗糖代用记账与葡印雷亚尔 -> 反复高通胀换代克鲁塞罗 -> 1994 年“雷亚尔计划”（Real Plan）彻底驯服四位数恶性通胀。',
    fiscalEvolution:
      '咖啡园寡头“咖啡与牛奶”关税分权 -> 1930 瓦加斯国有工业替代 -> 当代高福利养老与农业出口双轨扩张。',
    pillarIndustries: [
      { era: '殖民至二十世纪初', sectors: '巴伊亚蔗糖、米纳斯吉拉斯黄金钻石、阿马逊天然橡胶短暂狂热与全球独占圣保罗咖啡' },
      { era: '当代经济', sectors: '全球最大大豆/牛肉/禽肉/糖橙汁农业科技出口国、深海盐下层原油、巴西航空工业支线客机' },
    ],
    turningPoints: [
      { year: 1967, title: '国家工业化“巴西奇迹”及热带酸性草原（Cerrado）农业改造启动', impact: '把贫瘠热带高原点石成金为人类最大大豆带。' },
      { year: 1994, title: '“雷亚尔计划”引入虚拟锚定单位成功歼灭恶性通胀', impact: '重建了拉美最大经济体货币市场信心与金融普惠体系。' },
    ],
    series: [
      { year: 1, gdpSharePct: 0.2, gdpPerCapitaPPP: 410, populationM: 0.8 },
      { year: 1000, gdpSharePct: 0.3, gdpPerCapitaPPP: 430, populationM: 1.2 },
      { year: 1500, gdpSharePct: 0.2, gdpPerCapitaPPP: 480, populationM: 1.0 },
      { year: 1700, gdpSharePct: 0.2, gdpPerCapitaPPP: 750, populationM: 1.3 },
      { year: 1820, gdpSharePct: 0.4, gdpPerCapitaPPP: 1030, populationM: 4.5, note: '咖啡种植园迅速取代甘蔗与金矿' },
      { year: 1870, gdpSharePct: 0.6, gdpPerCapitaPPP: 1140, populationM: 9.8 },
      { year: 1913, gdpSharePct: 0.8, gdpPerCapitaPPP: 1290, populationM: 23.7 },
      { year: 1950, gdpSharePct: 1.3, gdpPerCapitaPPP: 2670, populationM: 53.4, note: '高速度城市化与圣保罗制造崛起' },
      { year: 1990, gdpSharePct: 2.3, gdpPerCapitaPPP: 7850, populationM: 151.1, note: '“失去的十年”通胀顶峰期' },
      { year: 2024, gdpSharePct: 2.3, gdpPerCapitaPPP: 14100, populationM: 217.6, note: '全球粮食能源关键稳定器与拉美首位工业体' },
    ],
  },
};
