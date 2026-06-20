import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT = resolve(import.meta.dirname, "..");
const OUT_FILE = process.env.MEMBERS_OUT_FILE || join(ROOT, "data/members.json");
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || "X1dVbdCW3aS8Vss4o8kcxahWnGe";
const TABLE_ID = process.env.FEISHU_TABLE_ID || "tblO6TsMNrA0tHnW";
const VIEW_ID = process.env.FEISHU_VIEW_ID || "vewJAtb20B";

const cityCatalog = [
  { label: "武汉", note: "武汉市", lng: 114.3055, lat: 30.5928, chinaNames: ["武汉市"], aliases: ["武汉", "武汉市"] },
  { label: "上海", note: "上海市", lng: 121.4737, lat: 31.2304, chinaNames: ["上海市"], aliases: ["上海", "上海市"] },
  { label: "南京", note: "南京市", lng: 118.7969, lat: 32.0603, chinaNames: ["南京市"], aliases: ["南京", "南京市"] },
  { label: "杭州", note: "杭州市", lng: 120.1551, lat: 30.2741, chinaNames: ["杭州市"], aliases: ["杭州", "杭州市"] },
  { label: "厦门", note: "厦门市", lng: 118.0894, lat: 24.4798, chinaNames: ["厦门市"], aliases: ["厦门", "厦门市"] },
  { label: "苏州", note: "苏州市", lng: 120.5853, lat: 31.2989, chinaNames: ["苏州市"], aliases: ["苏州", "苏州市"] },
  { label: "信阳市", note: "信阳市", lng: 114.0913, lat: 32.147, chinaNames: ["信阳市"], aliases: ["信阳", "信阳市"] },
  { label: "石家庄市", note: "石家庄市", lng: 114.5149, lat: 38.0428, chinaNames: ["石家庄市"], aliases: ["石家庄", "石家庄市"] },
  { label: "北京", note: "北京市", lng: 116.4074, lat: 39.9042, chinaNames: ["北京市"], aliases: ["北京", "北京市"] },
  { label: "天津", note: "天津市", lng: 117.2009, lat: 39.0842, chinaNames: ["天津市"], aliases: ["天津", "天津市"] },
  { label: "大连", note: "大连市", lng: 121.6147, lat: 38.914, chinaNames: ["大连市"], aliases: ["大连", "大连市"] },
  { label: "长春/济南", note: "同一条双地点记录，填长春与济南", lng: 123.08, lat: 40.76, chinaNames: ["长春市", "济南市"], aliases: ["长春/济南", "长春与济南", "长春，济南"] },
  { label: "广西柳州", note: "柳州市", lng: 109.4281, lat: 24.3264, chinaNames: ["柳州市"], aliases: ["广西柳州", "柳州", "柳州市"] },
  { label: "常州/北京", note: "同一条双地点记录，填常州与北京", lng: 118.2, lat: 35.9, chinaNames: ["常州市", "北京市"], aliases: ["常州/北京", "常州与北京", "常州，北京"] },
  { label: "秦皇岛", note: "秦皇岛市", lng: 119.5996, lat: 39.9354, chinaNames: ["秦皇岛市"], aliases: ["秦皇岛", "秦皇岛市"] },
  { label: "衡阳", note: "衡阳市", lng: 112.5719, lat: 26.8932, chinaNames: ["衡阳市"], aliases: ["衡阳", "衡阳市"] },
  { label: "西安", note: "西安市", lng: 108.9398, lat: 34.3416, chinaNames: ["西安市"], aliases: ["西安", "西安市"] },
  { label: "新加坡", note: "海外市级行政边界", lng: 103.8198, lat: 1.3521, overseasId: "singapore", aliases: ["新加坡", "Singapore"] },
  { label: "波士顿", note: "海外市级行政边界", lng: -71.0589, lat: 42.3601, overseasId: "boston", aliases: ["波士顿", "Boston"] },
  { label: "悉尼", note: "海外市级行政边界", lng: 151.2093, lat: -33.8688, overseasId: "sydney", aliases: ["悉尼", "Sydney"] }
];

