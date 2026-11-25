import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRY_PROFILES } from '../src/data/countries';
import { ERAS } from '../src/data/eras';
import { ALL_EVENTS } from '../src/data/events';
import { ALL_FIGURES } from '../src/data/figures';
import { formatYear } from '../src/utils/timeline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_FILE = path.join(ROOT_DIR, 'colab', 'illustration-prompts.json');

const ARCHIVAL_STYLE =
  'museum archival oil painting blended with classical antique copperplate atlas illumination, warm parchment and gilded ochre lighting, fine brushwork, historically authentic period architecture and attire, rich atmospheric depth';

const NEGATIVE_PROMPT =
  'text, letters, typography, calligraphy, caption, labels, watermark, signature, frame border, collage, split screen, modern clothing, neon, 3d render, blurry, deformed hands, extra limbs';

const ERA_VISUALS = {
  'era-1':
    'sunlit Bronze Age river valley civilization, terraced mudbrick ziggurats along the Euphrates and limestone pyramids beside the Nile, bronze ritual vessels and river barges',
  'era-2':
    'classical Axial Age grand stone colonnade and open-air philosophical forum, marbled Mediterranean acropolis overlooking a terracotta imperial capital along the Silk Road',
  'era-3':
    'Eurasian crossroads at dusk, gilded Byzantine domes, Tang dynasty timber pagoda silhouettes, desert caravan oasis and illuminated monastic library',
  'era-4':
    'bustling maritime spice harbor with Song dynasty ocean junks and wide Eurasian steppe grasslands with horse riders beneath sweeping clouds',
  'era-5':
    'Age of Sail tall-masted carrack galleons crossing gilded Atlantic swells, antique brass astrolabe, silver bullion chests, and Renaissance harbor bastion',
  'era-6':
    'early Industrial Revolution grand cast-iron railway hall and steam locomotives framed by brick mills, brass telegraph instruments, and billowing coal plumes at golden hour',
  'era-7':
    'mid-twentieth-century modernist diplomatic assembly hall and steel industrial metropolis seen across a dramatic misty skyline, subdued historic sepia-slate tones',
  'era-8':
    'contemporary interconnected earth from high atmospheric dawn, illuminated transcontinental maritime lanes and sleek observatory dome overlooking a coastal city',
};

const COUNTRY_VISUALS = {
  china:
    'ancient Chang-an imperial palatial eaves, mist-draped Yellow River terraces, carved stone steles and wooden junks under golden clouds',
  japan:
    'timeless Kyoto wooden temple pagoda framed by cherry blossoms and distant snow-capped Mount Fuji over calm inland waters',
  korea:
    'Gyeongbokgung-inspired timber palace courtyard beneath rugged granite peaks with celadon ceramic kiln silhouettes',
  mongolia:
    'vast emerald Eurasian steppe valley under dramatic clouds, felt gers and distant horsemen riding along a winding river',
  india:
    'sandstone red fortress arches and lotus pond courtyard framed by carved temple spires at warm sunset',
  vietnam:
    'limestone karst bays dotted with wooden sails beside verdant terraced river deltas',
  thailand:
    'gilded tiered stupa spires reflecting across tranquil Chao Phraya river canals at dawn',
  indonesia:
    'ancient volcanic stone mandala terraces rising above tropical archipelago waters and wooden spice-trade prahus',
  iran:
    'turquoise glazed mosaic iwans and soaring Apadana stone column capitals glowing in warm Persian desert sunlight',
  greece:
    'sun-bleached marble Doric temple columns crowning a rocky Mediterranean promontory overlooking cobalt Aegean waters',
  italy:
    'Roman travertine aqueduct arches and Renaissance domed skyline bathed in warm Tuscan amber dusk',
  france:
    'gothic flying-buttress cathedral towers and classical riverside chateau facade reflected in calm evening waters',
  britain:
    'historic stone abbey towers and Thames dockside tall-ship masts framed by iron-ribbed Victorian glasshouse arches',
  germany:
    'stone castle keep perched above the Rhine valley and medieval timber guild hall beside stone-arched bridges',
  spain:
    'Moorish horseshoe-arch courtyard and sunlit Castilian stone fortress overlooking Andalusian olive hills',
  portugal:
    'Lisbon stone maritime tower beside rolling Atlantic harbor waves and lateen-rigged caravel sails',
  netherlands:
    'Amsterdam canal brick gable houses, wooden merchant fluyt masts, and historic windmills on emerald polders',
  austria:
    'baroque Viennese palace cupola and Alpine Danube valley vista in crisp golden twilight',
  poland:
    'Wawel-inspired red-brick gothic fortress battlements and wide central European wheat plains along the Vistula',
  russia:
    'onion-domed stone kremlin cathedral rising above snow-dusted birch plains and a broad frozen river bend',
  sweden:
    'Nordic timber longship harbor beside calm archipelago granite cliffs and copper-roofed royal palace spires',
  turkey:
    'grand domed mosque and ancient Anatolian aqueduct straddling the shimmering Bosphorus strait at sunset',
  arabia:
    'carved sandstone desert caravan city of domes, wind-catchers, courtyard palms, and celestial observatory astrolabes',
  egypt:
    'monumental Giza limestone pyramids and lotus-columned Nile temple complex glowing in warm Sahara twilight',
  ethiopia:
    'monolithic rock-hewn stone church courtyard atop misty Abyssinian highlands under dramatic sunlit clouds',
  'west-africa':
    'earthen adobe towers of Timbuktu, Niger river wooden pirogues, and desert gold-salt camel caravan at dusk',
  usa:
    'neoclassical marble rotunda dome and nineteenth-century steam-era harbor bridge spanning broad Atlantic waters',
  mexico:
    'stepped stone Mesoamerican pyramid plaza surrounded by volcanic highland peaks and colonial terracotta arcades',
  peru:
    'granite Inca agricultural stone terraces of Machu Picchu shrouded in drifting Andean cloud mist',
  brazil:
    'lush Atlantic coastal bay framed by granite sugarloaf peaks and historic Portuguese colonial stone harbor arches',
};

