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

const provinceCatalog = [
  { label: "北京", name: "北京市", adcode: 110000, lng: 116.4074, lat: 39.9042, aliases: ["北京", "北京市"] },
  { label: "天津", name: "天津市", adcode: 120000, lng: 117.2009, lat: 39.0842, aliases: ["天津", "天津市"] },
  { label: "上海", name: "上海市", adcode: 310000, lng: 121.4737, lat: 31.2304, aliases: ["上海", "上海市"] },
  { label: "重庆", name: "重庆市", adcode: 500000, lng: 106.504962, lat: 29.533155, aliases: ["重庆", "重庆市"] },
  { label: "河北", name: "河北省", adcode: 130000, lng: 114.5149, lat: 38.0428, aliases: ["河北", "河北省"] },
  { label: "山西", name: "山西省", adcode: 140000, lng: 112.5624, lat: 37.8735, aliases: ["山西", "山西省"] },
  { label: "内蒙古", name: "内蒙古自治区", adcode: 150000, lng: 111.7652, lat: 40.8175, aliases: ["内蒙古", "内蒙古自治区"] },
  { label: "辽宁", name: "辽宁省", adcode: 210000, lng: 123.4291, lat: 41.8357, aliases: ["辽宁", "辽宁省"] },
  { label: "吉林", name: "吉林省", adcode: 220000, lng: 125.3258, lat: 43.8965, aliases: ["吉林", "吉林省"] },
  { label: "黑龙江", name: "黑龙江省", adcode: 230000, lng: 126.6617, lat: 45.7423, aliases: ["黑龙江", "黑龙江省"] },
  { label: "江苏", name: "江苏省", adcode: 320000, lng: 118.7632, lat: 32.0617, aliases: ["江苏", "江苏省"] },
  { label: "浙江", name: "浙江省", adcode: 330000, lng: 120.1528, lat: 30.2674, aliases: ["浙江", "浙江省"] },
  { label: "安徽", name: "安徽省", adcode: 340000, lng: 117.2849, lat: 31.8612, aliases: ["安徽", "安徽省"] },
  { label: "福建", name: "福建省", adcode: 350000, lng: 119.2951, lat: 26.1008, aliases: ["福建", "福建省"] },
  { label: "江西", name: "江西省", adcode: 360000, lng: 115.8166, lat: 28.6365, aliases: ["江西", "江西省"] },
  { label: "山东", name: "山东省", adcode: 370000, lng: 117.0207, lat: 36.6702, aliases: ["山东", "山东省"] },
  { label: "河南", name: "河南省", adcode: 410000, lng: 113.7536, lat: 34.7657, aliases: ["河南", "河南省"] },
  { label: "湖北", name: "湖北省", adcode: 420000, lng: 114.3419, lat: 30.5465, aliases: ["湖北", "湖北省"] },
  { label: "湖南", name: "湖南省", adcode: 430000, lng: 112.9838, lat: 28.1124, aliases: ["湖南", "湖南省"] },
  { label: "广东", name: "广东省", adcode: 440000, lng: 113.2668, lat: 23.1322, aliases: ["广东", "广东省"] },
  { label: "广西", name: "广西壮族自治区", adcode: 450000, lng: 108.3275, lat: 22.8167, aliases: ["广西", "广西壮族自治区"] },
  { label: "海南", name: "海南省", adcode: 460000, lng: 110.3492, lat: 20.0174, aliases: ["海南", "海南省"] },
  { label: "四川", name: "四川省", adcode: 510000, lng: 104.0757, lat: 30.6509, aliases: ["四川", "四川省"] },
  { label: "贵州", name: "贵州省", adcode: 520000, lng: 106.7074, lat: 26.5982, aliases: ["贵州", "贵州省"] },
  { label: "云南", name: "云南省", adcode: 530000, lng: 102.7097, lat: 25.0453, aliases: ["云南", "云南省"] },
  { label: "西藏", name: "西藏自治区", adcode: 540000, lng: 91.1172, lat: 29.6469, aliases: ["西藏", "西藏自治区"] },
  { label: "陕西", name: "陕西省", adcode: 610000, lng: 108.9542, lat: 34.2655, aliases: ["陕西", "陕西省"] },
  { label: "甘肃", name: "甘肃省", adcode: 620000, lng: 103.8263, lat: 36.0594, aliases: ["甘肃", "甘肃省"] },
  { label: "青海", name: "青海省", adcode: 630000, lng: 101.7802, lat: 36.6209, aliases: ["青海", "青海省"] },
  { label: "宁夏", name: "宁夏回族自治区", adcode: 640000, lng: 106.2588, lat: 38.4712, aliases: ["宁夏", "宁夏回族自治区"] },
  { label: "新疆", name: "新疆维吾尔自治区", adcode: 650000, lng: 87.6277, lat: 43.793, aliases: ["新疆", "新疆维吾尔自治区"] }
];

