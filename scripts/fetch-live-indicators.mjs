import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, '..', 'public', 'data', 'live-indicators.json');

const COUNTRY_ISO_MAP = [
  { countryId: 'china', iso3: 'CHN' },
  { countryId: 'japan', iso3: 'JPN' },
  { countryId: 'korea', iso3: 'KOR' },
  { countryId: 'mongolia', iso3: 'MNG' },
  { countryId: 'india', iso3: 'IND' },
  { countryId: 'vietnam', iso3: 'VNM' },
  { countryId: 'thailand', iso3: 'THA' },
  { countryId: 'indonesia', iso3: 'IDN' },
  { countryId: 'iran', iso3: 'IRN' },
  { countryId: 'greece', iso3: 'GRC' },
  { countryId: 'italy', iso3: 'ITA' },
  { countryId: 'france', iso3: 'FRA' },
  { countryId: 'britain', iso3: 'GBR' },
  { countryId: 'germany', iso3: 'DEU' },
  { countryId: 'spain', iso3: 'ESP' },
  { countryId: 'portugal', iso3: 'PRT' },
  { countryId: 'netherlands', iso3: 'NLD' },
  { countryId: 'austria', iso3: 'AUT' },
  { countryId: 'poland', iso3: 'POL' },
  { countryId: 'russia', iso3: 'RUS' },
  { countryId: 'sweden', iso3: 'SWE' },
  { countryId: 'turkey', iso3: 'TUR' },
  { countryId: 'arabia', iso3: 'SAU', isoNote: '以沙特阿拉伯数据为海湾代表' },
  { countryId: 'egypt', iso3: 'EGY' },
  { countryId: 'ethiopia', iso3: 'ETH' },
  { countryId: 'west-africa', iso3: 'NGA', isoNote: '以尼日利亚数据为西非代表' },
  { countryId: 'usa', iso3: 'USA' },
  { countryId: 'mexico', iso3: 'MEX' },
  { countryId: 'peru', iso3: 'PER' },
  { countryId: 'brazil', iso3: 'BRA' },
];

const INDICATORS = [
  { code: 'GB.XPD.RSDV.GD.ZS', field: 'rndPctGdp', decimals: 2 },
  { code: 'IT.NET.USER.ZS', field: 'internetPct', decimals: 1 },
  { code: 'EG.FEC.RNEW.ZS', field: 'renewableEnergyPct', decimals: 1 },
  { code: 'TX.VAL.TECH.MF.ZS', field: 'highTechExportsPct', decimals: 1 },
  { code: 'NY.GDP.PCAP.PP.KD', field: 'gdpPerCapitaPPP', decimals: 0 },
  { code: 'SP.POP.TOTL', field: 'population', decimals: 0 },
];

async function fetchJsonWithRetry(url, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 18000);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'world-history-atlas-cron/1.0' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
    }
  }
  throw lastErr;
}

async function main() {
  const isoList = COUNTRY_ISO_MAP.map((c) => c.iso3).join(';');
  const byIso = {};
  for (const item of COUNTRY_ISO_MAP) {
    byIso[item.iso3] = {
      countryId: item.countryId,
      iso3: item.iso3,
      ...(item.isoNote ? { isoNote: item.isoNote } : {}),
    };
  }

  let worldBankLastUpdated = '';

  for (const ind of INDICATORS) {
    const url = `https://api.worldbank.org/v2/country/${isoList}/indicator/${ind.code}?format=json&mrv=8&per_page=400`;
    console.log(`Fetching ${ind.code} (${ind.field})...`);
    const payload = await fetchJsonWithRetry(url);
    if (!Array.isArray(payload) || payload.length < 2 || !Array.isArray(payload[1])) {
      throw new Error(`Unexpected response format for ${ind.code}`);
    }
    const meta = payload[0];
    if (meta?.lastupdated && meta.lastupdated > worldBankLastUpdated) {
      worldBankLastUpdated = meta.lastupdated;
    }

    const bestByIso = {};
    for (const row of payload[1]) {
      const iso3 = row?.countryiso3code;
      const val = row?.value;
      const yr = Number(row?.date);
      if (!iso3 || !byIso[iso3] || val === null || !Number.isFinite(Number(val)) || !Number.isFinite(yr)) {
        continue;
      }
      const prev = bestByIso[iso3];
      if (!prev || yr > prev.year) {
        const num = Number(val);
        const rounded =
          ind.decimals === 0
            ? Math.round(num)
            : Number(num.toFixed(ind.decimals));
        bestByIso[iso3] = { value: rounded, year: yr };
      }
    }

    for (const [iso3, datum] of Object.entries(bestByIso)) {
      byIso[iso3][ind.field] = datum;
    }
    console.log(`  -> populated ${Object.keys(bestByIso).length}/30 countries`);
  }

  const countries = {};
  for (const item of COUNTRY_ISO_MAP) {
    countries[item.countryId] = byIso[item.iso3];
  }

  const output = {
    source: 'World Bank Open Data API (v2)',
    fetchedAt: new Date().toISOString(),
    worldBankLastUpdated: worldBankLastUpdated || undefined,
    countries,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Saved ${OUT_FILE} (lastupdated=${worldBankLastUpdated})`);
}

main().catch((err) => {
  console.error('Failed to fetch live indicators:', err);
  process.exit(1);
});