const ROLE_VISUALS = {
  ruler: 'regal sovereign statesman in historically authentic ceremonial robes and crown or court headdress',
  thinker: 'distinguished philosopher and scholar in period robes surrounded by scrolls, manuscripts, or stone reliefs',
  scientist: 'pioneering natural philosopher and inventor beside brass astronomical instruments, parchment diagrams, or glass lenses',
  reformer: 'visionary explorer and reformer with maritime compasses, folded maps, or civic parchment charters',
};

const REGION_SCENES = {
  'east-asia': 'classical East Asian architecture, timber eaves, ink-mist mountains',
  'south-asia': 'South and Southeast Asian sandstone temple arches, tropical courtyard palms',
  'middle-east': 'West Asian courtyard domes, mudbrick citadel arches, desert twilight',
  europe: 'European stone colonnades, gothic arches, harbor stone quays',
  africa: 'African stone and earthen monumental architecture, river valley savannah horizon',
  americas: 'American stone plazas, coastal harbors, mountain highland terraces',
  global: 'oceanic maritime horizon, historic port city, antique navigational instruments',
};

const DIMENSION_SCENES = {
  politics: 'diplomatic court hall, imperial banners, monumental stone citadel',
  economy: 'bustling historic harbor market, merchant caravan, coinage and cargo vessels',
  culture: 'grand classical library, temple sanctuary, artisan stone reliefs and scrolls',
  tech: 'historical observatory, mechanical workshop, maritime navigation and engineering',
};