const cityCatalog = [
  { label: "武汉", provinceLabel: "湖北", note: "武汉市", lng: 114.3055, lat: 30.5928, chinaNames: ["武汉市"], aliases: ["武汉", "武汉市"] },
  { label: "上海", provinceLabel: "上海", note: "上海市", lng: 121.4737, lat: 31.2304, chinaNames: ["上海市"], aliases: ["上海", "上海市"] },
  { label: "南京", provinceLabel: "江苏", note: "南京市", lng: 118.7969, lat: 32.0603, chinaNames: ["南京市"], aliases: ["南京", "南京市"] },
  { label: "杭州", provinceLabel: "浙江", note: "杭州市", lng: 120.1551, lat: 30.2741, chinaNames: ["杭州市"], aliases: ["杭州", "杭州市"] },
  { label: "厦门", provinceLabel: "福建", note: "厦门市", lng: 118.0894, lat: 24.4798, chinaNames: ["厦门市"], aliases: ["厦门", "厦门市"] },
  { label: "苏州", provinceLabel: "江苏", note: "苏州市", lng: 120.5853, lat: 31.2989, chinaNames: ["苏州市"], aliases: ["苏州", "苏州市"] },
  { label: "信阳市", provinceLabel: "河南", note: "信阳市", lng: 114.0913, lat: 32.147, chinaNames: ["信阳市"], aliases: ["信阳", "信阳市"] },
  { label: "石家庄市", provinceLabel: "河北", note: "石家庄市", lng: 114.5149, lat: 38.0428, chinaNames: ["石家庄市"], aliases: ["石家庄", "石家庄市"] },
  { label: "北京", provinceLabel: "北京", note: "北京市", lng: 116.4074, lat: 39.9042, chinaNames: ["北京市"], aliases: ["北京", "北京市"] },
  { label: "天津", provinceLabel: "天津", note: "天津市", lng: 117.2009, lat: 39.0842, chinaNames: ["天津市"], aliases: ["天津", "天津市"] },
  { label: "重庆", provinceLabel: "重庆", note: "重庆市", lng: 106.504962, lat: 29.533155, chinaNames: ["重庆市"], aliases: ["重庆", "重庆市"] },
  { label: "长春", provinceLabel: "吉林", note: "长春市", lng: 125.3245, lat: 43.886841, chinaNames: ["长春市"], aliases: ["长春", "长春市", "吉林长春"] },
  { label: "大连", provinceLabel: "辽宁", note: "大连市", lng: 121.6147, lat: 38.914, chinaNames: ["大连市"], aliases: ["大连", "大连市"] },
  { label: "成都", provinceLabel: "四川", note: "成都市", lng: 104.065735, lat: 30.659462, chinaNames: ["成都市"], aliases: ["成都", "成都市"] },
  { label: "广州", provinceLabel: "广东", note: "广州市", lng: 113.280637, lat: 23.125178, chinaNames: ["广州市"], aliases: ["广州", "广州市"] },
  { label: "深圳", provinceLabel: "广东", note: "深圳市", lng: 114.085947, lat: 22.547, chinaNames: ["深圳市"], aliases: ["深圳", "深圳市"] },
  { label: "昆明", provinceLabel: "云南", note: "昆明市", lng: 102.712251, lat: 25.040609, chinaNames: ["昆明市"], aliases: ["昆明", "昆明市"] },
  { label: "淄博", provinceLabel: "山东", note: "淄博市", lng: 118.047648, lat: 36.814939, chinaNames: ["淄博市"], aliases: ["淄博", "淄博市"] },
  { label: "青岛", provinceLabel: "山东", note: "青岛市", lng: 120.355173, lat: 36.082982, chinaNames: ["青岛市"], aliases: ["青岛", "青岛市"] },
  { label: "福州", provinceLabel: "福建", note: "福州市", lng: 119.306239, lat: 26.075302, chinaNames: ["福州市"], aliases: ["福州", "福州市"] },
  { label: "烟台", provinceLabel: "山东", note: "烟台市", lng: 121.391382, lat: 37.539297, chinaNames: ["烟台市"], aliases: ["烟台", "烟台市", "山东烟台"] },
  { label: "淮安", provinceLabel: "江苏", note: "淮安市", lng: 119.021265, lat: 33.597506, chinaNames: ["淮安市"], aliases: ["淮安", "淮安市", "江苏淮安"] },
  { label: "连云港", provinceLabel: "江苏", note: "连云港市", lng: 119.178821, lat: 34.600018, chinaNames: ["连云港市"], aliases: ["连云港", "连云港市", "江苏连云港"] },
  { label: "郑州", provinceLabel: "河南", note: "郑州市", lng: 113.665412, lat: 34.757975, chinaNames: ["郑州市"], aliases: ["郑州", "郑州市", "河南郑州"] },
  { label: "漳州", provinceLabel: "福建", note: "漳州市", lng: 117.661801, lat: 24.510897, chinaNames: ["漳州市"], aliases: ["漳州", "漳州市", "福建漳州"] },
  { label: "广西柳州", provinceLabel: "广西", note: "柳州市", lng: 109.4281, lat: 24.3264, chinaNames: ["柳州市"], aliases: ["广西柳州", "柳州", "柳州市"] },
  { label: "秦皇岛", provinceLabel: "河北", note: "秦皇岛市", lng: 119.5996, lat: 39.9354, chinaNames: ["秦皇岛市"], aliases: ["秦皇岛", "秦皇岛市"] },
  { label: "衡阳", provinceLabel: "湖南", note: "衡阳市", lng: 112.5719, lat: 26.8932, chinaNames: ["衡阳市"], aliases: ["衡阳", "衡阳市"] },
  { label: "西安", provinceLabel: "陕西", note: "西安市", lng: 108.9398, lat: 34.3416, chinaNames: ["西安市"], aliases: ["西安", "西安市"] },
  { label: "新加坡", note: "海外市级行政边界", lng: 103.8198, lat: 1.3521, overseasId: "singapore", aliases: ["新加坡", "Singapore"] },
  { label: "波士顿", note: "海外市级行政边界", lng: -71.0589, lat: 42.3601, overseasId: "boston", aliases: ["波士顿", "Boston"] },
  { label: "巴黎", note: "海外市级行政边界", lng: 2.3522, lat: 48.8566, overseasId: "paris", aliases: ["巴黎", "Paris"] },
  { label: "香港", note: "海外行政边界", lng: 114.1694, lat: 22.3193, overseasId: "hong-kong", aliases: ["香港", "香港特别行政区", "Hong Kong"] },
  { label: "悉尼", note: "海外都会区边界", lng: 151.2093, lat: -33.8688, overseasId: "sydney", aliases: ["悉尼", "Sydney"] }
];

