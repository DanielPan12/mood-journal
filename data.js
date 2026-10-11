const STORAGE_KEY = 'inner-weather-v1';
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_RECORDS = 10000;
const FUTURE_TOLERANCE = 5 * 60 * 1000;

export const MOODS = Object.freeze([
  { score: 1, label: '很低落', color: '#B9ADCF', face: '😔' },
  { score: 2, label: '有点低落', color: '#9FAFBC', face: '🙁' },
  { score: 3, label: '还好', color: '#A5B9A0', face: '😐' },
  { score: 4, label: '不错', color: '#E8C978', face: '🙂' },
  { score: 5, label: '很开心', color: '#E6A88F', face: '😊' },
].map(Object.freeze));

export const TAGS = Object.freeze(['工作', '学习', '人际', '家庭', '睡眠', '运动', '独处', '户外', '饮食', '兴趣']);

export function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `entry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Calendar dates deliberately use the device's local timezone. */
export function localDay(dateOrString = new Date()) {
  if (typeof dateOrString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOrString)) {
    const [year, month, day] = dateOrString.split('-').map(Number);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(12, 0, 0, 0);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? dateOrString : '';
  }
  const date = new Date(dateOrString);
  if (!Number.isFinite(date.getTime())) return '';
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function demoEntries() {
  const examples = [
    [6, 9, 3, 3, ['平静'], ['工作'], '把今天要做的事写下来，心里清楚了一点。'],
    [6, 20, 4, 3, ['轻松', '满足'], ['户外', '运动'], '晚饭后走了一小段路，风很舒服。'],
    [5, 19, 2, 2, ['疲惫'], ['工作', '睡眠'], '事情有些多，今天想早点休息。'],
    [4, 10, 3, 3, ['平静'], ['独处'], '给自己留了一点安静的时间。'],
    [4, 20, 4, 4, ['开心'], ['人际', '饮食'], '和朋友吃饭，聊了好多小事。'],
    [3, 18, 5, 4, ['期待', '满足'], ['兴趣', '学习'], '终于完成了一个喜欢的小作品。'],
    [2, 9, 3, 2, ['疲惫'], ['睡眠'], '昨晚没睡好，今天慢一点也可以。'],
    [2, 19, 4, 3, ['轻松'], ['运动', '户外'], '傍晚出门走走，注意到路边开了花。'],
    [1, 10, 2, 2, ['烦躁'], ['工作'], '计划被打乱了，有点不知从哪里开始。'],
    [1, 20, 3, 3, ['平静'], ['家庭', '独处'], '和家人聊了会儿，整理了一下房间。'],
    [0, 9, 3, 3, ['平静'], ['饮食'], '好好吃了一顿饭，给自己一点时间。'],
    [0, 18, 4, 4, ['期待', '轻松'], ['兴趣'], '今天也发现了一件值得记下的小事。'],
  ];
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  return examples.map(([ago, hour, mood, energy, emotions, tags, note], index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - ago);
    date.setHours(hour, 10, 0, 0);
    if (ago === 0) date.setTime(todayStart.getTime() + (now - todayStart) * (hour === 9 ? 0.35 : 0.8));
    return { id: `demo-${index + 1}`, createdAt: date.toISOString(), mood, energy, emotions: [...emotions], tags: [...tags], note, kind: 'entry' };
  });
}

function invalid(message) {
  throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function string(value, name, max, allowEmpty = false) {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) invalid(`${name}格式不正确或内容过长。`);
  return value;
}

function strings(value, name) {
  if (!Array.isArray(value) || value.length > 20) invalid(`${name}必须是最多 20 项的列表。`);
  return [...new Set(value.map(item => string(item, name, 80)))];
}

function score(value, name) {
  if (!Number.isInteger(value) || value < 1 || value > 5) invalid(`${name}必须是 1 到 5 的整数。`);
  return value;
}

function timestamp(value, name) {
  string(value, name, 50);
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/);
  const date = new Date(value);
  if (!parts || !Number.isFinite(date.getTime())) invalid(`${name}不是有效的时间。`);
  const [, year, month, day, hour, minute, second] = parts.map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59) invalid(`${name}不是有效的时间。`);
  if (date.getTime() > Date.now() + FUTURE_TOLERANCE) invalid(`${name}不能是未来的时间。`);
  return date.toISOString();
}

function entry(value) {
  if (!isObject(value) || value.kind !== 'entry') invalid('心情记录格式不正确。');
  return {
    id: string(value.id, '记录编号', 200),
    createdAt: timestamp(value.createdAt, '记录时间'),
    mood: score(value.mood, '心情分值'),
    energy: score(value.energy, '能量分值'),
    emotions: strings(value.emotions, '感受'),
    tags: strings(value.tags, '标签'),
    note: string(value.note, '文字记录', 10000, true),
    kind: 'entry',
  };
}

function boundedNumber(value, name, maximum) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > maximum) invalid(`${name}超出有效范围。`);
  return value;
}

function session(value) {
  if (!isObject(value)) invalid('照顾自己记录格式不正确。');
  return {
    id: string(value.id, '记录编号', 200),
    activityId: string(value.activityId, '活动编号', 120),
    title: string(value.title, '活动名称', 160),
    durationSeconds: boundedNumber(value.durationSeconds, '活动时长', 86400),
    minutes: boundedNumber(value.minutes, '活动分钟数', 1440),
    feedback: string(value.feedback, '活动反馈', 200, true),
    at: timestamp(value.at, '活动时间'),
  };
}

function records(values, name, validate) {
  if (!Array.isArray(values) || values.length > MAX_RECORDS) invalid(`${name}必须是最多 ${MAX_RECORDS} 条的列表。`);
  const ids = new Set();
  return values.map(value => {
    const result = validate(value);
    if (ids.has(result.id)) invalid(`${name}包含重复的记录编号。`);
    ids.add(result.id);
    return result;
  });
}

function validatePayload(value) {
  if (!isObject(value) || (value.version !== undefined && value.version !== 1)) invalid('不支持此备份格式，请选择本应用导出的备份。');
  return { entries: records(value.entries, '心情记录', entry), sessions: records(value.sessions, '照顾自己记录', session) };
}

function parseJSON(text) {
  if (typeof text !== 'string' || text.length > MAX_BYTES || new TextEncoder().encode(text).byteLength > MAX_BYTES) invalid('备份文件不能超过 5 MB。');
  try {
    return JSON.parse(text);
  } catch {
    invalid('文件不是有效的 JSON 备份。');
  }
}

export function parseBackup(text) {
  return validatePayload(parseJSON(text));
}

export function makeBackup(state) {
  const clean = validatePayload(state);
  const result = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...clean }, null, 2);
  if (new TextEncoder().encode(result).byteLength > MAX_BYTES) invalid('记录超过 5 MB，请减少记录后再导出。');
  return result;
}

function storedPayload(raw) {
  const value = parseJSON(raw);
  const clean = validatePayload(value);
  if (value.mode !== 'demo' && value.mode !== 'personal') invalid('保存的数据模式不正确。');
  return { ...clean, mode: value.mode };
}

export function readState() {
  const empty = { entries: [], sessions: [], mode: 'demo', storageError: null };
  let raw;
  try {
    raw = globalThis.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { ...empty, storageError: '无法访问本地存储，当前更改无法保存。请检查浏览器的存储设置。' };
  }
  if (raw === null) return empty;
  try {
    return { ...storedPayload(raw), storageError: null };
  } catch {
    return { ...empty, mode: 'personal', storageError: '本地数据无法读取，原始内容已保留。请先保留原始数据，再通过备份恢复或清除本地数据。' };
  }
}

export function writeState({ entries, sessions, mode }) {
  const clean = validatePayload({ entries, sessions });
  if (mode !== 'demo' && mode !== 'personal') invalid('请选择有效的数据模式。');
  const raw = JSON.stringify({ version: 1, ...clean, mode });
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) invalid('记录超过 5 MB，无法保存。请先导出备份。');
  let existing;
  try {
    existing = globalThis.localStorage.getItem(STORAGE_KEY);
  } catch {
    invalid('无法访问本地存储，本次更改未保存。请检查浏览器的存储设置。');
  }
  if (existing !== null) {
    try {
      storedPayload(existing);
    } catch {
      invalid('本地已有无法读取的数据，为保留原始内容，本次更改未保存。请先保留原始数据，再清除本地数据。');
    }
  }
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    invalid('保存失败，浏览器存储不可用或空间不足。本次更改未保存，请导出备份。');
  }
}

export function summarize(entries, days = 7) {
  const length = Math.max(1, Math.min(366, Math.floor(Number(days) || 7)));
  const now = new Date();
  const daily = Array.from({ length }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (length - index - 1));
    return { date: localDay(date), average: null, count: 0 };
  });
  const dates = new Map(daily.map(day => [day.date, day]));
  const selected = (Array.isArray(entries) ? entries : []).filter(item =>
    isObject(item) && typeof item.createdAt === 'string' && Number.isInteger(item.mood) && item.mood >= 1 && item.mood <= 5 && dates.has(localDay(item.createdAt))
  ).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const distribution = [0, 0, 0, 0, 0];
  const tagCounts = new Map();
  let total = 0;
  for (const item of selected) {
    const day = dates.get(localDay(item.createdAt));
    day.average = ((day.average ?? 0) * day.count + item.mood) / (day.count + 1);
    day.count += 1;
    distribution[item.mood - 1] += 1;
    total += item.mood;
    for (const tag of new Set(Array.isArray(item.tags) ? item.tags.filter(tag => typeof tag === 'string') : [])) {
      const count = tagCounts.get(tag) ?? { tag, count: 0, average: 0 };
      count.average = (count.average * count.count + item.mood) / (count.count + 1);
      count.count += 1;
      tagCounts.set(tag, count);
    }
  }
  const daysCount = daily.filter(day => day.count > 0).length;
  const tags = [...tagCounts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
  return {
    entries: selected,
    daysCount,
    average: selected.length ? total / selected.length : null,
    distribution,
    daily,
    tags,
    note: selected.length ? `近 ${length} 天记录了 ${selected.length} 次心情，覆盖 ${daysCount} 天。` : `近 ${length} 天还没有记录，随时可以从此刻开始。`,
  };
}