const EVENT_MOTIF_RULES = [
  [/uruk|楔形文字|苏美尔|乌尔/, 'ancient Sumerian mudbrick ziggurat temple courtyard at dusk, scribes and clay tablets'],
  [/narmer|埃及统一|法老/, 'ancient Egyptian Nile riverfront stone temple pylon, papyrus reeds and royal barge'],
  [/pyramid|金字塔/, 'Giza plateau stepped stone construction ramps, limestone blocks, Nile barges under golden sun'],
  [/indus|印度河|摩亨佐达罗/, 'ancient Harappan burnt-brick gridded citadel street, drainage channels and stepped bath'],
  [/erlitou|二里头|夏/, 'Bronze Age Yellow River palatial rammed-earth courtyard, turquoise inlaid ritual vessels'],
  [/hammurabi|汉谟拉比/, 'ancient Babylon mudbrick city gate, carved black diorite law stele in sunlit plaza'],
  [/minoan|克里特|米诺斯/, 'Minoan Knossos painted terrace columns, Aegean harbor and red-ochre frescoes'],
  [/hittite|赫梯|卡迭石|kadesh/, 'bronze-armored two-horse war chariots crossing Anatolian river valley toward stone citadel'],
  [/shang|商朝|甲骨文|殷墟/, 'Shang dynasty bronze tripod ding cauldrons and bone divination courtyard in Anyang'],
  [/bronze-collapse|青铜时代崩溃/, 'dramatic eastern Mediterranean walled coastal citadel harbor at stormy twilight'],
  [/olmec|奥尔梅克/, 'colossal basalt Olmec carved stone head resting amid misty Gulf lowland jungle'],
  [/zhou|西周|分封/, 'Western Zhou bronze bell chime pavilion and ceremonial jade terrace'],
  [/phoenician|腓尼基/, 'Phoenician cedar-plank bireme merchant ships anchored off terraced Tyre island harbor'],
  [/chavin|查文/, 'Chavin stone sunken circular plaza high in mist-wrapped Peruvian Andes'],
  [/greek-polis|雅典|athens|民主|希波|greco-persian/, 'Athenian marble agora and trireme warships cutting across sunlit Aegean strait'],
  [/coins-lydia|铸币/, 'ancient Anatolian royal mint workshop with hammered electrum coinage scales'],
  [/cyrus|波斯|persia|波斯波利斯/, 'Persepolis stone winged-bull gateway and sunlit columned imperial audience hall'],
  [/confucius|孔子|百家/, 'classical East Asian bamboo-grove pavilion with bamboo slips and scholars conversing'],
  [/buddha|释迦牟尼|佛/, 'ancient Indian sandstone stupa terrace beside banyan trees at serene sunrise'],
  [/shangyang|商鞅|变法|秦|qin/, 'fortified Qin stone pass, bronze tallies, terracotta warriors standing in formation'],
  [/alexander|亚历山大|希腊化/, 'Hellenistic marble colonnade meeting Persian palm oasis beneath snow-dusted Bactrian peaks'],
  [/ashoka|孔雀帝国|阿育王/, 'Mauryan polished sandstone Ashoka lion pillar beside carved stone edicts'],
  [/punic|迦太基|布匿/, 'Carthaginian circular naval harbor and Roman quinquereme fleet at Mediterranean dusk'],
  [/zhang-qian|张骞|丝绸之路|silk/, 'camel caravan winding through ochre Taklamakan oasis cliffs beneath Pamir snow peaks'],
  [/caesar|凯撒|罗马|roman|奥古斯都/, 'grand Roman stone forum, triumphal marble arches and Senatorial colonnade'],
  [/christianity|基督|君士坦丁|constantinople/, 'golden-domed basilica interior streaming shafts of light onto marble floor'],
  [/cai-lun|蔡伦|造纸/, 'Eastern Han workshop with bamboo screens drying luminous handmade paper sheets'],
  [/teotihuacan|特奥蒂瓦坎/, 'monumental Avenue of the Dead and Pyramid of the Sun in Mexican highland valley'],
  [/tang|长安|唐|丝路/, 'Tang dynasty timber palace rooftops glowing with lanterns beside bustling market gates'],
  [/islam|阿拔斯|巴格达|baghdad|智慧宫/, 'round-walled Abbasid Baghdad turquoise dome library and brass astrolabe court'],
  [/song|宋|交子|活字|指南针/, 'Northern Song bustling Bianhe riverfront painted wooden bridge, canal barges and printing studio'],
  [/mongol|蒙古|成吉思汗|元朝/, 'vast Eurasian steppe camp at dawn with horse-archers and felt gers against mountain horizon'],
  [/zheng-he|郑和|下西洋/, 'massive Ming dynasty multi-masted wooden treasure ships sailing across sunlit Indian Ocean swells'],
  [/gutenberg|古腾堡|印刷/, 'fifteenth-century timber workshop with wooden screw printing press and stacked parchment folios'],
  [/renaissance|文艺复兴|佛罗伦萨/, 'Florence marble cathedral cupola rising above sunlit Renaissance stone palazzi and river bridge'],
  [/columbus|哥伦布|大航海|麦哲伦|magellan|达伽马|vasco/, 'wooden carrack and caravel tall ships crossing golden oceanic swells under billowing square sails'],
  [/silver|白银|波托西|马尼拉/, 'Spanish silver galleon anchored off stone fortress harbor beside laden bullion chests'],
  [/reformation|宗教改革|启蒙|enlightenment/, 'candlelit seventeenth-century European scholar library with celestial globe and open folios'],
  [/newton|科学革命|伽利略|galileo/, 'classical observatory study with brass refracting telescope, prism light beam and geometry scrolls'],
  [/steam|工业革命|瓦特|watt|铁路/, 'cast-iron railway shed, brass steam boiler engine and smoking brick textile mill'],
  [/french-revolution|法国大革命|独立宣言|american-revolution|宪法/, 'neoclassical stone parliamentary assembly rotunda streaming daylight through tall windows'],
  [/meiji|明治|洋务/, 'late nineteenth-century Yokohama iron harbor wharf with steamship beside traditional wooden jetty'],
  [/electricity|电气|电报|爱迪生|法拉第/, 'Victorian laboratory glowing with copper dynamo coils and warm glass filament lamps'],
  [/aviation|莱特|航空|内燃机/, 'open coastal sand dunes with early canvas biplane suspended against crisp morning sky'],
  [/ww1|ww2|一战|二战|联合国的成立|un|冷战|cold-war/, 'solemn mid-twentieth-century modernist limestone council hall and coastal skyline under dramatic clouds'],
  [/moon|阿波罗|航天|space/, 'sleek mid-century orbital rocket launchpad illuminated at dawn above coastal marsh'],
  [/internet|互联网|数字|ai|半导体/, 'high-altitude glass observatory dome and luminous globe beneath starry night sky'],
];

