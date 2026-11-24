export interface HistoricalPlace {
  id: string;
  name: string;
  kind: 'capital' | 'city' | 'pass';
  coords: [number, number];
  startYear: number;
  endYear: number;
  minZoom: number;
}

export interface HistoricalMegaStructure {
  id: string;
  name: string;
  kind: 'wall' | 'canal';
  startYear: number;
  endYear: number;
  color: string;
  coords: [number, number][];
}

export const HISTORICAL_PLACES: HistoricalPlace[] = [
  // East Asia - Rotating Historical Capitals & Passes
  { id: 'pl-yinxu', name: '殷墟', kind: 'capital', coords: [114.3, 36.12], startYear: -1600, endYear: -1046, minZoom: 3.4 },
  { id: 'pl-haojing', name: '镐京', kind: 'capital', coords: [108.78, 34.23], startYear: -1046, endYear: -771, minZoom: 3.3 },
  { id: 'pl-luoyi', name: '洛邑', kind: 'capital', coords: [112.45, 34.62], startYear: -770, endYear: -256, minZoom: 3.2 },
  { id: 'pl-qufu', name: '曲阜', kind: 'city', coords: [116.99, 35.6], startYear: -770, endYear: -221, minZoom: 3.8 },
  { id: 'pl-linzi', name: '临淄', kind: 'capital', coords: [118.31, 36.82], startYear: -800, endYear: -221, minZoom: 3.6 },
  { id: 'pl-xintian', name: '新田', kind: 'capital', coords: [111.35, 35.62], startYear: -585, endYear: -376, minZoom: 4.0 },
  { id: 'pl-yingdu', name: '郢都', kind: 'capital', coords: [112.19, 30.35], startYear: -689, endYear: -278, minZoom: 3.6 },
  { id: 'pl-gusu', name: '姑苏', kind: 'capital', coords: [120.62, 31.3], startYear: -514, endYear: 220, minZoom: 3.9 },
  { id: 'pl-kuaiji', name: '会稽', kind: 'capital', coords: [120.58, 30.0], startYear: -510, endYear: -221, minZoom: 4.1 },
  { id: 'pl-handan', name: '邯郸', kind: 'capital', coords: [114.49, 36.61], startYear: -386, endYear: -228, minZoom: 4.0 },
  { id: 'pl-daliang', name: '大梁', kind: 'capital', coords: [114.31, 34.79], startYear: -361, endYear: -225, minZoom: 4.0 },
  { id: 'pl-jicheng', name: '蓟城', kind: 'capital', coords: [116.38, 39.89], startYear: -770, endYear: -222, minZoom: 3.7 },
  { id: 'pl-xianyang', name: '咸阳', kind: 'capital', coords: [108.7, 34.33], startYear: -350, endYear: -206, minZoom: 3.0 },
  { id: 'pl-changan', name: '长安', kind: 'capital', coords: [108.94, 34.34], startYear: -202, endYear: 907, minZoom: 2.6 },
  { id: 'pl-luoyang', name: '洛阳', kind: 'capital', coords: [112.45, 34.62], startYear: 25, endYear: 960, minZoom: 3.1 },
  { id: 'pl-chengdu', name: '成都', kind: 'capital', coords: [104.06, 30.67], startYear: -300, endYear: 2025, minZoom: 3.6 },
  { id: 'pl-jianye', name: '建业', kind: 'capital', coords: [118.79, 32.06], startYear: 211, endYear: 589, minZoom: 3.4 },
  { id: 'pl-kaifeng', name: '开封', kind: 'capital', coords: [114.31, 34.79], startYear: 960, endYear: 1127, minZoom: 3.0 },
  { id: 'pl-linan', name: '临安', kind: 'capital', coords: [120.15, 30.28], startYear: 1127, endYear: 1279, minZoom: 3.2 },
  { id: 'pl-quanzhou', name: '泉州', kind: 'city', coords: [118.67, 24.87], startYear: 960, endYear: 1450, minZoom: 3.9 },
  { id: 'pl-dadu', name: '大都', kind: 'capital', coords: [116.4, 39.92], startYear: 1271, endYear: 1368, minZoom: 2.7 },
  { id: 'pl-nanjing', name: '南京', kind: 'capital', coords: [118.79, 32.06], startYear: 1368, endYear: 1949, minZoom: 3.3 },
  { id: 'pl-beijing', name: '北京', kind: 'capital', coords: [116.4, 39.9], startYear: 1421, endYear: 2025, minZoom: 2.6 },
  { id: 'pl-shanghai', name: '上海', kind: 'city', coords: [121.47, 31.23], startYear: 1843, endYear: 2025, minZoom: 3.2 },
  { id: 'pl-xian', name: '西安', kind: 'city', coords: [108.94, 34.34], startYear: 1369, endYear: 2025, minZoom: 3.7 },
  { id: 'pl-hangzhou', name: '杭州', kind: 'city', coords: [120.15, 30.28], startYear: 1279, endYear: 2025, minZoom: 4.1 },

  // East Asia Passes & Silk Road Towns
  { id: 'pl-hangu', name: '函谷关', kind: 'pass', coords: [110.92, 34.62], startYear: -361, endYear: 960, minZoom: 4.1 },
  { id: 'pl-yumenguan', name: '玉门关', kind: 'pass', coords: [93.86, 40.35], startYear: -120, endYear: 1450, minZoom: 4.1 },
  { id: 'pl-dunhuang', name: '敦煌', kind: 'city', coords: [94.66, 40.14], startYear: -111, endYear: 2025, minZoom: 3.6 },
  { id: 'pl-kashgar', name: '喀什噶尔', kind: 'city', coords: [75.99, 39.47], startYear: -100, endYear: 2025, minZoom: 3.8 },
  { id: 'pl-shanhaiguan', name: '山海关', kind: 'pass', coords: [119.75, 40.0], startYear: 1381, endYear: 1911, minZoom: 4.1 },
  { id: 'pl-lhasa', name: '拉萨', kind: 'capital', coords: [91.11, 29.65], startYear: 633, endYear: 2025, minZoom: 3.6 },
  { id: 'pl-karakoram', name: '哈拉和林', kind: 'capital', coords: [102.84, 47.21], startYear: 1220, endYear: 1400, minZoom: 3.3 },
  { id: 'pl-nara', name: '奈良', kind: 'capital', coords: [135.8, 34.69], startYear: 710, endYear: 794, minZoom: 4.0 },
  { id: 'pl-kyoto', name: '平安京（京都）', kind: 'capital', coords: [135.76, 35.01], startYear: 794, endYear: 1868, minZoom: 3.3 },
  { id: 'pl-edo', name: '江户', kind: 'capital', coords: [139.77, 35.68], startYear: 1603, endYear: 1867, minZoom: 3.2 },
  { id: 'pl-tokyo', name: '东京', kind: 'capital', coords: [139.77, 35.68], startYear: 1868, endYear: 2025, minZoom: 2.7 },
  { id: 'pl-kaesong', name: '开京', kind: 'capital', coords: [126.56, 37.97], startYear: 918, endYear: 1392, minZoom: 4.0 },
  { id: 'pl-seoul', name: '汉城（首尔）', kind: 'capital', coords: [126.98, 37.56], startYear: 1394, endYear: 2025, minZoom: 3.3 },

  // South & Southeast Asia
  { id: 'pl-mohenjo', name: '摩亨佐达罗', kind: 'city', coords: [68.14, 27.32], startYear: -2600, endYear: -1800, minZoom: 3.5 },
  { id: 'pl-pataliputra', name: '华氏城', kind: 'capital', coords: [85.13, 25.61], startYear: -490, endYear: 550, minZoom: 3.2 },
  { id: 'pl-nalanda', name: '那烂陀', kind: 'city', coords: [85.44, 25.13], startYear: 427, endYear: 1200, minZoom: 4.1 },
  { id: 'pl-khyber', name: '开伯尔山口', kind: 'pass', coords: [71.15, 34.09], startYear: -1500, endYear: 2025, minZoom: 4.0 },
  { id: 'pl-delhi', name: '德里', kind: 'capital', coords: [77.21, 28.64], startYear: 1206, endYear: 2025, minZoom: 2.9 },
  { id: 'pl-agra', name: '阿格拉', kind: 'capital', coords: [78.01, 27.18], startYear: 1556, endYear: 1658, minZoom: 3.9 },
  { id: 'pl-calicut', name: '卡利卡特', kind: 'city', coords: [75.78, 11.25], startYear: 1200, endYear: 1700, minZoom: 4.0 },
  { id: 'pl-angkor', name: '吴哥', kind: 'capital', coords: [103.86, 13.41], startYear: 802, endYear: 1431, minZoom: 3.4 },
  { id: 'pl-malacca-city', name: '马六甲', kind: 'city', coords: [102.25, 2.19], startYear: 1400, endYear: 2025, minZoom: 3.8 },
  { id: 'pl-ayutthaya', name: '阿瑜陀耶', kind: 'capital', coords: [100.57, 14.36], startYear: 1351, endYear: 1767, minZoom: 3.9 },

  // Middle East & Central Asia
  { id: 'pl-uruk', name: '乌鲁克', kind: 'city', coords: [45.63, 31.32], startYear: -3500, endYear: -1500, minZoom: 3.4 },
  { id: 'pl-babylon', name: '巴比伦', kind: 'capital', coords: [44.42, 32.54], startYear: -1894, endYear: -250, minZoom: 3.0 },
  { id: 'pl-nineveh', name: '尼尼微', kind: 'capital', coords: [43.15, 36.36], startYear: -1000, endYear: -612, minZoom: 3.7 },
  { id: 'pl-hattusa', name: '哈图沙', kind: 'capital', coords: [34.61, 40.02], startYear: -1650, endYear: -1180, minZoom: 3.8 },
  { id: 'pl-persepolis', name: '波斯波利斯', kind: 'capital', coords: [52.89, 29.93], startYear: -550, endYear: -330, minZoom: 3.3 },
  { id: 'pl-ctesiphon', name: '泰西封', kind: 'capital', coords: [44.58, 33.09], startYear: -140, endYear: 651, minZoom: 3.8 },
  { id: 'pl-jerusalem', name: '耶路撒冷', kind: 'city', coords: [35.21, 31.78], startYear: -1000, endYear: 2025, minZoom: 3.2 },
  { id: 'pl-damascus', name: '大马士革', kind: 'capital', coords: [36.29, 33.51], startYear: 661, endYear: 2025, minZoom: 3.4 },
  { id: 'pl-mecca', name: '麦加', kind: 'city', coords: [39.82, 21.42], startYear: 500, endYear: 2025, minZoom: 3.1 },
  { id: 'pl-baghdad', name: '巴格达', kind: 'capital', coords: [44.36, 33.31], startYear: 762, endYear: 2025, minZoom: 2.9 },
  { id: 'pl-isfahan', name: '伊斯法罕', kind: 'capital', coords: [51.67, 32.65], startYear: 1598, endYear: 1736, minZoom: 3.6 },
  { id: 'pl-tehran', name: '德黑兰', kind: 'capital', coords: [51.39, 35.69], startYear: 1796, endYear: 2025, minZoom: 3.2 },
  { id: 'pl-samarkand', name: '撒马尔罕', kind: 'city', coords: [66.97, 39.65], startYear: -500, endYear: 2025, minZoom: 3.4 },

  // Europe & Mediterranean
  { id: 'pl-knossos', name: '克诺索斯', kind: 'city', coords: [25.16, 35.3], startYear: -2000, endYear: -1350, minZoom: 3.9 },
  { id: 'pl-athens', name: '雅典', kind: 'capital', coords: [23.73, 37.98], startYear: -1000, endYear: 2025, minZoom: 2.9 },
  { id: 'pl-sparta', name: '斯巴达', kind: 'capital', coords: [22.43, 37.07], startYear: -900, endYear: -146, minZoom: 3.7 },
  { id: 'pl-rome', name: '罗马', kind: 'capital', coords: [12.49, 41.89], startYear: -753, endYear: 2025, minZoom: 2.5 },
  { id: 'pl-constantinople', name: '君士坦丁堡', kind: 'capital', coords: [28.97, 41.01], startYear: 330, endYear: 1453, minZoom: 2.7 },
  { id: 'pl-istanbul', name: '伊斯坦布尔', kind: 'capital', coords: [28.97, 41.01], startYear: 1453, endYear: 1923, minZoom: 2.8 },
  { id: 'pl-ankara', name: '安卡拉', kind: 'capital', coords: [32.86, 39.93], startYear: 1923, endYear: 2025, minZoom: 3.4 },
  { id: 'pl-venice', name: '威尼斯', kind: 'capital', coords: [12.33, 45.44], startYear: 810, endYear: 1797, minZoom: 3.5 },
  { id: 'pl-florence', name: '佛罗伦萨', kind: 'capital', coords: [11.25, 43.77], startYear: 1115, endYear: 1861, minZoom: 3.8 },
  { id: 'pl-milan', name: '米兰', kind: 'capital', coords: [9.19, 45.46], startYear: 1277, endYear: 2025, minZoom: 4.0 },
  { id: 'pl-aachen', name: '亚琛', kind: 'capital', coords: [6.08, 50.77], startYear: 794, endYear: 936, minZoom: 3.9 },
  { id: 'pl-cordoba', name: '科尔多瓦', kind: 'capital', coords: [-4.78, 37.88], startYear: 756, endYear: 1236, minZoom: 3.6 },
  { id: 'pl-paris', name: '巴黎', kind: 'capital', coords: [2.35, 48.85], startYear: 508, endYear: 2025, minZoom: 2.7 },
  { id: 'pl-london', name: '伦敦', kind: 'capital', coords: [-0.12, 51.51], startYear: 1066, endYear: 2025, minZoom: 2.7 },
  { id: 'pl-madrid', name: '马德里', kind: 'capital', coords: [-3.7, 40.41], startYear: 1561, endYear: 2025, minZoom: 3.2 },
  { id: 'pl-lisbon', name: '里斯本', kind: 'capital', coords: [-9.14, 38.72], startYear: 1255, endYear: 2025, minZoom: 3.4 },
  { id: 'pl-amsterdam', name: '阿姆斯特丹', kind: 'capital', coords: [4.9, 52.37], startYear: 1581, endYear: 2025, minZoom: 3.4 },
  { id: 'pl-vienna', name: '维也纳', kind: 'capital', coords: [16.37, 48.21], startYear: 1438, endYear: 2025, minZoom: 3.1 },
  { id: 'pl-berlin', name: '柏林', kind: 'capital', coords: [13.4, 52.52], startYear: 1701, endYear: 2025, minZoom: 2.9 },
  { id: 'pl-warsaw', name: '华沙', kind: 'capital', coords: [21.01, 52.23], startYear: 1596, endYear: 2025, minZoom: 3.4 },
  { id: 'pl-kiev', name: '基辅', kind: 'capital', coords: [30.52, 50.45], startYear: 882, endYear: 2025, minZoom: 3.2 },
  { id: 'pl-moscow', name: '莫斯科', kind: 'capital', coords: [37.62, 55.75], startYear: 1325, endYear: 2025, minZoom: 2.8 },
  { id: 'pl-st-petersburg', name: '圣彼得堡', kind: 'capital', coords: [30.31, 59.93], startYear: 1712, endYear: 1918, minZoom: 3.2 },

  // Africa
  { id: 'pl-memphis', name: '孟菲斯', kind: 'capital', coords: [31.25, 29.85], startYear: -3100, endYear: -1070, minZoom: 3.5 },
  { id: 'pl-alexandria', name: '亚历山大里亚', kind: 'capital', coords: [29.92, 31.2], startYear: -331, endYear: 641, minZoom: 3.1 },
  { id: 'pl-cairo', name: '开罗', kind: 'capital', coords: [31.24, 30.04], startYear: 969, endYear: 2025, minZoom: 2.8 },
  { id: 'pl-carthage', name: '迦太基', kind: 'capital', coords: [10.32, 36.85], startYear: -814, endYear: -146, minZoom: 3.4 },
  { id: 'pl-aksum', name: '阿克苏姆', kind: 'capital', coords: [38.72, 14.13], startYear: 100, endYear: 960, minZoom: 3.6 },
  { id: 'pl-timbuktu', name: '廷巴克图', kind: 'city', coords: [-3.01, 16.77], startYear: 1200, endYear: 1850, minZoom: 3.4 },

  // Americas
  { id: 'pl-teotihuacan', name: '特奥蒂瓦坎', kind: 'city', coords: [-98.84, 19.69], startYear: -100, endYear: 650, minZoom: 3.6 },
  { id: 'pl-tenochtitlan', name: '特诺奇蒂特兰', kind: 'capital', coords: [-99.13, 19.43], startYear: 1325, endYear: 1521, minZoom: 3.2 },
  { id: 'pl-mexico-city', name: '墨西哥城', kind: 'capital', coords: [-99.13, 19.43], startYear: 1521, endYear: 2025, minZoom: 3.0 },
  { id: 'pl-cusco', name: '库斯科', kind: 'capital', coords: [-71.97, -13.53], startYear: 1200, endYear: 1533, minZoom: 3.3 },
  { id: 'pl-lima', name: '利马', kind: 'capital', coords: [-77.04, -12.05], startYear: 1535, endYear: 2025, minZoom: 3.3 },
  { id: 'pl-potosi', name: '波托西', kind: 'city', coords: [-65.75, -19.58], startYear: 1545, endYear: 1825, minZoom: 3.8 },
  { id: 'pl-philadelphia', name: '费城', kind: 'capital', coords: [-75.16, 39.95], startYear: 1776, endYear: 1800, minZoom: 3.7 },
  { id: 'pl-washington', name: '华盛顿', kind: 'capital', coords: [-77.04, 38.9], startYear: 1800, endYear: 2025, minZoom: 2.9 },
  { id: 'pl-new-york', name: '纽约', kind: 'city', coords: [-74.0, 40.71], startYear: 1790, endYear: 2025, minZoom: 3.0 },
  { id: 'pl-rio', name: '里约热内卢', kind: 'capital', coords: [-43.17, -22.91], startYear: 1763, endYear: 1960, minZoom: 3.4 },
];

