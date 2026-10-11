import { localDay } from './data.js';

const CARE_IDS = new Set(['breathe', 'music', 'grounding', 'stretch']);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isScore = value => Number.isInteger(value) && value >= 1 && value <= 5;
const isText = value => typeof value === 'string' && value.trim().length > 0;

function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  if (!localDay(value.slice(0, 10))) return null;
  if (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

const average = days => days.length ? days.reduce((sum, day) => sum + day.total / day.count, 0) / days.length : null;

/** Descriptive day-level associations only; a difference does not establish a cause. */
export function compareFactors(entries, days = 30, now = new Date()) {
  if (!Array.isArray(entries)) return [];
  if (!(now instanceof Date) && typeof now !== 'string' && typeof now !== 'number') return [];
  const end = new Date(now);
  if (!Number.isFinite(end.getTime())) return [];
  const requested = typeof days === 'number' || typeof days === 'string' ? Number(days) : NaN;
  const length = Number.isFinite(requested) && requested > 0 ? Math.max(1, Math.min(366, Math.floor(requested))) : 30;
  const start = new Date(end);
  start.setDate(start.getDate() - length + 1);
  const firstDay = localDay(start);
  const lastDay = localDay(end);
  const grouped = new Map();
  const selected = entries.filter(item => isObject(item) && isText(item.id) && isScore(item.mood) && timestamp(item.createdAt) !== null)
    .slice().sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));

  for (const item of selected) {
    const date = localDay(item.createdAt);
    if (date < firstDay || date > lastDay) continue;
    const day = grouped.get(date) ?? { date, total: 0, count: 0, tags: new Set(), ids: [] };
    day.total += item.mood;
    day.count += 1;
    day.ids.push(item.id);
    for (const tag of Array.isArray(item.tags) ? item.tags : []) {
      if (isText(tag)) day.tags.add(tag);
    }
    grouped.set(date, day);
  }

  const recordedDays = [...grouped.values()];
  const tags = new Set(recordedDays.flatMap(day => [...day.tags]));
  return [...tags].map(tag => {
    const withDays = recordedDays.filter(day => day.tags.has(tag));
    const withoutDays = recordedDays.filter(day => !day.tags.has(tag));
    const withAverage = average(withDays);
    const withoutAverage = average(withoutDays);
    return {
      tag,
      withCount: withDays.length,
      withoutCount: withoutDays.length,
      withAverage,
      withoutAverage,
      delta: withAverage === null || withoutAverage === null ? null : withAverage - withoutAverage,
      reliable: withDays.length >= 3 && withoutDays.length >= 3,
      withIds: withDays.flatMap(day => day.ids),
      withoutIds: withoutDays.flatMap(day => day.ids),
    };
  }).sort((a, b) => Number(b.reliable) - Number(a.reliable)
    || Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0)
    || b.withCount - a.withCount
    || a.tag.localeCompare(b.tag, 'zh-CN'));
}

/** Only completed attempts of at least 15 seconds contribute to self-reported history. */
export function careHistory(sessions) {
  if (!Array.isArray(sessions)) return [];
  const grouped = new Map();
  for (const item of sessions) {
    if (!isObject(item) || !isText(item.activityId) || !isText(item.title)
      || typeof item.durationSeconds !== 'number' || !Number.isFinite(item.durationSeconds)
      || item.durationSeconds < 15 || item.durationSeconds > 86400 || timestamp(item.at) === null
      || typeof item.feedback !== 'string') continue;
    const previous = grouped.get(item.activityId);
    const row = previous ?? { activityId: item.activityId, title: item.title, count: 0, helpful: 0, helpfulRate: 0, lastAt: item.at, seconds: 0 };
    row.count += 1;
    row.helpful += Number(item.feedback === '轻松一些');
    row.helpfulRate = row.helpful / row.count;
    row.seconds += item.durationSeconds;
    if (Date.parse(item.at) > Date.parse(row.lastAt)) {
      row.lastAt = item.at;
      row.title = item.title;
    }
    grouped.set(item.activityId, row);
  }
  return [...grouped.values()].sort((a, b) => b.helpfulRate - a.helpfulRate || b.count - a.count || a.activityId.localeCompare(b.activityId));
}

export function chooseCare(entry, sessions = []) {
  const remembered = careHistory(sessions).find(item => CARE_IDS.has(item.activityId)
    && item.count >= 2 && item.helpfulRate >= 0.5 && item.helpful > 0);
  if (remembered) {
    return {
      id: remembered.activityId,
      reason: `你做过 ${remembered.count} 次「${remembered.title}」，其中 ${remembered.helpful} 次选择了“轻松一些”。这次要不要再试试？`,
      basis: 'history',
    };
  }
  if (isObject(entry)) {
    if (isScore(entry.energy) && entry.energy <= 2) {
      return { id: 'music', reason: `最近一次记录里，你的精力是 ${entry.energy}/5。这个练习只需要坐着听。`, basis: 'context' };
    }
    if (isScore(entry.mood) && entry.mood <= 2 && isScore(entry.energy) && entry.energy >= 4) {
      return { id: 'grounding', reason: `最近一次心情是 ${entry.mood}/5，精力是 ${entry.energy}/5。先用眼睛和耳朵找回注意力。`, basis: 'context' };
    }
    if (Array.isArray(entry.tags) && entry.tags.some(tag => tag === '工作' || tag === '学习')) {
      return { id: 'stretch', reason: '最近的记录提到了工作或学习。可以离开屏幕，活动一下肩膀。', basis: 'context' };
    }
    if (isScore(entry.mood) && entry.mood >= 4) {
      return { id: 'breathe', reason: '不需要等心情不好才休息。用一分钟，留意自己的呼吸。', basis: 'context' };
    }
  }
  return { id: 'breathe', reason: '不需要准备，也不用开声音。一分钟就能结束。', basis: 'default' };
}
