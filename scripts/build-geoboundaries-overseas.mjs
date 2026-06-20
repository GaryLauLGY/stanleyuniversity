import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT_FILE = join(ROOT, "data/overseas-admin-boundaries.json");
const US_PLACE_GRID_FILE = join(ROOT, "data/sources/us-place-boundaries.geojson");
const USER_AGENT = process.env.GEOBOUNDARIES_USER_AGENT || "stanleyuniversity-map/1.0 (https://stanleyuniversity.garylau.ai/map/)";

const greaterSydneyLgas = [
  "Bayside (NSW)",
  "Blacktown",
  "Blue Mountains",
  "Burwood",
  "Camden",
  "Campbelltown (NSW)",
  "Canada Bay",
  "Canterbury-Bankstown",
  "Cumberland",
  "Fairfield",
  "Georges River",
  "Hawkesbury",
  "Hornsby",
  "Hunters Hill",
  "Inner West",
  "Ku-ring-gai",
  "Lane Cove",
  "Liverpool",
  "Mosman",
  "North Sydney",
  "Northern Beaches",
  "Parramatta",
  "Penrith",
  "Randwick",
  "Ryde",
  "Strathfield",
  "Sutherland",
  "Sydney",
  "The Hills",
  "Waverley",
  "Willoughby",
  "Wollondilly",
  "Woollahra"
];

const countryGrids = [
  {
    country: "AUS",
    adm: "ADM2",
    note: "澳洲市级/地方政府区块",
    memberByName: new Map(greaterSydneyLgas.map((name) => [
      name,
      { id: "sydney", name: "悉尼", note: "澳洲悉尼都会区" }
    ]))
  },
  {
    country: "SGP",
    adm: "ADM2",
    note: "新加坡规划分区",
    memberAll: { id: "singapore", name: "新加坡", note: "新加坡规划分区" }
  }
];

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

function slug(value) {
  return String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function roundGeometry(value) {
  if (typeof value === "number") return Number(value.toFixed(4));
  if (Array.isArray(value)) return value.map(roundGeometry);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, roundGeometry(nested)]));
  }
  return value;
}

async function geoboundariesGrid(config) {
  const metadata = await fetchJson(`https://www.geoboundaries.org/api/current/gbOpen/${config.country}/${config.adm}/`);
  const data = await fetchJson(metadata.simplifiedGeometryGeoJSON || metadata.gjDownloadURL);
  return data.features.map((feature) => {
    const sourceName = feature.properties.shapeName;
    const member = config.memberByName?.get(sourceName) || config.memberAll;
    return {
      type: "Feature",
      geometry: roundGeometry(feature.geometry),
      properties: {
        id: member?.id || `gb-${config.country.toLowerCase()}-${config.adm.toLowerCase()}-${slug(sourceName)}`,
        memberId: member?.id || "",
        name: member?.name || sourceName,
        name_en: sourceName,
        note: member?.note || config.note,
        sourceName,
        display_name: `${sourceName}, ${metadata.boundaryName}`,
        country: config.country,
        boundarySource: metadata.boundarySource,
        boundarySourceURL: metadata.boundarySourceURL,
        boundaryLicense: metadata.boundaryLicense,
        boundaryType: metadata.boundaryType,
        boundaryRole: "grid-city"
      }
    };
  });
}

async function usPlaceGrid() {
  const data = JSON.parse(await readFile(US_PLACE_GRID_FILE, "utf8"));
  return data.features.map((feature) => {
    const isBoston = feature.properties.GEOID === "2507000";
    const sourceName = feature.properties.NAMELSAD || feature.properties.NAME;
    return {
      type: "Feature",
      geometry: roundGeometry(feature.geometry),
      properties: {
        id: isBoston ? "boston" : `us-place-${feature.properties.GEOID || slug(sourceName)}`,
        memberId: isBoston ? "boston" : "",
        name: isBoston ? "波士顿" : sourceName,
        name_en: sourceName,
        note: isBoston ? "美国波士顿市级边界" : "美国城市/镇边界",
        sourceName,
        display_name: `${sourceName}, ${feature.properties.STATE_NAME || "United States"}`,
        country: "USA",
        boundarySource: "U.S. Census Bureau Cartographic Boundary Files via CitySDK",
        boundarySourceURL: "https://uscensusbureau.github.io/citysdk/docs/",
        boundaryLicense: "U.S. Government public domain",
        boundaryType: "place",
        boundaryRole: "grid-city",
        geoid: feature.properties.GEOID,
        state: feature.properties.STUSPS,
        stateName: feature.properties.STATE_NAME
      }
    };
  });
}

async function main() {
  const features = [];
  for (const config of countryGrids) {
    const grid = await geoboundariesGrid(config);
    console.log(`${config.country} ${config.adm}: ${grid.length} grid features`);
    features.push(...grid);
  }
  const usPlaces = await usPlaceGrid();
  console.log(`USA places: ${usPlaces.length} grid features`);
  features.push(...usPlaces);

  const collection = {
    type: "FeatureCollection",
    generatedAt: new Date().toISOString(),
    source: "geoBoundaries gbOpen administrative grids plus member city outlines",
    attribution: "geoBoundaries / William & Mary geoLab; country boundary sources as listed per feature.",
    features: features.sort((a, b) => {
      const country = (a.properties.country || "").localeCompare(b.properties.country || "");
      if (country) return country;
      return a.properties.name.localeCompare(b.properties.name, "zh-Hans-CN");
    })
  };

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(collection)}\n`);
  console.log(`Wrote ${OUT_FILE}`);
  console.log(`Features=${features.length}`);
}

await main();
