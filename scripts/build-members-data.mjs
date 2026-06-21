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
  { label: "重庆", note: "重庆市", lng: 106.504962, lat: 29.533155, chinaNames: ["重庆市"], aliases: ["重庆", "重庆市"] },
  { label: "大连", note: "大连市", lng: 121.6147, lat: 38.914, chinaNames: ["大连市"], aliases: ["大连", "大连市"] },
  { label: "成都", note: "成都市", lng: 104.065735, lat: 30.659462, chinaNames: ["成都市"], aliases: ["成都", "成都市"] },
  { label: "广州", note: "广州市", lng: 113.280637, lat: 23.125178, chinaNames: ["广州市"], aliases: ["广州", "广州市"] },
  { label: "深圳", note: "深圳市", lng: 114.085947, lat: 22.547, chinaNames: ["深圳市"], aliases: ["深圳", "深圳市"] },
  { label: "昆明", note: "昆明市", lng: 102.712251, lat: 25.040609, chinaNames: ["昆明市"], aliases: ["昆明", "昆明市"] },
  { label: "淄博", note: "淄博市", lng: 118.047648, lat: 36.814939, chinaNames: ["淄博市"], aliases: ["淄博", "淄博市"] },
  { label: "青岛", note: "青岛市", lng: 120.355173, lat: 36.082982, chinaNames: ["青岛市"], aliases: ["青岛", "青岛市"] },
  { label: "福州", note: "福州市", lng: 119.306239, lat: 26.075302, chinaNames: ["福州市"], aliases: ["福州", "福州市"] },
  { label: "烟台", note: "烟台市", lng: 121.391382, lat: 37.539297, chinaNames: ["烟台市"], aliases: ["烟台", "烟台市", "山东烟台"] },
  { label: "淮安", note: "淮安市", lng: 119.021265, lat: 33.597506, chinaNames: ["淮安市"], aliases: ["淮安", "淮安市", "江苏淮安"] },
  { label: "广西柳州", note: "柳州市", lng: 109.4281, lat: 24.3264, chinaNames: ["柳州市"], aliases: ["广西柳州", "柳州", "柳州市"] },
  { label: "秦皇岛", note: "秦皇岛市", lng: 119.5996, lat: 39.9354, chinaNames: ["秦皇岛市"], aliases: ["秦皇岛", "秦皇岛市"] },
  { label: "衡阳", note: "衡阳市", lng: 112.5719, lat: 26.8932, chinaNames: ["衡阳市"], aliases: ["衡阳", "衡阳市"] },
  { label: "西安", note: "西安市", lng: 108.9398, lat: 34.3416, chinaNames: ["西安市"], aliases: ["西安", "西安市"] },
  { label: "新加坡", note: "海外市级行政边界", lng: 103.8198, lat: 1.3521, overseasId: "singapore", aliases: ["新加坡", "Singapore"] },
  { label: "波士顿", note: "海外市级行政边界", lng: -71.0589, lat: 42.3601, overseasId: "boston", aliases: ["波士顿", "Boston"] },
  { label: "悉尼", note: "海外都会区边界", lng: 151.2093, lat: -33.8688, overseasId: "sydney", aliases: ["悉尼", "Sydney"] }
];

const provinceOnlyAliases = new Set(["辽宁", "辽宁省", "江苏", "江苏省", "山东", "山东省", "福建", "福建省"]);
const aliasToLabel = new Map();
for (const city of cityCatalog) {
  for (const alias of city.aliases) aliasToLabel.set(normalizeCity(alias), city.label);
}

function normalizeCity(value) {
  return String(value || "").trim().replace(/\s+/g, "").replace(/[，、]/g, "/");
}

function isDualCity(value) {
  const raw = String(value || "").trim();
  const normalized = normalizeCity(raw);
  return normalized.includes("/") || raw.includes("与");
}

function textCell(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(textCell).filter(Boolean).join("");
  if (typeof value === "object") return value.text || value.name || value.value || "";
  return String(value).trim();
}

function memberRecord(name, wechatName) {
  const registeredName = textCell(name);
  const wxName = textCell(wechatName);
  const displayName = registeredName || wxName || "未命名成员";
  return {
    name: displayName,
    registeredName: registeredName || displayName,
    wechatName: wxName || displayName
  };
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
      const member = memberRecord(fields["名字"], fields["微信名字"]);
      records.push({
        ...member,
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
      const member = memberRecord(row[0], row[1]);
      records.push({
        ...member,
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
  const excludedDualCityStudents = [];

  for (const record of records) {
    const student = memberRecord(record.registeredName || record.name, record.wechatName);
    const city = normalizeCity(record.city);
    if (!city) {
      unrecordedStudents.push(student);
      continue;
    }
    if (isDualCity(record.city)) {
      excludedDualCityStudents.push({ ...student, city: record.city });
      continue;
    }
    const label = aliasToLabel.get(city);
    if (label) {
      const bucket = buckets.get(label);
      bucket.count += 1;
      bucket.students.push(student);
      continue;
    }
    if (provinceOnlyAliases.has(city)) provinceOnlyStudents.push({ ...student, city: record.city });
    else unmappedStudents.push({ ...student, city: record.city });
  }

  const placeRows = [...buckets.values()]
    .filter((row) => row.count > 0)
    .map(({ aliases, ...row }) => row)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-Hans-CN"));

  return {
    updatedAt: new Date().toISOString(),
    totalMembers: records.length,
    locatedMembers: placeRows.reduce((sum, row) => sum + row.count, 0),
    filledCityRecords: records.filter((record) => normalizeCity(record.city) && !isDualCity(record.city)).length,
    provinceOnlyMembers: provinceOnlyStudents.length + unmappedStudents.length,
    unrecordedMembers: unrecordedStudents.length,
    excludedDualCityMembers: excludedDualCityStudents.length,
    placeRows,
    unrecordedStudents,
    provinceOnlyStudents,
    unmappedStudents,
    excludedDualCityStudents
  };
}

const data = buildMapData(await listRecords());
await mkdir(dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${OUT_FILE}`);
console.log(`Members=${data.totalMembers}, places=${data.placeRows.length}, updatedAt=${data.updatedAt}`);
