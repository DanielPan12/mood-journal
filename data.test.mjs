import test from 'node:test';
import assert from 'node:assert/strict';
import { MOODS, TAGS, localDay, demoEntries, readState, writeState, parseBackup, makeBackup, summarize, uid } from './data.js';

const KEY = 'inner-weather-v1';
function dateAgo(days, hour = 12) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}
function entry(overrides = {}) {
  return { id: 'e1', createdAt: dateAgo(1), mood: 3, energy: 3, emotions: ['平静'], tags: ['工作'], note: '', kind: 'entry', ...overrides };
}
function session(overrides = {}) {
  return { id: 's1', activityId: 'breathe', title: '呼吸', durationSeconds: 60, minutes: 1, feedback: '轻松一点', at: dateAgo(1), ...overrides };
}
function backup(entries = [entry()], sessions = []) {
  return JSON.stringify({ version: 1, entries, sessions });
}
function storage(initial = null) {
  const values = new Map(initial === null ? [] : [[KEY, initial]]);
  let writes = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { writes++; values.set(key, value); },
    removeItem: key => values.delete(key),
  } });
  return { values, get writes() { return writes; } };
}

test('moods and tags expose the expected ordering', () => {
  assert.deepEqual(MOODS.map(item => item.score), [1, 2, 3, 4, 5]);
  assert.deepEqual(MOODS.map(item => item.label), ['很低落', '有点低落', '还好', '不错', '很开心']);
  assert.equal(TAGS.length, 10);
  assert.notEqual(uid(), uid());
});

test('localDay uses local calendar fields, preserves date-only inputs, rejects invalid days', () => {
  const date = new Date(2025, 3, 8, 23, 59);
  assert.equal(localDay(date), '2025-04-08');
  assert.equal(localDay(date.toISOString()), '2025-04-08');
  assert.equal(localDay('2025-04-08'), '2025-04-08');
  assert.equal(localDay('2025-02-30'), '');
  assert.equal(localDay('not a date'), '');
});

test('daily averages include multiple entries; overall average weights entries, not days', () => {
  const inputs = [entry({ id: 'late', createdAt: dateAgo(1, 20), mood: 5, tags: ['工作', '工作'] }), entry({ id: 'early', createdAt: dateAgo(1, 8), mood: 1 }), entry({ id: 'older', createdAt: dateAgo(2), mood: 5, tags: ['运动'] })];
  const result = summarize(inputs, 7);
  assert.deepEqual(result.entries.map(item => item.id), ['older', 'early', 'late']);
  assert.equal(result.daysCount, 2);
  assert.equal(result.average, 11 / 3);
  assert.deepEqual(result.distribution, [1, 0, 0, 0, 2]);
  assert.deepEqual(result.daily.find(day => day.date === localDay(dateAgo(1))), { date: localDay(dateAgo(1)), average: 3, count: 2 });
  assert.deepEqual(result.tags.find(item => item.tag === '工作'), { tag: '工作', count: 2, average: 3 });
  assert.equal(result.daily.length, 7);
  assert.equal(inputs[0].id, 'late');
});

test('period includes today and previous N-1 local dates, excluding older and tomorrow records', () => {
  const result = summarize([entry({ id: 'inside', createdAt: dateAgo(6, 0) }), entry({ id: 'old', createdAt: dateAgo(7, 23) }), entry({ id: 'today', createdAt: new Date().toISOString() }), entry({ id: 'future', createdAt: dateAgo(-1) })]);
  assert.deepEqual(result.entries.map(item => item.id), ['inside', 'today']);
  assert.equal(result.daily[0].date, localDay(dateAgo(6)));
  assert.equal(result.daily.at(-1).date, localDay());
  const empty = summarize([], 7);
  assert.equal(empty.average, null);
  assert.equal(empty.daysCount, 0);
  assert.ok(empty.daily.every(day => day.average === null && day.count === 0));
});

