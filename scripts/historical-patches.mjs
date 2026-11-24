/**
 * Curated fine-grained historical polity patches for key eras where global
 * open-source datasets consolidate famous multipolar states into one blob
 * (e.g., Spring & Autumn / Warring States China, Three Kingdoms, Classical Greece,
 * and Renaissance Italian city-states).
 *
 * Shared inland vertices match identically across neighboring polities so there
 * are zero gaps or overlaps, while coastal edges extend slightly offshore so
 * build-map-data.mjs cleanly clips them to Natural Earth 50m coastlines.
 */

function polyFeature(n, p, ring, bp = 1) {
  const closed =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, ring[0]];
  return {
    type: 'Feature',
    properties: { n, p, bp },
    geometry: {
      type: 'Polygon',
      coordinates: [closed],
    },
  };
}

// Classical Greece patch (clipped to mainland & Aegean land by ne_50m_land)
const GREECE_CLASSICAL_FEATURES = [
  polyFeature('Kingdom of Macedonia', 'Kingdom of Macedonia', [
    [19.0, 42.3],
    [24.8, 42.3],
    [24.8, 40.3],
    [22.9, 39.8],
    [19.0, 40.1],
  ]),
  polyFeature('Athens', 'Athens', [
    [19.0, 40.1],
    [22.9, 39.8],
    [24.8, 40.3],
    [27.8, 40.2],
    [27.8, 36.2],
    [23.3, 36.2],
    [23.0, 37.9],
    [21.6, 38.4],
    [19.0, 38.6],
  ]),
  polyFeature('Sparta', 'Sparta', [
    [19.0, 38.6],
    [21.6, 38.4],
    [23.0, 37.9],
    [23.3, 36.2],
    [23.3, 34.4],
    [19.0, 34.4],
  ]),
];

export const EXTRA_SNAPSHOT_CLONES = [
  { year: 220, baseYear: 200 },
];

