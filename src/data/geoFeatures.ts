export interface GeoFeatureLabel {
  id: string;
  name: string;
  kind: 'water' | 'land';
  coords: [number, number];
  minZoom: number;
}

export const GEO_FEATURES: GeoFeatureLabel[] = [
  // East Asia Water & Seas
  { id: 'geo-yellow-river', name: '黄河', kind: 'water', coords: [113.5, 35.1], minZoom: 2.8 },
  { id: 'geo-yangtze', name: '长江', kind: 'water', coords: [115.6, 30.2], minZoom: 2.8 },
  { id: 'geo-huai-river', name: '淮河', kind: 'water', coords: [117.2, 32.8], minZoom: 3.8 },
  { id: 'geo-pearl-river', name: '珠江', kind: 'water', coords: [112.2, 23.2], minZoom: 3.8 },
  { id: 'geo-wei-river', name: '渭河', kind: 'water', coords: [108.4, 34.4], minZoom: 4.2 },
  { id: 'geo-bohai', name: '渤海', kind: 'water', coords: [119.8, 39.1], minZoom: 3.6 },
  { id: 'geo-yellow-sea', name: '黄海', kind: 'water', coords: [122.9, 35.4], minZoom: 3.4 },
  { id: 'geo-east-china-sea', name: '东海', kind: 'water', coords: [125.0, 29.0], minZoom: 3.0 },
  { id: 'geo-south-china-sea', name: '南海', kind: 'water', coords: [114.5, 14.5], minZoom: 2.8 },
  { id: 'geo-sea-of-japan', name: '日本海', kind: 'water', coords: [134.8, 39.5], minZoom: 3.0 },

  // East Asia Mountains, Plateaus & Basins
  { id: 'geo-qinling', name: '秦岭', kind: 'land', coords: [108.6, 33.7], minZoom: 3.6 },
  { id: 'geo-taihang', name: '太行山', kind: 'land', coords: [113.8, 37.6], minZoom: 3.8 },
  { id: 'geo-guanzhong', name: '关中平原', kind: 'land', coords: [108.9, 34.6], minZoom: 4.3 },
  { id: 'geo-north-china-plain', name: '华北平原', kind: 'land', coords: [116.2, 36.4], minZoom: 3.9 },
  { id: 'geo-sichuan-basin', name: '四川盆地', kind: 'land', coords: [105.6, 30.4], minZoom: 3.8 },
  { id: 'geo-hexi-corridor', name: '河西走廊', kind: 'land', coords: [99.8, 39.1], minZoom: 3.6 },
  { id: 'geo-tibet-plateau', name: '青藏高原', kind: 'land', coords: [88.5, 32.8], minZoom: 2.5 },
  { id: 'geo-taklamakan', name: '塔克拉玛干沙漠', kind: 'land', coords: [82.8, 39.2], minZoom: 3.4 },
  { id: 'geo-tianshan', name: '天山山脉', kind: 'land', coords: [83.5, 42.8], minZoom: 3.4 },
  { id: 'geo-gobi', name: '戈壁沙漠', kind: 'land', coords: [106.0, 42.8], minZoom: 2.9 },
  { id: 'geo-yunnan-guizhou', name: '云贵高原', kind: 'land', coords: [104.2, 25.8], minZoom: 3.9 },
  { id: 'geo-nanling', name: '南岭', kind: 'land', coords: [112.5, 25.1], minZoom: 4.3 },

  // South & Southeast Asia
  { id: 'geo-himalayas', name: '喜马拉雅山脉', kind: 'land', coords: [85.0, 28.4], minZoom: 2.6 },
  { id: 'geo-indus', name: '印度河', kind: 'water', coords: [69.8, 27.8], minZoom: 3.4 },
  { id: 'geo-ganges', name: '恒河', kind: 'water', coords: [82.8, 25.8], minZoom: 3.2 },
  { id: 'geo-deccan', name: '德干高原', kind: 'land', coords: [77.5, 16.5], minZoom: 3.5 },
  { id: 'geo-mekong', name: '湄公河', kind: 'water', coords: [105.2, 13.8], minZoom: 3.5 },
  { id: 'geo-malacca', name: '马六甲海峡', kind: 'water', coords: [100.8, 2.8], minZoom: 3.4 },
  { id: 'geo-bay-of-bengal', name: '孟加拉湾', kind: 'water', coords: [88.5, 14.0], minZoom: 2.7 },
  { id: 'geo-arabian-sea', name: '阿拉伯海', kind: 'water', coords: [64.5, 15.0], minZoom: 2.7 },

  // Middle East & Central Asia
  { id: 'geo-tigris-euphrates', name: '两河流域', kind: 'water', coords: [44.8, 32.5], minZoom: 3.4 },
  { id: 'geo-persian-gulf', name: '波斯湾', kind: 'water', coords: [51.8, 26.8], minZoom: 3.2 },
  { id: 'geo-red-sea', name: '红海', kind: 'water', coords: [38.5, 20.5], minZoom: 2.9 },
  { id: 'geo-caspian-sea', name: '里海', kind: 'water', coords: [50.8, 41.8], minZoom: 2.7 },
  { id: 'geo-aral-sea', name: '咸海', kind: 'water', coords: [59.8, 45.2], minZoom: 3.7 },
  { id: 'geo-iranian-plateau', name: '伊朗高原', kind: 'land', coords: [54.2, 33.2], minZoom: 3.3 },
  { id: 'geo-zagros', name: '扎格罗斯山脉', kind: 'land', coords: [49.4, 32.1], minZoom: 4.1 },
  { id: 'geo-anatolia', name: '安纳托利亚高原', kind: 'land', coords: [34.2, 39.1], minZoom: 3.6 },
  { id: 'geo-pamir', name: '帕米尔高原', kind: 'land', coords: [73.2, 38.2], minZoom: 3.5 },
  { id: 'geo-caucasus', name: '高加索山脉', kind: 'land', coords: [44.2, 42.6], minZoom: 3.6 },

  // Europe & Mediterranean
  { id: 'geo-mediterranean', name: '地中海', kind: 'water', coords: [16.5, 35.0], minZoom: 2.3 },
  { id: 'geo-aegean', name: '爱琴海', kind: 'water', coords: [25.2, 38.0], minZoom: 3.9 },
  { id: 'geo-black-sea', name: '黑海', kind: 'water', coords: [34.2, 43.3], minZoom: 2.9 },
  { id: 'geo-adriatic', name: '亚得里亚海', kind: 'water', coords: [15.4, 42.8], minZoom: 4.0 },
  { id: 'geo-bosphorus', name: '博斯普鲁斯海峡', kind: 'water', coords: [29.1, 41.2], minZoom: 4.3 },
  { id: 'geo-gibraltar', name: '直布罗陀海峡', kind: 'water', coords: [-5.6, 35.9], minZoom: 3.9 },
  { id: 'geo-english-channel', name: '英吉利海峡', kind: 'water', coords: [-1.5, 50.1], minZoom: 3.7 },
  { id: 'geo-north-sea', name: '北海', kind: 'water', coords: [3.5, 56.2], minZoom: 3.2 },
  { id: 'geo-baltic-sea', name: '波罗的海', kind: 'water', coords: [19.5, 58.0], minZoom: 3.1 },
  { id: 'geo-alps', name: '阿尔卑斯山脉', kind: 'land', coords: [10.4, 46.6], minZoom: 3.4 },
  { id: 'geo-pyrenees', name: '比利牛斯山脉', kind: 'land', coords: [0.8, 42.6], minZoom: 4.1 },
  { id: 'geo-carpathians', name: '喀尔巴阡山脉', kind: 'land', coords: [24.8, 47.4], minZoom: 3.9 },
  { id: 'geo-danube', name: '多瑙河', kind: 'water', coords: [21.5, 44.8], minZoom: 3.5 },
  { id: 'geo-rhine', name: '莱茵河', kind: 'water', coords: [7.6, 50.2], minZoom: 3.9 },
  { id: 'geo-dnieper', name: '第聂伯河', kind: 'water', coords: [31.5, 49.4], minZoom: 3.8 },
  { id: 'geo-volga', name: '伏尔加河', kind: 'water', coords: [46.5, 51.8], minZoom: 3.2 },
  { id: 'geo-urals', name: '乌拉尔山脉', kind: 'land', coords: [59.5, 58.0], minZoom: 3.1 },
  { id: 'geo-iberian', name: '伊比利亚半岛', kind: 'land', coords: [-4.2, 39.8], minZoom: 3.6 },

  // Africa
  { id: 'geo-nile', name: '尼罗河', kind: 'water', coords: [31.4, 24.5], minZoom: 2.7 },
  { id: 'geo-sahara', name: '撒哈拉沙漠', kind: 'land', coords: [11.5, 23.0], minZoom: 2.3 },
  { id: 'geo-niger-river', name: '尼日尔河', kind: 'water', coords: [-2.8, 16.5], minZoom: 3.6 },
  { id: 'geo-congo-basin', name: '刚果盆地', kind: 'land', coords: [21.5, 0.5], minZoom: 3.2 },
  { id: 'geo-ethiopian-highlands', name: '埃塞俄比亚高原', kind: 'land', coords: [38.5, 10.2], minZoom: 3.6 },
  { id: 'geo-cape-of-good-hope', name: '好望角', kind: 'land', coords: [18.4, -34.3], minZoom: 3.5 },

  // Americas & Global Oceans
  { id: 'geo-mississippi', name: '密西西比河', kind: 'water', coords: [-91.0, 35.2], minZoom: 3.0 },
  { id: 'geo-rockies', name: '落基山脉', kind: 'land', coords: [-110.5, 42.5], minZoom: 2.8 },
  { id: 'geo-great-lakes', name: '北美五大湖', kind: 'water', coords: [-84.5, 45.2], minZoom: 3.3 },
  { id: 'geo-amazon', name: '亚马孙河', kind: 'water', coords: [-61.0, -3.2], minZoom: 2.7 },
  { id: 'geo-andes', name: '安第斯山脉', kind: 'land', coords: [-69.5, -18.5], minZoom: 2.6 },
  { id: 'geo-caribbean', name: '加勒比海', kind: 'water', coords: [-75.5, 15.0], minZoom: 2.8 },
  { id: 'geo-atlantic', name: '大西洋', kind: 'water', coords: [-36.0, 26.0], minZoom: 1.8 },
  { id: 'geo-indian-ocean', name: '印度洋', kind: 'water', coords: [76.0, -10.0], minZoom: 1.8 },
  { id: 'geo-pacific', name: '太平洋', kind: 'water', coords: [165.0, 15.0], minZoom: 1.8 },
];
