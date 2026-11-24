/**
 * Curated fine-grained historical polity patches for key eras where global
 * open-source datasets consolidate famous multipolar states into one blob
 * (Spring & Autumn, Warring States, Three Kingdoms, Classical Greece,
 * and Renaissance Italian city-states).
 *
 * Adjacent polities share identical multi-vertex inland polyline segments via
 * `buildPoly` + `rev` so frontiers trace authentic rivers and mountain ridges
 * with zero gaps or overlaps, while coastal sides clip to Natural Earth 50m land.
 */

function rev(seg) {
  return [...seg].reverse();
}

function samePt(a, b) {
  return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
}

function buildPoly(n, p, segments, bp = 1) {
  const ring = [];
  for (const seg of segments) {
    for (const pt of seg) {
      if (ring.length === 0 || !samePt(ring[ring.length - 1], pt)) {
        ring.push([pt[0], pt[1]]);
      }
    }
  }
  if (ring.length > 0 && !samePt(ring[0], ring[ring.length - 1])) {
    ring.push([ring[0][0], ring[0][1]]);
  }
  return {
    type: 'Feature',
    properties: { n, p, bp },
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
}

function buildMultiPoly(n, p, ringList, bp = 1) {
  const coordinates = ringList.map((segments) => {
    const ring = [];
    for (const seg of segments) {
      for (const pt of seg) {
        if (ring.length === 0 || !samePt(ring[ring.length - 1], pt)) {
          ring.push([pt[0], pt[1]]);
        }
      }
    }
    if (ring.length > 0 && !samePt(ring[0], ring[ring.length - 1])) {
      ring.push([ring[0][0], ring[0][1]]);
    }
    return [ring];
  });
  return {
    type: 'Feature',
    properties: { n, p, bp },
    geometry: {
      type: 'MultiPolygon',
      coordinates,
    },
  };
}

// ---------- Classical Greece (-500 & -400) ----------
// Shared Pindus/Olympus/Strymon divide and Gulf of Corinth / Isthmus divide
const GR_MAC_SOUTH = [
  [18.8, 40.35],
  [19.7, 40.42],
  [20.5, 40.32],
  [21.3, 40.08],
  [22.1, 39.95],
  [22.75, 40.02],
  [23.35, 40.32],
  [24.15, 40.62],
  [25.0, 40.72],
];

const GR_CORINTH_DIVIDE = [
  [19.0, 38.62],
  [20.2, 38.52],
  [21.25, 38.38],
  [22.15, 38.22],
  [22.85, 37.98],
  [23.22, 37.72],
  [23.48, 37.15],
  [23.62, 36.2],
];

const GREECE_CLASSICAL_FEATURES = [
  buildPoly('Kingdom of Macedonia', 'Kingdom of Macedonia', [
    GR_MAC_SOUTH,
    [
      [25.0, 40.72],
      [25.05, 41.35],
      [24.5, 41.88],
      [23.2, 42.18],
      [21.5, 42.22],
      [19.9, 41.92],
      [19.05, 41.25],
      [18.8, 40.35],
    ],
  ]),
  buildPoly('Athens', 'Athens', [
    rev(GR_CORINTH_DIVIDE),
    [
      [19.0, 38.62],
      [18.8, 40.35],
    ],
    GR_MAC_SOUTH,
    [
      [25.0, 40.72],
      [26.2, 40.62],
      [27.5, 39.8],
      [27.8, 38.1],
      [27.6, 36.2],
      [25.4, 36.15],
      [23.62, 36.2],
    ],
  ]),
  buildPoly('Sparta', 'Sparta', [
    GR_CORINTH_DIVIDE,
    [
      [23.62, 36.2],
      [23.2, 35.2],
      [22.1, 34.8],
      [20.4, 35.1],
      [19.2, 36.5],
      [19.0, 38.62],
    ],
  ]),
];

// ---------- -500 Spring & Autumn China (春秋列国) ----------
// Inland junctions:
//   Qin-Jin-N [109.4, 38.1] -> Tongguan [110.3, 34.65] -> Danjiang [110.5, 33.15] -> Qin-Chu-W [105.0, 32.5]
//   Jin-Yan-W [113.8, 40.5] -> Jin-Yan-Qi [116.7, 38.2] -> Jin-Qi-Lu [116.2, 36.5] -> Jin-Lu-Zhou [115.5, 35.4]
//   Zhou-Lu-Wu [116.4, 34.4] -> Zhou-Chu-Wu [116.3, 32.7] -> Chu-Wu-Yue [117.2, 29.8] -> Chu-Yue-S [116.6, 25.8]
const SA_JIN_QIN = [
  [109.4, 38.1],
  [110.1, 37.6],
  [110.65, 36.9],
  [110.6, 36.0],
  [110.42, 35.25],
  [110.3, 34.65],
];

const SA_QIN_ZHOU = [
  [110.3, 34.65],
  [110.62, 34.15],
  [110.68, 33.65],
  [110.5, 33.15],
];

const SA_QIN_CHU = [
  [110.5, 33.15],
  [109.5, 32.95],
  [108.3, 32.68],
  [107.1, 32.72],
  [106.0, 32.8],
  [105.0, 32.5],
];

const SA_QIN_OUTER = [
  [105.0, 32.5],
  [104.25, 33.3],
  [103.95, 34.45],
  [104.2, 35.6],
  [105.0, 36.55],
  [106.1, 37.18],
  [107.5, 37.65],
  [109.4, 38.1],
];

const SA_JIN_OUTER = [
  [109.4, 38.1],
  [109.65, 39.05],
  [110.3, 39.9],
  [111.2, 40.38],
  [112.4, 40.55],
  [113.8, 40.5],
];

const SA_JIN_YAN = [
  [113.8, 40.5],
  [114.45, 39.95],
  [115.05, 39.35],
  [115.68, 38.82],
  [116.22, 38.42],
  [116.7, 38.2],
];

const SA_YAN_QI_BAY = [
  [116.7, 38.2],
  [117.35, 38.32],
  [118.05, 38.52],
  [118.85, 38.72],
];

const SA_YAN_OUTER = [
  [113.8, 40.5],
  [114.4, 41.15],
  [115.6, 41.62],
  [117.2, 41.98],
  [119.0, 42.18],
  [120.8, 42.18],
  [122.5, 41.88],
  [123.65, 41.25],
  [124.2, 40.35],
  [124.15, 39.4],
  [122.4, 38.85],
  [120.8, 38.55],
  [118.85, 38.72],
];

const SA_JIN_QI = [
  [116.7, 38.2],
  [116.65, 37.65],
  [116.45, 37.05],
  [116.2, 36.5],
];

const SA_JIN_LU = [
  [116.2, 36.5],
  [115.88, 35.98],
  [115.5, 35.4],
];

const SA_JIN_ZHOU = [
  [115.5, 35.4],
  [114.55, 35.32],
  [113.45, 35.12],
  [112.25, 34.95],
  [111.2, 34.85],
  [110.3, 34.65],
];

const SA_QI_LU = [
  [116.2, 36.5],
  [117.05, 36.32],
  [117.95, 36.02],
  [118.75, 35.72],
  [119.52, 35.42],
  [120.5, 35.22],
];

const SA_LU_ZHOU = [
  [115.5, 35.4],
  [115.92, 34.92],
  [116.4, 34.4],
];

const SA_LU_WU = [
  [116.4, 34.4],
  [117.45, 34.52],
  [118.45, 34.62],
  [119.35, 34.52],
  [120.45, 34.48],
];

const SA_ZHOU_WU = [
  [116.4, 34.4],
  [116.68, 33.82],
  [116.6, 33.22],
  [116.3, 32.7],
];

const SA_ZHOU_CHU = [
  [116.3, 32.7],
  [115.1, 32.6],
  [113.85, 32.72],
  [112.6, 32.92],
  [111.5, 33.05],
  [110.5, 33.15],
];

const SA_WU_CHU = [
  [116.3, 32.7],
  [115.98, 32.02],
  [115.92, 31.32],
  [116.22, 30.62],
  [116.72, 30.12],
  [117.2, 29.8],
];

const SA_WU_YUE = [
  [117.2, 29.8],
  [118.25, 29.92],
  [119.45, 30.25],
  [120.55, 30.35],
  [121.62, 30.22],
  [122.8, 30.28],
];

const SA_CHU_YUE = [
  [117.2, 29.8],
  [117.42, 28.85],
  [117.48, 27.82],
  [117.15, 26.82],
  [116.6, 25.8],
];

const SA_CHU_OUTER = [
  [116.6, 25.8],
  [115.1, 25.42],
  [113.4, 25.45],
  [111.6, 25.78],
  [110.0, 26.55],
  [108.9, 27.75],
  [108.25, 29.15],
  [107.4, 30.55],
  [106.2, 31.75],
  [105.0, 32.5],
];

const SPRING_AUTUMN_FEATURES = [
  buildPoly('Qin State', 'Qin State', [SA_QIN_OUTER, SA_JIN_QIN, SA_QIN_ZHOU, SA_QIN_CHU]),
  buildPoly('Jin State', 'Jin State', [
    SA_JIN_OUTER,
    SA_JIN_YAN,
    SA_JIN_QI,
    SA_JIN_LU,
    SA_JIN_ZHOU,
    rev(SA_JIN_QIN),
  ]),
  buildPoly('Yan', 'Yan', [
    SA_YAN_OUTER,
    rev(SA_YAN_QI_BAY),
    rev(SA_JIN_YAN),
  ]),
  buildPoly('Qi', 'Qi', [
    SA_YAN_QI_BAY,
    [
      [118.85, 38.72],
      [121.2, 38.35],
      [123.2, 37.65],
      [122.9, 36.35],
      [120.5, 35.22],
    ],
    rev(SA_QI_LU),
    rev(SA_JIN_QI),
  ]),
  buildPoly('Lu', 'Lu', [
    SA_QI_LU,
    [
      [120.5, 35.22],
      [120.45, 34.48],
    ],
    rev(SA_LU_WU),
    rev(SA_LU_ZHOU),
    rev(SA_JIN_LU),
  ]),
  buildPoly('Zhou Royal Domain', 'Zhou Royal Domain', [
    rev(SA_JIN_ZHOU),
    SA_LU_ZHOU,
    SA_ZHOU_WU,
    SA_ZHOU_CHU,
    rev(SA_QIN_ZHOU),
  ]),
  buildPoly('Wu', 'Wu', [
    SA_LU_WU,
    [
      [120.45, 34.48],
      [122.2, 33.4],
      [123.1, 31.8],
      [122.8, 30.28],
    ],
    rev(SA_WU_YUE),
    rev(SA_WU_CHU),
    rev(SA_ZHOU_WU),
  ]),
  buildPoly('Yue', 'Yue', [
    SA_WU_YUE,
    [
      [122.8, 30.28],
      [123.2, 28.4],
      [121.6, 26.2],
      [119.7, 25.45],
      [116.6, 25.8],
    ],
    rev(SA_CHU_YUE),
  ]),
  buildPoly('Chu', 'Chu', [
    rev(SA_QIN_CHU),
    rev(SA_ZHOU_CHU),
    SA_WU_CHU,
    SA_CHU_YUE,
    SA_CHU_OUTER,
  ]),
];

// ---------- -400 Early Warring States (战国前期 · 三家分晋) ----------
const WS400_QIN_OUTER = [
  [104.8, 32.35],
  [104.05, 33.25],
  [103.85, 34.5],
  [104.25, 35.85],
  [105.25, 36.85],
  [106.7, 37.42],
  [109.1, 37.85],
];

const WS400_QIN_ZHAO = [
  [109.1, 37.85],
  [109.65, 37.25],
  [109.95, 36.6],
];

const WS400_QIN_WEI = [
  [109.95, 36.6],
  [110.18, 35.75],
  [110.22, 34.65],
];

const WS400_QIN_HAN = [
  [110.22, 34.65],
  [110.05, 33.88],
  [109.82, 33.12],
];

const WS400_QIN_CHU = [
  [109.82, 33.12],
  [108.65, 32.72],
  [107.3, 32.68],
  [106.0, 32.72],
  [104.8, 32.35],
];

const WS400_ZHAO_OUTER = [
  [109.1, 37.85],
  [109.45, 39.05],
  [110.2, 39.98],
  [111.35, 40.42],
  [112.75, 40.55],
  [114.0, 40.5],
];

const WS400_ZHAO_YAN = [
  [114.0, 40.5],
  [114.68, 39.82],
  [115.3, 39.18],
  [115.98, 38.62],
  [116.72, 38.22],
];

const WS400_ZHAO_QI = [
  [116.72, 38.22],
  [116.55, 37.32],
  [116.25, 36.42],
];

const WS400_ZHAO_WEI = [
  [116.25, 36.42],
  [115.1, 36.2],
  [113.85, 36.15],
  [112.75, 36.32],
  [111.72, 36.58],
  [110.85, 36.68],
  [109.95, 36.6],
];

const WS400_YAN_QI_BAY = [
  [116.72, 38.22],
  [117.4, 38.35],
  [118.1, 38.52],
  [118.85, 38.72],
];

const WS400_YAN_OUTER = [
  [114.0, 40.5],
  [114.7, 41.2],
  [116.0, 41.72],
  [117.7, 42.08],
  [119.6, 42.22],
  [121.4, 42.18],
  [123.0, 41.75],
  [124.15, 40.85],
  [124.2, 39.4],
  [122.2, 38.82],
  [118.85, 38.72],
];

const WS400_WEI_QI = [
  [116.25, 36.42],
  [116.02, 35.58],
  [116.12, 34.72],
];

const WS400_WEI_YUE = [
  [116.12, 34.72],
  [115.4, 34.62],
];

const WS400_WEI_HAN = [
  [115.4, 34.62],
  [114.55, 34.68],
  [113.82, 34.78],
  [113.25, 34.82],
];

const WS400_ZHOU_N = [
  [113.25, 34.82],
  [112.25, 34.85],
  [111.55, 34.75],
];

const WS400_WEI_HAN_W = [
  [111.55, 34.75],
  [110.85, 34.72],
  [110.22, 34.65],
];

const WS400_ZHOU_S = [
  [111.55, 34.75],
  [111.65, 34.18],
  [112.42, 34.05],
  [113.15, 34.25],
  [113.25, 34.82],
];

const WS400_HAN_YUE = [
  [115.4, 34.62],
  [115.9, 34.15],
  [116.22, 33.48],
];

const WS400_HAN_CHU = [
  [116.22, 33.48],
  [115.1, 33.32],
  [113.8, 33.35],
  [112.45, 33.42],
  [111.15, 33.25],
  [109.82, 33.12],
];

const WS400_QI_YUE = [
  [116.12, 34.72],
  [117.45, 34.82],
  [118.95, 34.88],
  [120.5, 34.82],
];

const WS400_YUE_CHU = [
  [116.22, 33.48],
  [116.45, 32.3],
  [116.95, 30.85],
  [117.42, 29.2],
  [117.28, 27.45],
  [116.6, 25.8],
];

const WS400_CHU_OUTER = [
  [116.6, 25.8],
  [115.0, 25.4],
  [113.2, 25.45],
  [111.5, 25.8],
  [109.9, 26.6],
  [108.7, 27.85],
  [108.05, 29.25],
  [107.1, 30.65],
  [105.9, 31.75],
  [104.8, 32.35],
];

const WARRING_400_FEATURES = [
  buildPoly('Qin State', 'Qin State', [
    WS400_QIN_OUTER,
    WS400_QIN_ZHAO,
    WS400_QIN_WEI,
    WS400_QIN_HAN,
    WS400_QIN_CHU,
  ]),
  buildPoly('Zhao', 'Zhao', [
    WS400_ZHAO_OUTER,
    WS400_ZHAO_YAN,
    WS400_ZHAO_QI,
    WS400_ZHAO_WEI,
    rev(WS400_QIN_ZHAO),
  ]),
  buildPoly('Yan', 'Yan', [
    WS400_YAN_OUTER,
    rev(WS400_YAN_QI_BAY),
    rev(WS400_ZHAO_YAN),
  ]),
  buildPoly('Wei State', 'Wei State', [
    rev(WS400_ZHAO_WEI),
    WS400_WEI_QI,
    WS400_WEI_YUE,
    WS400_WEI_HAN,
    WS400_ZHOU_N,
    WS400_WEI_HAN_W,
    rev(WS400_QIN_WEI),
  ]),
  buildPoly('Zhou Royal Domain', 'Zhou Royal Domain', [
    rev(WS400_ZHOU_N),
    rev(WS400_ZHOU_S),
  ]),
  buildPoly('Han State', 'Han State', [
    rev(WS400_WEI_HAN_W),
    [
      [111.55, 34.75],
      [111.65, 34.18],
      [112.42, 34.05],
      [113.15, 34.25],
      [113.25, 34.82],
    ],
    rev(WS400_WEI_HAN),
    WS400_HAN_YUE,
    WS400_HAN_CHU,
    rev(WS400_QIN_HAN),
  ]),
  buildPoly('Qi', 'Qi', [
    WS400_YAN_QI_BAY,
    [
      [118.85, 38.72],
      [121.2, 38.35],
      [123.2, 37.65],
      [122.9, 36.2],
      [120.5, 34.82],
    ],
    rev(WS400_QI_YUE),
    rev(WS400_WEI_QI),
    rev(WS400_ZHAO_QI),
  ]),
  buildPoly('Yue', 'Yue', [
    WS400_WEI_YUE,
    WS400_QI_YUE,
    [
      [120.5, 34.82],
      [122.5, 33.4],
      [123.2, 31.2],
      [123.1, 28.2],
      [121.4, 26.0],
      [119.6, 25.45],
      [116.6, 25.8],
    ],
    rev(WS400_YUE_CHU),
    rev(WS400_HAN_YUE),
  ]),
  buildPoly('Chu', 'Chu', [
    rev(WS400_QIN_CHU),
    rev(WS400_HAN_CHU),
    WS400_YUE_CHU,
    WS400_CHU_OUTER,
  ]),
];

// ---------- -300 Mid Warring States (战国七雄 · 秦并巴蜀) ----------
const WS300_QIN_OUTER = [
  [102.6, 28.6],
  [101.85, 30.2],
  [101.72, 32.1],
  [102.05, 34.0],
  [102.65, 35.65],
  [103.65, 37.1],
  [105.4, 37.92],
  [107.6, 38.28],
  [110.1, 38.22],
];

const WS300_QIN_ZHAO = [
  [110.1, 38.22],
  [110.55, 37.35],
  [110.58, 36.35],
];

const WS300_QIN_WEI = [
  [110.58, 36.35],
  [110.42, 35.42],
  [110.35, 34.65],
];

const WS300_QIN_HAN = [
  [110.35, 34.65],
  [110.42, 33.72],
  [110.18, 32.78],
];

const WS300_QIN_CHU = [
  [110.18, 32.78],
  [109.62, 31.85],
  [109.12, 30.85],
  [108.45, 29.65],
  [107.35, 28.68],
  [105.75, 28.25],
  [104.05, 28.18],
  [102.6, 28.6],
];

const WS300_ZHAO_OUTER = [
  [110.1, 38.22],
  [110.35, 39.55],
  [111.15, 40.68],
  [112.45, 41.15],
  [114.0, 41.18],
];

const WS300_ZHAO_YAN = [
  [114.0, 41.18],
  [114.35, 40.25],
  [115.05, 39.38],
  [115.85, 38.72],
  [116.72, 38.22],
];

const WS300_ZHAO_QI = [
  [116.72, 38.22],
  [116.58, 37.25],
  [116.32, 36.35],
];

const WS300_ZHAO_WEI = [
  [116.32, 36.35],
  [115.1, 36.08],
  [113.85, 36.02],
  [112.75, 36.22],
  [111.65, 36.45],
  [110.58, 36.35],
];

const WS300_YAN_QI_BAY = [
  [116.72, 38.22],
  [117.45, 38.35],
  [118.15, 38.52],
  [118.88, 38.72],
];

const WS300_YAN_OUTER = [
  [114.0, 41.18],
  [115.1, 41.82],
  [116.9, 42.22],
  [119.0, 42.42],
  [121.2, 42.45],
  [123.2, 42.2],
  [124.55, 41.55],
  [124.85, 40.25],
  [124.0, 39.2],
  [121.8, 38.68],
  [118.88, 38.72],
];

const WS300_WEI_QI = [
  [116.32, 36.35],
  [116.05, 35.42],
  [116.18, 34.25],
];

const WS300_WEI_CHU = [
  [116.18, 34.25],
  [115.05, 34.12],
];

const WS300_WEI_HAN = [
  [115.05, 34.12],
  [113.85, 34.48],
  [112.65, 34.72],
  [111.48, 34.82],
  [110.35, 34.65],
];

const WS300_HAN_CHU = [
  [115.05, 34.12],
  [114.25, 33.42],
  [112.95, 33.25],
  [111.55, 33.12],
  [110.18, 32.78],
];

const WS300_QI_CHU = [
  [116.18, 34.25],
  [117.65, 34.28],
  [119.15, 34.35],
  [120.55, 34.25],
];

const WS300_CHU_OUTER = [
  [120.55, 34.25],
  [122.4, 33.0],
  [123.3, 30.8],
  [123.0, 28.0],
  [120.8, 25.6],
  [118.4, 24.45],
  [115.6, 24.65],
  [112.4, 24.95],
  [109.6, 25.55],
  [107.6, 26.65],
  [105.6, 27.6],
  [104.05, 28.18],
  [102.6, 28.6],
];

const WARRING_300_FEATURES = [
  buildPoly('Qin State', 'Qin State', [
    WS300_QIN_OUTER,
    WS300_QIN_ZHAO,
    WS300_QIN_WEI,
    WS300_QIN_HAN,
    WS300_QIN_CHU,
  ]),
  buildPoly('Zhao', 'Zhao', [
    WS300_ZHAO_OUTER,
    WS300_ZHAO_YAN,
    WS300_ZHAO_QI,
    WS300_ZHAO_WEI,
    rev(WS300_QIN_ZHAO),
  ]),
  buildPoly('Yan', 'Yan', [
    WS300_YAN_OUTER,
    rev(WS300_YAN_QI_BAY),
    rev(WS300_ZHAO_YAN),
  ]),
  buildPoly('Wei State', 'Wei State', [
    rev(WS300_ZHAO_WEI),
    WS300_WEI_QI,
    WS300_WEI_CHU,
    WS300_WEI_HAN,
    rev(WS300_QIN_WEI),
  ]),
  buildPoly('Han State', 'Han State', [
    rev(WS300_WEI_HAN),
    WS300_HAN_CHU,
    rev(WS300_QIN_HAN),
  ]),
  buildPoly('Qi', 'Qi', [
    WS300_YAN_QI_BAY,
    [
      [118.88, 38.72],
      [121.2, 38.35],
      [123.2, 37.65],
      [122.9, 36.1],
      [120.55, 34.25],
    ],
    rev(WS300_QI_CHU),
    rev(WS300_WEI_QI),
    rev(WS300_ZHAO_QI),
  ]),
  buildPoly('Chu', 'Chu', [
    rev(WS300_QIN_CHU),
    rev(WS300_HAN_CHU),
    rev(WS300_WEI_CHU),
    WS300_QI_CHU,
    WS300_CHU_OUTER,
  ]),
];

// ---------- 220 AD Three Kingdoms (三国鼎立 · 曹魏/蜀汉/东吴) ----------
// Shared frontiers anchored at Qinling–Hanzhong–Three Gorges [110.6, 31.6] and Huai River [122.5, 33.8]
const TK_WEI_SHU = [
  [103.2, 34.32],
  [104.35, 34.12],
  [105.55, 34.02],
  [106.85, 34.05],
  [108.15, 33.88],
  [109.38, 33.48],
  [110.18, 32.62],
  [110.6, 31.6],
];

const TK_WEI_WU = [
  [110.6, 31.6],
  [111.82, 31.42],
  [113.12, 31.42],
  [114.42, 31.62],
  [115.78, 31.52],
  [117.08, 31.72],
  [118.32, 32.42],
  [119.55, 33.12],
  [120.85, 33.62],
  [122.5, 33.8],
];

const TK_SHU_WU = [
  [110.6, 31.6],
  [110.38, 30.78],
  [109.68, 29.62],
  [109.18, 27.68],
  [108.45, 25.45],
  [106.35, 23.85],
  [104.2, 22.8],
];

const TK_WEI_OUTER = [
  [103.2, 34.32],
  [102.0, 35.85],
  [100.3, 37.55],
  [97.9, 39.25],
  [95.4, 40.15],
  [94.4, 40.72],
  [96.8, 41.18],
  [100.1, 40.68],
  [103.0, 39.65],
  [105.8, 39.58],
  [108.6, 40.55],
  [111.4, 41.08],
  [114.6, 41.25],
  [118.2, 41.75],
  [121.6, 42.15],
  [124.1, 42.02],
  [125.1, 40.72],
  [124.5, 39.65],
  [123.3, 38.65],
  [121.4, 38.05],
  [122.9, 36.2],
  [122.5, 33.8],
];

const TK_SHU_OUTER = [
  [104.2, 22.8],
  [102.4, 22.45],
  [100.3, 22.52],
  [98.6, 23.85],
  [98.45, 25.85],
  [99.2, 28.45],
  [100.9, 30.85],
  [102.25, 32.85],
  [103.2, 34.32],
];

const TK_WU_OUTER = [
  [122.5, 33.8],
  [122.8, 30.8],
  [122.4, 28.4],
  [120.2, 25.4],
  [118.8, 23.8],
  [115.6, 20.5],
  [111.5, 17.8],
  [107.4, 17.8],
  [105.6, 19.6],
  [104.2, 22.8],
];

const THREE_KINGDOMS_FEATURES = [
  buildPoly('Cao Wei', 'Cao Wei', [TK_WEI_OUTER, rev(TK_WEI_WU), rev(TK_WEI_SHU)]),
  buildPoly('Shu Han', 'Shu Han', [TK_WEI_SHU, TK_SHU_WU, TK_SHU_OUTER]),
  buildPoly('Eastern Wu', 'Eastern Wu', [TK_WEI_WU, TK_WU_OUTER, rev(TK_SHU_WU)]),
];

// ---------- 1492 & 1500 Renaissance Italy (文艺复兴意大利城邦) ----------
// Inland Milan–Genoa and Genoa–Florence shared polylines prevent overlaps or gaps
const IT_MILAN_GENOA = [
  [8.18, 44.75],
  [8.68, 44.64],
  [9.22, 44.62],
  [9.72, 44.68],
  [9.96, 44.72],
];

const IT_GENOA_FLORENCE = [
  [9.96, 44.72],
  [10.02, 44.46],
  [10.05, 44.18],
  [9.84, 43.92],
];

const ITALY_RENAISSANCE_FEATURES = [
  buildPoly('Duchy of Milan', 'Duchy of Milan', [
    IT_MILAN_GENOA,
    [
      [9.96, 44.72],
      [10.08, 45.12],
      [10.16, 45.62],
      [10.08, 46.16],
      [9.48, 46.25],
      [8.86, 46.22],
      [8.34, 46.04],
      [8.02, 45.72],
      [7.92, 45.36],
      [8.02, 44.98],
      [8.18, 44.75],
    ],
  ]),
  buildMultiPoly('Republic of Genoa', 'Republic of Genoa', [
    [
      IT_GENOA_FLORENCE,
      [
        [9.84, 43.92],
        [8.95, 43.9],
        [7.78, 43.65],
        [7.52, 43.76],
        [7.68, 44.14],
        [7.92, 44.52],
        [8.18, 44.75],
      ],
      IT_MILAN_GENOA,
    ],
    // Corsica (separated across the Strait of Bonifacio so Sardinia remains untouched)
    [
      [
        [8.42, 41.34],
        [9.68, 41.34],
        [9.68, 43.16],
        [8.42, 43.16],
      ],
    ],
  ]),
  buildPoly('Republic of Florence', 'Republic of Florence', [
    rev(IT_GENOA_FLORENCE),
    [
      [9.96, 44.72],
      [10.55, 44.38],
      [11.25, 44.22],
      [11.98, 44.02],
      [12.26, 43.58],
      [12.18, 43.02],
      [11.92, 42.52],
      [11.35, 42.22],
      [10.55, 42.25],
      [9.92, 42.98],
      [9.84, 43.92],
    ],
  ]),
  buildPoly('Kingdom of Naples', 'Kingdom of Naples', [
    [
      [13.05, 41.18],
      [13.38, 41.55],
      [13.75, 41.95],
      [14.12, 42.36],
      [14.62, 42.68],
      [16.85, 42.25],
      [18.95, 40.35],
      [18.8, 37.5],
      [15.85, 36.25],
      [12.1, 37.35],
      [12.05, 40.65],
      [13.05, 41.18],
    ],
  ]),
];

export const EXTRA_SNAPSHOT_CLONES = [{ year: 220, baseYear: 200 }];

export const HISTORICAL_PATCHES = {
  // 公元前 500 年：春秋列国 + 古典希腊城邦
  [-500]: [
    {
      removeNames: ['Zhou states'],
      clipLand: true,
      features: SPRING_AUTUMN_FEATURES,
    },
    {
      removeNames: ['Greek city-states'],
      removeInBbox: [18.5, 34.2, 28.5, 42.5],
      clipLand: true,
      features: GREECE_CLASSICAL_FEATURES,
    },
  ],

  // 公元前 400 年：战国前期（三家分晋 + 越灭吴）+ 古典希腊城邦
  [-400]: [
    {
      removeNames: ['Zhou states'],
      clipLand: true,
      features: WARRING_400_FEATURES,
    },
    {
      removeNames: ['Greek city-states', 'Greek colonies'],
      removeInBbox: [18.5, 34.2, 28.5, 42.5],
      clipLand: true,
      features: GREECE_CLASSICAL_FEATURES,
    },
  ],

  // 公元前 300 年：战国七雄中期（秦取巴蜀汉中、楚并越控江东）
  [-300]: [
    {
      removeNames: ['Qin', 'Zhou states'],
      clipLand: true,
      features: WARRING_300_FEATURES,
    },
  ],

  // 公元 220 年：三国鼎立（曹魏、蜀汉、东吴）
  [220]: [
    {
      removeNames: ['Han'],
      eraseOverlapNames: ['Southern Xiongnu', 'Xianbei', 'Goguryeo', 'Koguryo', 'Hainan'],
      clipLand: true,
      features: THREE_KINGDOMS_FEATURES,
    },
  ],

  // 公元 1492 & 1500 年：文艺复兴意大利城邦细分
  [1492]: [
    {
      clipLand: true,
      italyKeepNames: ['Papal States', 'Venice'],
      eraseOverlapNames: ['Holy Roman Empire', 'Aragón', 'France', 'Swiss Confederation', 'Savoy'],
      features: ITALY_RENAISSANCE_FEATURES,
    },
  ],
  [1500]: [
    {
      clipLand: true,
      italyKeepNames: ['Papal States', 'Venice'],
      eraseOverlapNames: ['Holy Roman Empire', 'Aragón', 'France', 'Swiss Confederation', 'Savoy'],
      features: ITALY_RENAISSANCE_FEATURES,
    },
  ],
};
