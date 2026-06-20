import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT_FILE = process.env.OVERSEAS_BOUNDARIES_OUT_FILE || join(ROOT, "data/overseas-admin-boundaries.json");
const USER_AGENT = process.env.OSM_USER_AGENT || "stanleyuniversity-map/1.0 (https://stanleyuniversity.garylau.ai/map/)";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

const memberBoundaryIds = new Map([
  ["R536780", { id: "singapore", name: "新加坡", name_en: "Singapore", note: "海外市级行政边界" }],
  ["R2315704", { id: "boston", name: "波士顿", name_en: "Boston", note: "海外市级行政边界" }],
  ["R5750005", { id: "sydney", name: "悉尼", name_en: "Sydney", note: "海外都会区边界" }]
]);

const regions = [
  {
    key: "boston",
    name: "Greater Boston municipalities",
    bbox: [42.2, -71.35, 42.55, -70.85],
    levels: ["8"],
    center: [42.3601, -71.0589],
    maxFeatures: 70
  },
  {
    key: "sydney",
    name: "Sydney local government areas",
    bbox: [-34.08, 150.75, -33.65, 151.45],
    levels: ["6"],
    center: [-33.8688, 151.2093],
    maxFeatures: 70
  },
  {
    key: "singapore",
    name: "Singapore planning subzones",
    bbox: [1.2, 103.6, 1.47, 104.05],
    levels: ["7"],
    center: [1.3521, 103.8198],
    maxFeatures: 170,
    excludeNames: [/^Iskandar Puteri$/i]
  }
];

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": USER_AGENT,
      ...options.headers
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 160)}`);
  return text;
}

async function fetchJson(url, options = {}, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const text = await fetchText(url, options);
      if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
        throw new Error(`Expected JSON, received: ${text.slice(0, 120)}`);
      }
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(1200 * attempt);
    }
  }
  throw lastError;
}

function relationQuery(region) {
  return `[out:json][timeout:30];
relation[boundary=administrative][admin_level~"^(${region.levels.join("|")})$"](${region.bbox.join(",")});
out tags center ${region.maxFeatures + 30};`;
}

async function overpass(region) {
  const body = new URLSearchParams({ data: relationQuery(region) });
  let lastError;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      return await fetchJson(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body
      }, 3);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function distanceTo(center, element) {
  const lat = element.center?.lat;
  const lon = element.center?.lon;
  if (lat == null || lon == null) return Number.POSITIVE_INFINITY;
  return (lat - center[0]) ** 2 + (lon - center[1]) ** 2;
}

function relationIdsForRegion(region, payload) {
  const seen = new Set();
  return (payload.elements || [])
    .filter((element) => element.type === "relation" && element.tags?.name && element.center)
    .filter((element) => !region.excludeNames?.some((pattern) => pattern.test(element.tags.name)))
    .sort((a, b) => distanceTo(region.center, a) - distanceTo(region.center, b))
    .map((element) => `R${element.id}`)
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, region.maxFeatures);
}

async function nominatimLookup(osmIds) {
  const features = [];
  for (let index = 0; index < osmIds.length; index += 20) {
    const batch = osmIds.slice(index, index + 20);
    const url = `https://nominatim.openstreetmap.org/lookup?format=jsonv2&polygon_geojson=1&osm_ids=${batch.join(",")}`;
    const rows = await fetchJson(url, {}, 4);
    for (const row of rows) {
      if (!row.geojson || !["Polygon", "MultiPolygon"].includes(row.geojson.type)) continue;
      features.push(row);
    }
    await sleep(1100);
  }
  return features;
}

function roundGeometry(value) {
  if (typeof value === "number") return Number(value.toFixed(5));
  if (Array.isArray(value)) return value.map(roundGeometry);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, roundGeometry(nested)]));
  }
  return value;
}

function featureFromLookup(row, regionKey) {
  const osmKey = `${row.osm_type?.[0]?.toUpperCase() || "R"}${row.osm_id}`;
  const member = memberBoundaryIds.get(osmKey);
  const name = row.name || row.display_name?.split(",")[0] || osmKey;
  return {
    type: "Feature",
    geometry: roundGeometry(row.geojson),
    properties: {
      id: member?.id || `osm-${osmKey.toLowerCase()}`,
      memberId: member?.id || "",
      name: member?.name || name,
      name_en: member?.name_en || name,
      note: member?.note || "海外行政边界",
      sourceName: name,
      display_name: row.display_name || name,
      osm_type: row.osm_type,
      osm_id: row.osm_id,
      region: regionKey,
      adminType: row.type || "",
      boundaryRole: member ? "member-city" : "context"
    }
  };
}

async function main() {
  const allIds = new Set(memberBoundaryIds.keys());
  for (const region of regions) {
    const payload = await overpass(region);
    const ids = relationIdsForRegion(region, payload);
    for (const id of ids) allIds.add(id);
    console.log(`${region.name}: ${ids.length} context boundaries`);
    await sleep(1200);
  }

  const rows = await nominatimLookup([...allIds]);
  const featuresByKey = new Map();
  for (const row of rows) {
    const osmKey = `${row.osm_type?.[0]?.toUpperCase() || "R"}${row.osm_id}`;
    const region = memberBoundaryIds.get(osmKey)?.id || regions.find((item) => row.display_name?.toLowerCase().includes(item.key))?.key || "";
    featuresByKey.set(osmKey, featureFromLookup(row, region));
  }

  const features = [...featuresByKey.values()].sort((a, b) => {
    const role = a.properties.boundaryRole.localeCompare(b.properties.boundaryRole);
    if (role) return role;
    return a.properties.name.localeCompare(b.properties.name, "zh-Hans-CN");
  });
  const collection = {
    type: "FeatureCollection",
    generatedAt: new Date().toISOString(),
    source: "OpenStreetMap administrative boundaries via Overpass API and Nominatim lookup",
    features
  };

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(collection)}\n`);
  console.log(`Wrote ${OUT_FILE}`);
  console.log(`Features=${features.length}, memberBoundaries=${features.filter((item) => item.properties.boundaryRole === "member-city").length}`);
}

await main();