const aliasToLabel = new Map();
for (const city of cityCatalog) {
  for (const alias of city.aliases) aliasToLabel.set(normalizeCity(alias), city.label);
}
const provinceAliasToLabel = new Map();
for (const province of provinceCatalog) {
  for (const alias of province.aliases) provinceAliasToLabel.set(normalizeCity(alias), province.label);
}

function normalizeCity(value) {
  return String(value || "").trim().replace(/\s+/g, "").replace(/[，、]/g, "/");
}

function isDualCity(value) {
  const raw = String(value || "").trim();
  const normalized = normalizeCity(raw);
  return normalized.includes("/") || raw.includes("与");
}

function primaryCityOverride(value) {
  const normalized = normalizeCity(value);
  if (normalized === "长春/济南") return "长春";
  if (normalized === "常州/北京") return "北京";
  if (normalized === "泉州/厦门") return "厦门";
  return "";
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
  const provinceBuckets = new Map(provinceCatalog.map((province) => [
    province.label,
    {
      ...province,
      note: province.name,
      count: 0,
      cityCount: 0,
      provinceOnlyCount: 0,
      students: [],
      cities: []
    }
  ]));
  const unrecordedStudents = [];
  const provinceOnlyStudents = [];
  const unmappedStudents = [];
  const excludedDualCityStudents = [];

  for (const record of records) {
    const student = memberRecord(record.registeredName || record.name, record.wechatName);
    const primaryCity = primaryCityOverride(record.city);
    const city = normalizeCity(primaryCity || record.city);
    if (!city) {
      unrecordedStudents.push(student);
      continue;
    }
    if (!primaryCity && isDualCity(record.city)) {
      excludedDualCityStudents.push({ ...student, city: record.city });
      continue;
    }
    const label = aliasToLabel.get(city);
    if (label) {
      const bucket = buckets.get(label);
      bucket.count += 1;
      bucket.students.push(student);
      if (bucket.provinceLabel && provinceBuckets.has(bucket.provinceLabel)) {
        const provinceBucket = provinceBuckets.get(bucket.provinceLabel);
        provinceBucket.count += 1;
        provinceBucket.cityCount += 1;
        provinceBucket.students.push({ ...student, city: bucket.label });
      }
      continue;
    }
    const provinceLabel = provinceAliasToLabel.get(city);
    if (provinceLabel) {
      const provinceBucket = provinceBuckets.get(provinceLabel);
      provinceBucket.count += 1;
      provinceBucket.provinceOnlyCount += 1;
      const provinceStudent = { ...student, city: record.city };
      provinceBucket.students.push(provinceStudent);
      provinceOnlyStudents.push(provinceStudent);
    } else {
      unmappedStudents.push({ ...student, city: record.city });
    }
  }

  const placeRows = [...buckets.values()]
    .filter((row) => row.count > 0)
    .map(({ aliases, ...row }) => row)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-Hans-CN"));
  for (const row of placeRows) {
    if (!row.provinceLabel || !provinceBuckets.has(row.provinceLabel)) continue;
    const provinceBucket = provinceBuckets.get(row.provinceLabel);
    provinceBucket.cities.push({
      label: row.label,
      count: row.count,
      note: row.note,
      students: row.students
    });
  }
  const provinceRows = [...provinceBuckets.values()]
    .filter((row) => row.count > 0)
    .map(({ aliases, ...row }) => ({
      ...row,
      cities: row.cities.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-Hans-CN"))
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-Hans-CN"));
  const cityLocatedMembers = placeRows.reduce((sum, row) => sum + row.count, 0);
  const provinceLocatedMembers = provinceRows.reduce((sum, row) => sum + row.count, 0);

  return {
    updatedAt: new Date().toISOString(),
    totalMembers: records.length,
    locatedMembers: cityLocatedMembers,
    cityLocatedMembers,
    provinceLocatedMembers,
    filledCityRecords: records.filter((record) => normalizeCity(record.city) && !isDualCity(record.city)).length,
    provinceOnlyMembers: provinceOnlyStudents.length,
    unmappedMembers: unmappedStudents.length,
    unrecordedMembers: unrecordedStudents.length,
    excludedDualCityMembers: excludedDualCityStudents.length,
    placeRows,
    provinceRows,
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