export const HISTORICAL_PATCHES = {
  // 公元前 500 年：春秋列国（秦/晋/燕/齐/鲁/东周王畿/楚/吴/越）+ 古典希腊城邦
  [-500]: [
    {
      removeNames: ['Zhou states'],
      clipLand: true,
      features: [
        polyFeature('Yan', 'Yan', [
          [113.4, 42.2],
          [124.2, 42.2],
          [124.2, 38.6],
          [116.4, 38.6],
          [113.4, 39.6],
        ]),
        polyFeature('Qin', 'Qin', [
          [104.2, 37.2],
          [110.2, 37.2],
          [110.3, 34.6],
          [110.3, 33.2],
          [108.5, 32.2],
          [104.2, 32.2],
        ]),
        polyFeature('Jin State', 'Jin State', [
          [110.2, 37.2],
          [110.8, 40.4],
          [113.4, 40.4],
          [113.4, 39.6],
          [116.4, 38.6],
          [116.1, 36.6],
          [115.5, 35.5],
          [113.2, 35.1],
          [110.3, 34.6],
        ]),
        polyFeature('Qi', 'Qi', [
          [116.4, 38.6],
          [123.5, 38.6],
          [123.5, 35.4],
          [119.6, 35.6],
          [117.3, 36.2],
          [116.1, 36.6],
        ]),
        polyFeature('Lu', 'Lu', [
          [116.1, 36.6],
          [117.3, 36.2],
          [119.6, 35.6],
          [119.8, 34.3],
          [116.5, 34.6],
          [115.5, 35.5],
        ]),
        polyFeature('Zhou Royal Domain', 'Zhou Royal Domain', [
          [110.3, 34.6],
          [113.2, 35.1],
          [115.5, 35.5],
          [116.5, 34.6],
          [116.8, 33.4],
          [114.2, 32.8],
          [110.3, 33.2],
        ]),
        polyFeature('Wu', 'Wu', [
          [116.5, 34.6],
          [119.8, 34.3],
          [123.5, 34.3],
          [123.5, 30.7],
          [120.5, 30.6],
          [117.8, 29.8],
          [116.4, 30.3],
          [116.8, 33.4],
        ]),
        polyFeature('Yue', 'Yue', [
          [117.8, 29.8],
          [120.5, 30.6],
          [123.5, 30.7],
          [123.5, 26.2],
          [117.0, 26.2],
        ]),
        polyFeature('Chu', 'Chu', [
          [107.2, 32.2],
          [108.5, 32.2],
          [110.3, 33.2],
          [114.2, 32.8],
          [116.8, 33.4],
          [116.4, 30.3],
          [117.8, 29.8],
          [117.0, 26.2],
          [107.2, 26.2],
        ]),
      ],
    },
    {
      removeNames: ['Greek city-states'],
      removeInBbox: [18.5, 34.2, 28.5, 42.5],
      clipLand: true,
      features: GREECE_CLASSICAL_FEATURES,
    },
  ],

  // 公元前 400 年：战国前期（三家分晋 + 田齐兴起 + 越灭吴）+ 古典希腊
  [-400]: [
    {
      removeNames: ['Zhou states'],
      clipLand: true,
      features: [
        polyFeature('Yan', 'Yan', [
          [113.8, 42.2],
          [124.2, 42.2],
          [124.2, 38.7],
          [116.6, 38.7],
          [113.8, 39.7],
        ]),
        polyFeature('Qin', 'Qin', [
          [104.2, 37.5],
          [110.2, 37.5],
          [110.3, 34.6],
          [110.3, 33.0],
          [107.8, 32.2],
          [104.2, 32.2],
        ]),
        polyFeature('Zhao', 'Zhao', [
          [110.2, 40.4],
          [113.8, 40.4],
          [113.8, 39.7],
          [116.6, 38.7],
          [116.3, 36.6],
          [114.0, 36.1],
          [112.1, 36.3],
          [110.2, 37.5],
        ]),
        polyFeature('Wei State', 'Wei State', [
          [110.2, 37.5],
          [112.1, 36.3],
          [114.0, 36.1],
          [116.0, 35.8],
          [116.0, 34.5],
          [114.0, 34.7],
          [113.4, 35.1],
          [110.3, 34.6],
        ]),
        polyFeature('Han State', 'Han State', [
          [110.3, 34.6],
          [113.4, 35.1],
          [114.0, 34.7],
          [114.4, 33.7],
          [112.8, 33.4],
          [110.3, 33.0],
        ]),
        polyFeature('Zhou Royal Domain', 'Zhou Royal Domain', [
          [114.0, 34.7],
          [116.0, 34.5],
          [116.8, 33.4],
          [114.4, 33.7],
        ]),
        polyFeature('Qi', 'Qi', [
          [116.6, 38.7],
          [123.5, 38.7],
          [123.5, 34.8],
          [116.0, 34.5],
          [116.0, 35.8],
          [116.3, 36.6],
        ]),
        polyFeature('Yue', 'Yue', [
          [116.8, 33.4],
          [116.0, 34.5],
          [123.5, 34.8],
          [123.5, 26.2],
          [116.8, 26.2],
          [116.8, 30.4],
        ]),
        polyFeature('Chu', 'Chu', [
          [107.2, 32.2],
          [107.8, 32.2],
          [110.3, 33.0],
          [112.8, 33.4],
          [114.4, 33.7],
          [116.8, 33.4],
          [116.8, 30.4],
          [116.8, 26.2],
          [107.2, 26.2],
        ]),
      ],
    },
    {
      removeNames: ['Greek city-states', 'Greek colonies'],
      removeInBbox: [18.5, 34.2, 28.5, 42.5],
      clipLand: true,
      features: GREECE_CLASSICAL_FEATURES,
    },
  ],

  // 公元前 300 年：战国七雄中期（秦取巴蜀与汉中、楚并越控江东）
  [-300]: [
    {
      removeNames: ['Qin', 'Zhou states'],
      clipLand: true,
      features: [
        polyFeature('Yan', 'Yan', [
          [114.0, 42.4],
          [125.0, 42.4],
          [125.0, 38.7],
          [116.6, 38.7],
          [114.0, 39.8],
        ]),
        polyFeature('Qin', 'Qin', [
          [101.6, 38.2],
          [110.2, 38.2],
          [110.5, 34.6],
          [110.2, 32.8],
          [107.5, 28.2],
          [101.6, 28.2],
        ]),
        polyFeature('Zhao', 'Zhao', [
          [110.2, 41.2],
          [114.0, 41.2],
          [114.0, 39.8],
          [116.6, 38.7],
          [116.4, 36.4],
          [114.0, 36.0],
          [112.0, 36.2],
          [110.2, 38.2],
        ]),
        polyFeature('Wei State', 'Wei State', [
          [110.2, 38.2],
          [112.0, 36.2],
          [114.0, 36.0],
          [116.0, 35.6],
          [116.2, 34.1],
          [114.0, 34.6],
          [113.0, 35.0],
          [110.5, 34.6],
        ]),
        polyFeature('Han State', 'Han State', [
          [110.5, 34.6],
          [113.0, 35.0],
          [114.0, 34.6],
          [114.5, 33.4],
          [112.2, 33.2],
          [110.2, 32.8],
        ]),
        polyFeature('Qi', 'Qi', [
          [116.6, 38.7],
          [123.5, 38.7],
          [123.5, 34.2],
          [116.2, 34.1],
          [116.0, 35.6],
          [116.4, 36.4],
        ]),
        polyFeature('Chu', 'Chu', [
          [107.5, 28.2],
          [110.2, 32.8],
          [112.2, 33.2],
          [114.5, 33.4],
          [116.2, 34.1],
          [123.5, 34.2],
          [123.5, 25.0],
          [107.5, 25.0],
        ]),
      ],
    },
  ],

  // 公元 220 年：三国鼎立（曹魏、蜀汉、东吴）
  [220]: [
    {
      removeNames: ['Han'],
      clipLand: true,
      features: [
        polyFeature('Cao Wei', 'Cao Wei', [
          [94.4, 41.2],
          [110.5, 41.5],
          [126.2, 42.6],
          [126.2, 34.5],
          [122.0, 33.8],
          [118.4, 33.2],
          [115.6, 32.8],
          [112.2, 32.6],
          [107.8, 33.8],
          [103.5, 34.0],
          [94.4, 37.8],
        ]),
        polyFeature('Shu Han', 'Shu Han', [
          [98.8, 34.0],
          [103.5, 34.0],
          [107.8, 33.8],
          [110.6, 31.2],
          [109.6, 28.8],
          [108.5, 25.2],
          [104.2, 23.0],
          [98.8, 23.5],
        ]),
        polyFeature('Eastern Wu', 'Eastern Wu', [
          [107.8, 33.8],
          [112.2, 32.6],
          [115.6, 32.8],
          [118.4, 33.2],
          [122.0, 33.8],
          [123.5, 24.0],
          [110.5, 17.5],
          [105.0, 17.5],
          [104.2, 23.0],
          [108.5, 25.2],
          [109.6, 28.8],
          [110.6, 31.2],
        ]),
      ],
    },
  ],

  // 公元 1492 & 1500 年：文艺复兴意大利城邦细分（米兰、热那亚、佛罗伦萨、那不勒斯 + 保留原威尼斯与教皇国）
  [1492]: [
    {
      clipLand: true,
      italyKeepNames: ['Papal States', 'Venice'],
      italyTrimNames: ['Holy Roman Empire', 'Aragón', 'France', 'Swiss Confederation'],
      features: [
        polyFeature('Duchy of Milan', 'Duchy of Milan', [
          [7.5, 46.2],
          [10.2, 46.2],
          [10.2, 44.5],
          [7.5, 44.5],
        ]),
        polyFeature('Republic of Genoa', 'Republic of Genoa', [
          [7.4, 44.5],
          [10.1, 44.5],
          [10.1, 41.2],
          [7.4, 41.2],
        ]),
        polyFeature('Republic of Florence', 'Republic of Florence', [
          [9.9, 44.3],
          [12.3, 44.3],
          [12.3, 42.3],
          [9.9, 42.3],
        ]),
        polyFeature('Kingdom of Naples', 'Kingdom of Naples', [
          [13.0, 42.2],
          [18.7, 42.2],
          [18.7, 36.5],
          [12.2, 36.5],
          [12.2, 41.4],
        ]),
      ],
    },
  ],
  [1500]: [
    {
      clipLand: true,
      italyKeepNames: ['Papal States', 'Venice'],
      italyTrimNames: ['Holy Roman Empire', 'Aragón', 'France', 'Swiss Confederation'],
      features: [
        polyFeature('Duchy of Milan', 'Duchy of Milan', [
          [7.5, 46.2],
          [10.2, 46.2],
          [10.2, 44.5],
          [7.5, 44.5],
        ]),
        polyFeature('Republic of Genoa', 'Republic of Genoa', [
          [7.4, 44.5],
          [10.1, 44.5],
          [10.1, 41.2],
          [7.4, 41.2],
        ]),
        polyFeature('Republic of Florence', 'Republic of Florence', [
          [9.9, 44.3],
          [12.3, 44.3],
          [12.3, 42.3],
          [9.9, 42.3],
        ]),
        polyFeature('Kingdom of Naples', 'Kingdom of Naples', [
          [13.0, 42.2],
          [18.7, 42.2],
          [18.7, 36.5],
          [12.2, 36.5],
          [12.2, 41.4],
        ]),
      ],
    },
  ],
};