export const HISTORICAL_MEGA_STRUCTURES: HistoricalMegaStructure[] = [
  {
    id: 'ms-qin-han-wall',
    name: '秦汉长城',
    kind: 'wall',
    startYear: -214,
    endYear: 1367,
    color: '#8B5A3C',
    coords: [
      [94.1, 40.3],
      [98.3, 39.8],
      [101.6, 38.4],
      [106.5, 39.0],
      [109.8, 40.8],
      [113.3, 40.6],
      [117.2, 41.0],
      [121.0, 41.2],
      [124.2, 40.2],
    ],
  },
  {
    id: 'ms-ming-wall',
    name: '明长城',
    kind: 'wall',
    startYear: 1368,
    endYear: 2025,
    color: '#9E4739',
    coords: [
      [98.29, 39.81],
      [102.6, 37.9],
      [106.2, 38.5],
      [109.7, 38.3],
      [113.2, 40.1],
      [115.9, 40.36],
      [117.8, 40.2],
      [119.75, 40.0],
    ],
  },
  {
    id: 'ms-grand-canal',
    name: '京杭大运河',
    kind: 'canal',
    startYear: 605,
    endYear: 2025,
    color: '#2B729E',
    coords: [
      [116.4, 39.9],
      [117.2, 39.13],
      [116.3, 37.45],
      [115.95, 36.45],
      [117.2, 34.26],
      [119.0, 33.6],
      [119.42, 32.39],
      [120.6, 31.3],
      [120.15, 30.28],
    ],
  },
  {
    id: 'ms-suez-canal',
    name: '苏伊士运河',
    kind: 'canal',
    startYear: 1869,
    endYear: 2025,
    color: '#2B729E',
    coords: [
      [32.3, 31.26],
      [32.28, 30.6],
      [32.55, 29.97],
    ],
  },
  {
    id: 'ms-panama-canal',
    name: '巴拿马运河',
    kind: 'canal',
    startYear: 1914,
    endYear: 2025,
    color: '#2B729E',
    coords: [
      [-79.92, 9.35],
      [-79.75, 9.15],
      [-79.55, 8.95],
    ],
  },
];