const STARTER_EVENT_IDS = new Set([
  'e1-uruk',
  'e1-narmer',
  'e1-indus',
  'e1-hammurabi',
  'e2-athens-democracy',
  'e2-qin-unification',
  'e2-zhang-qian',
  'e2-roman-empire',
  'e3-milan-constantinople',
  'e5-columbus',
  'e6-industrial-revolution',
  'e8-internet',
]);

const STARTER_FIGURE_IDS = new Set([
  'fig-hammurabi',
  'fig-confucius',
  'fig-buddha',
  'fig-alexander',
  'fig-qin-shihuang',
  'fig-caesar',
  'fig-newton',
  'fig-darwin',
  'fig-einstein',
  'fig-zheng-he',
  'fig-columbus',
  'fig-napoleon',
]);

function stripCjk(text) {
  return text.replace(/[\u3400-\u9FFF\uF900-\uFAFF]/g, '').replace(/\s+/g, ' ').trim();
}

function slugWords(id) {
  const cleaned = id
    .replace(/^(e\d+|fig)-/, '')
    .replace(/-/g, ' ')
    .trim();
  return stripCjk(cleaned);
}

function buildEventMotif(ev) {
  const haystack = `${ev.id} ${ev.title} ${ev.locationName}`.toLowerCase();
  for (const [pattern, scene] of EVENT_MOTIF_RULES) {
    if (pattern.test(haystack)) {
      return scene;
    }
  }
  const regionDesc = REGION_SCENES[ev.region] || REGION_SCENES.global;
  const dimDesc = DIMENSION_SCENES[ev.primaryDimension] || DIMENSION_SCENES.politics;
  const idHint = slugWords(ev.id);
  const eraIdx = ev.eraId;
  const eraTone =
    eraIdx === 'era-1' || eraIdx === 'era-2'
      ? 'ancient antique bronze and stone civilization'
      : eraIdx === 'era-3' || eraIdx === 'era-4'
        ? 'medieval and early-modern cross-cultural civilization'
        : eraIdx === 'era-5' || eraIdx === 'era-6'
          ? 'early modern maritime and industrial transformation'
          : 'modern twentieth-century historical landmark vista';
  return `${eraTone} scene depicting ${idHint}, ${dimDesc}, set in ${regionDesc}`;
}