test('demo data is fresh, spans seven dates, and never writes or leaks into state', () => {
  const saved = storage();
  const demos = demoEntries();
  assert.equal(demos.length, 12);
  assert.equal(new Set(demos.map(item => localDay(item.createdAt))).size, 7);
  assert.ok(demos.every(item => new Date(item.createdAt) <= new Date()));
  assert.equal(parseBackup(backup(demos)).entries.length, 12);
  demos[0].tags.push('外部修改');
  demos[0].note = '外部修改';
  assert.ok(!demoEntries()[0].tags.includes('外部修改'));
  assert.notEqual(demoEntries()[0].note, '外部修改');
  assert.deepEqual(readState(), { entries: [], sessions: [], mode: 'demo', storageError: null });
  assert.equal(saved.writes, 0);
  writeState({ entries: [entry()], sessions: [], mode: 'personal' });
  assert.deepEqual(readState().entries.map(item => item.id), ['e1']);
});

test('backup round-trip sanitizes unknown fields and keeps text as inert string data', () => {
  const text = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  const parsed = parseBackup(backup([entry({ note: text, extra: 'omit', emotions: ['平静', '平静'] })], [session({ extra: true })]));
  assert.equal(parsed.entries[0].note, text);
  assert.equal('extra' in parsed.entries[0], false);
  assert.equal('extra' in parsed.sessions[0], false);
  assert.deepEqual(parsed.entries[0].emotions, ['平静']);
  const exported = JSON.parse(makeBackup({ ...parsed, mode: 'demo', storageError: 'omit' }));
  assert.equal(exported.version, 1);
  assert.ok(Number.isFinite(Date.parse(exported.exportedAt)));
  assert.equal('mode' in exported, false);
  assert.equal('storageError' in exported, false);
  assert.deepEqual(parseBackup(JSON.stringify(exported)), parsed);
});

test('malformed, oversized, future and invalid records are rejected', () => {
  for (const text of ['{', 'null', '[]', '{}', JSON.stringify({ version: 2, entries: [], sessions: [] }), ' '.repeat(5 * 1024 * 1024 + 1)]) {
    assert.throws(() => parseBackup(text));
  }
  for (const change of [
    { mood: 0 }, { mood: 6 }, { mood: '3' }, { energy: 2.5 }, { energy: null },
    { createdAt: new Date(Date.now() + 3600000).toISOString() },
    { createdAt: '2025-02-30T12:00:00.000Z' }, { createdAt: 'yesterday' },
    { tags: Array(21).fill('工作') }, { emotions: [4] }, { emotions: ['x'.repeat(81)] },
    { note: 'x'.repeat(10001) }, { note: {} }, { id: '' }, { kind: 'session' },
  ]) assert.throws(() => parseBackup(backup([entry(change)])), JSON.stringify(change).slice(0, 120));
  assert.throws(() => parseBackup(backup([entry(), entry()])));
  assert.throws(() => parseBackup(backup(Array(10001).fill(entry()))));
  for (const change of [{ durationSeconds: -1 }, { minutes: 1441 }, { feedback: null }, { at: 'bad' }, { title: '' }]) {
    assert.throws(() => parseBackup(backup([], [session(change)])));
  }
});

test('corrupt saved data is reported and remains untouched even after a save attempt', () => {
  for (const raw of ['{bad', JSON.stringify({ entries: [entry({ mood: 9 })], sessions: [], mode: 'personal' })]) {
    const saved = storage(raw);
    const result = readState();
    assert.deepEqual(result.entries, []);
    assert.equal(result.mode, 'personal');
    assert.equal(typeof result.storageError, 'string');
    assert.equal(saved.values.get(KEY), raw);
    assert.throws(() => writeState({ entries: [], sessions: [], mode: 'personal' }), /原始内容/);
    assert.equal(saved.writes, 0);
    assert.equal(saved.values.get(KEY), raw);
  }
});

test('unavailable storage and quota errors are explicit rather than silently successful', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  assert.match(readState().storageError, /无法访问/);
  assert.throws(() => writeState({ entries: [], sessions: [], mode: 'personal' }), /未保存/);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } } });
  assert.throws(() => writeState({ entries: [], sessions: [], mode: 'personal' }), /未保存/);
  storage();
});