const provinceOnlyAliases = new Set(["辽宁", "辽宁省", "江苏", "江苏省", "山东", "山东省"]);
const aliasToLabel = new Map();
for (const city of cityCatalog) {
  for (const alias of city.aliases) aliasToLabel.set(normalizeCity(alias), city.label);
}

function normalizeCity(value) {
  return String(value || "").trim().replace(/\s+/g, "").replace(/[，、]/g, "/");
}

function textCell(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(textCell).filter(Boolean).join("");
  if (typeof value === "object") return value.text || value.name || value.value || "";
  return String(value).trim();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.code) {
    throw new Error(payload.msg || `${response.status} ${url}`);
  }
  return payload;
}

async function tenantAccessToken() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) return "";
  const payload = await requestJson("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret })
  });
  return payload.tenant_access_token;
}

async function listRecordsByOpenApi(token) {
  const records = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({ page_size: "500" });
    if (VIEW_ID) params.set("view_id", VIEW_ID);
    if (pageToken) params.set("page_token", pageToken);
    const payload = await requestJson(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records?${params}`,
      { headers: { authorization: `Bearer ${token}` } }
    );
    for (const item of payload.data?.items || []) {
      const fields = item.fields || {};
      records.push({
        name: textCell(fields["名字"]) || textCell(fields["微信名字"]) || "未命名成员",
        city: textCell(fields["城市"])
      });
    }
    pageToken = payload.data?.page_token || "";
  } while (pageToken);
  return records;
}

async function listRecordsByLarkCli() {
  const records = [];
  let offset = 0;
  while (true) {
    const { stdout } = await execFileAsync("lark-cli", [
      "base", "+record-list",
      "--base-token", BASE_TOKEN,
      "--table-id", TABLE_ID,
      "--view-id", VIEW_ID,
      "--field-id", "名字",
      "--field-id", "微信名字",
      "--field-id", "城市",
      "--limit", "200",
      "--offset", String(offset),
      "--format", "json",
      "--as", "user"
    ], { maxBuffer: 1024 * 1024 * 10 });
    const payload = JSON.parse(stdout);
    if (!payload.ok) throw new Error(payload.msg || "lark-cli returned ok=false");
    const rows = payload.data?.data || [];
    for (const row of rows) {
      records.push({
        name: textCell(row[0]) || textCell(row[1]) || "未命名成员",
        city: textCell(row[2])
      });
    }
    if (!payload.data?.has_more || rows.length === 0) break;
    offset += rows.length;
  }
  return records;
}

async function listRecords() {
  const token = await tenantAccessToken();
  if (token) return listRecordsByOpenApi(token);
  return listRecordsByLarkCli();
}

function buildMapData(records) {
  const buckets = new Map(cityCatalog.map((city) => [city.label, { ...city, count: 0, students: [] }]));
  const unrecordedStudents = [];
  const provinceOnlyStudents = [];
  const unmappedStudents = [];

  for (const record of records) {
    const city = normalizeCity(record.city);
    if (!city) {
      unrecordedStudents.push(record.name);
      continue;
    }
    const label = aliasToLabel.get(city);
    if (label) {
      const bucket = buckets.get(label);
      bucket.count += 1;
      bucket.students.push(record.name);
      continue;
    }
    if (provinceOnlyAliases.has(city)) provinceOnlyStudents.push(record.name);
    else unmappedStudents.push({ name: record.name, city: record.city });
  }

  const placeRows = [...buckets.values()]
    .filter((row) => row.count > 0)
    .map(({ aliases, ...row }) => row)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-Hans-CN"));

  return {
    updatedAt: new Date().toISOString(),
    totalMembers: records.length,
    locatedMembers: placeRows.reduce((sum, row) => sum + row.count, 0),
    filledCityRecords: records.filter((record) => normalizeCity(record.city)).length,
    provinceOnlyMembers: provinceOnlyStudents.length + unmappedStudents.length,
    unrecordedMembers: unrecordedStudents.length,
    placeRows,
    unrecordedStudents,
    provinceOnlyStudents,
    unmappedStudents
  };
}

const data = buildMapData(await listRecords());
await mkdir(dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${OUT_FILE}`);
console.log(`Members=${data.totalMembers}, places=${data.placeRows.length}, updatedAt=${data.updatedAt}`);