function buildItems() {
  const items = [];

  // 1. 8 Eras (16:9, starter)
  for (const era of ERAS) {
    const motif = ERA_VISUALS[era.id] || 'panoramic ancient historical civilization horizon';
    const prompt = stripCjk(
      `Panoramic historical vista of ${motif}, spanning ${formatYear(era.startYear)} to ${formatYear(era.endYear)}, ${ARCHIVAL_STYLE}, wide 16:9 composition`,
    );
    items.push({
      key: `era:${era.id}`,
      kind: 'era',
      id: era.id,
      label: era.name,
      enLabel: `${era.id} (${era.startYear} to ${era.endYear})`,
      tier: 'starter',
      width: 768,
      height: 432,
      aspect: '16:9',
      file: `era/${era.id}.webp`,
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
    });
  }

  // 2. 30 Curated Countries (16:9, starter)
  for (const country of COUNTRY_PROFILES) {
    const motif =
      COUNTRY_VISUALS[country.id] ||
      `iconic historic architecture and river valley landscape of ${country.enName}`;
    const prompt = stripCjk(
      `Historical heritage panorama of ${country.enName}, featuring ${motif}, ${ARCHIVAL_STYLE}, wide 16:9 composition`,
    );
    items.push({
      key: `country:${country.id}`,
      kind: 'country',
      id: country.id,
      label: country.name,
      enLabel: country.enName,
      tier: 'starter',
      width: 768,
      height: 432,
      aspect: '16:9',
      file: `country/${country.id}.webp`,
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
    });
  }

  // 3. 87 Historical Figures (1:1 museum waist-up oil portrait)
  for (const fig of ALL_FIGURES) {
    const roleDesc = ROLE_VISUALS[fig.role] || ROLE_VISUALS.thinker;
    const regionDesc = REGION_SCENES[fig.region] || REGION_SCENES.global;
    const isStarter = STARTER_FIGURE_IDS.has(fig.id) || items.filter((i) => i.kind === 'figure' && i.tier === 'starter').length < 12 && fig.importance === 3;
    const prompt = stripCjk(
      `Classical museum oil portrait of historical figure ${fig.enName} (${fig.activeYear}), depicted as a ${roleDesc}, subtle background hinting at ${regionDesc}, dignified warm Rembrandt chiaroscuro lighting, rich textured oil canvas, centered waist-up framing, no text`,
    );
    items.push({
      key: `figure:${fig.id}`,
      kind: 'figure',
      id: fig.id,
      label: fig.name,
      enLabel: fig.enName,
      tier: isStarter ? 'starter' : 'core',
      width: 512,
      height: 512,
      aspect: '1:1',
      file: `figure/${fig.id}.webp`,
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
    });
  }

  // 4. 170 Historical Events (16:9 landscape tableau)
  let starterEvCount = 0;
  for (const ev of ALL_EVENTS) {
    const motif = buildEventMotif(ev);
    let tier = 'all';
    if (STARTER_EVENT_IDS.has(ev.id) || (ev.importance === 3 && starterEvCount < 12)) {
      tier = 'starter';
      starterEvCount += 1;
    } else if (ev.importance === 3) {
      tier = 'core';
    }
    const prompt = stripCjk(
      `Historical tableau around ${ev.year}: ${motif}, ${ARCHIVAL_STYLE}, dramatic golden-hour sky, wide 16:9 museum painting`,
    );
    items.push({
      key: `event:${ev.id}`,
      kind: 'event',
      id: ev.id,
      label: ev.title,
      enLabel: slugWords(ev.id),
      tier,
      width: 768,
      height: 432,
      aspect: '16:9',
      file: `event/${ev.id}.webp`,
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
    });
  }

  return items;
}

const items = buildItems();
const counts = {
  total: items.length,
  starter: items.filter((i) => i.tier === 'starter').length,
  core: items.filter((i) => i.tier === 'starter' || i.tier === 'core').length,
  all: items.length,
  byKind: {
    era: items.filter((i) => i.kind === 'era').length,
    country: items.filter((i) => i.kind === 'country').length,
    figure: items.filter((i) => i.kind === 'figure').length,
    event: items.filter((i) => i.kind === 'event').length,
  },
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(
  OUT_FILE,
  JSON.stringify(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      counts,
      items,
    },
    null,
    2,
  ),
  'utf8',
);

const cjkPromptCount = items.filter((i) => /[\u3400-\u9FFF]/.test(i.prompt)).length;
console.log(
  `Exported ${counts.total} illustration prompts -> ${path.relative(ROOT_DIR, OUT_FILE)}`,
);
console.log('Breakdown:', counts, '| CJK prompts:', cjkPromptCount);
