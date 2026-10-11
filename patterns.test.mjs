import test from 'node:test';
import assert from 'node:assert/strict';
import { compareFactors, careHistory, chooseCare } from './patterns.js';

// Local constructors exercise the same calendar boundaries regardless of the test runner timezone.
const now = new Date(2026, 9, 11, 12);
const at = (day, hour = 12) => new Date(2026, 9, day, hour).toISOString();
const entry = (id, day, mood, tags = [], hour = 12) => ({ id, createdAt: at(day, hour), mood, energy: 3, emotions: [], tags, note: '' });
const session = (id, activityId = 'music', feedback = '轻松一些', overrides = {}) => ({
  id, activityId, title: activityId, durationSeconds: 60, minutes: 1, feedback, at: at(10), ...overrides,
});
const factor = (entries, tag, days = 30) => compareFactors(entries, days, now).find(row => row.tag === tag);

test('factor averages weight recorded days equally, with any tagged entry tagging its whole day', () => {
  const entries = [entry('b', 10, 5, ['运动'], 20), entry('a', 10, 1, [], 8), entry('c', 11, 5, ['运动']), entry('d', 9, 2)];
  const result = factor(entries, '运动');
  assert.equal(result.withCount, 2);
  assert.equal(result.withoutCount, 1);
  assert.equal(result.withAverage, 4); // mean(mean(1, 5), 5), not mean(1, 5, 5)
  assert.equal(result.withoutAverage, 2);
  assert.equal(result.delta, 2);
  assert.deepEqual(result.withIds, ['a', 'b', 'c']);
  assert.deepEqual(result.withoutIds, ['d']);
});

test('three recorded days in each group are required regardless of the number of entries', () => {
  const entries = [entry('a', 6, 4, ['运动']), entry('b', 7, 4, ['运动']), entry('c', 8, 4, ['运动']), entry('d', 9, 2), entry('e', 10, 2), entry('f', 11, 2)];
  assert.equal(factor(entries, '运动').reliable, true);
  assert.equal(factor([...entries.slice(0, 5), entry('e2', 10, 2)], '运动').reliable, false);
  assert.equal(factor(Array.from({ length: 20 }, (_, index) => entry(String(index), 11, 4, ['运动'])), '运动').reliable, false);
});

test('the inclusive period uses local dates and excludes missing days, older and future dates', () => {
  const entries = [entry('old', 8, 1, ['旧标签'], 23), entry('first', 9, 3, ['运动'], 0), entry('last', 11, 5, [], 23), entry('future', 12, 1, ['未来标签'], 0)];
  assert.deepEqual(compareFactors(entries, 3, now), [{ tag: '运动', withCount: 1, withoutCount: 1, withAverage: 3, withoutAverage: 5, delta: -2, reliable: false, withIds: ['first'], withoutIds: ['last'] }]);
  assert.deepEqual(compareFactors(entries, 1, now), []);
  assert.equal(factor([entry('start30', -18, 3, ['边界']), entry('old31', -19, 1, ['过期'])], '边界').withCount, 1);
  assert.deepEqual(compareFactors([entry('old31', -19, 1, ['过期'])], 30, now), []);
});

test('empty comparison groups have null means and difference; duplicate tags count once', () => {
  const result = factor([entry('a', 11, 4, ['运动', '运动'])], '运动');
  assert.equal(result.withCount, 1);
  assert.equal(result.withoutAverage, null);
  assert.equal(result.delta, null);
  assert.deepEqual(result.withoutIds, []);
});

test('factors sort by sample threshold, absolute difference, then tagged day count', () => {
  const entries = Array.from({ length: 6 }, (_, index) => entry(String(index), index + 6, index < 3 ? 4 : 2, index < 3 ? ['稳定'] : []));
  entries[0].tags.push('少样本');
  entries[0].mood = 5;
  assert.equal(compareFactors(entries, 30, now)[0].tag, '稳定');
  const sorted = compareFactors([entry('a', 8, 5, ['强', '多']), entry('b', 9, 4, ['多']), entry('c', 10, 3, ['弱']), entry('d', 11, 2)], 30, now);
  assert.equal(sorted[0].tag, '多');
  assert.equal(sorted[1].tag, '强');
  assert.equal(sorted[2].tag, '弱');
});

test('invalid entries and parameters are harmless, and analytics do not mutate input', () => {
  const valid = entry('ok', 11, 4, ['运动', '', null]);
  const entries = [null, [], {}, { ...valid, id: '' }, { ...valid, mood: 6 }, { ...valid, mood: '4' }, { ...valid, createdAt: 'bad' }, { ...valid, createdAt: '2026-02-30T12:00:00Z' }, { ...valid, createdAt: '2026-10-10T24:00:00Z' }, valid];
  const snapshot = structuredClone(entries);
  assert.deepEqual(factor(entries, '运动').withIds, ['ok']);
  assert.deepEqual(entries, snapshot);
  assert.deepEqual(compareFactors(null), []);
  assert.deepEqual(compareFactors(entries, 30, new Date('bad')), []);
  assert.deepEqual(compareFactors(entries, 30, null), []);
  assert.equal(compareFactors(entries, NaN, now).length, 1);
});

test('care history counts completed attempts, exact positive feedback, seconds and most recent title', () => {
  const sessions = [session('a', 'music'), session('b', 'music', '没什么变化', { durationSeconds: 15, at: at(11), title: '新的音乐名称' }), session('c', 'music', ''), session('short', 'music', '轻松一些', { durationSeconds: 14 }), session('cancel', 'music', '轻松一些', { durationSeconds: 0 }), session('different', 'breathe', '轻松一点')];
  const before = structuredClone(sessions);
  const result = careHistory(sessions);
  assert.deepEqual(result[0], { activityId: 'music', title: '新的音乐名称', count: 3, helpful: 1, helpfulRate: 1 / 3, lastAt: at(11), seconds: 135 });
  assert.equal(result[1].helpfulRate, 0);
  assert.deepEqual(sessions, before);
});

test('care history sorts by helpful rate then completed attempt count and ignores invalid data', () => {
  const sessions = [session('a', 'music'), session('b', 'music'), session('c', 'stretch'), session('d', 'breathe', '没有变化'), null, {}, session('bad', 'grounding', null), session('infinite', 'grounding', '轻松一些', { durationSeconds: Infinity }), session('bad-date', 'grounding', '轻松一些', { at: 'bad' }), session('rollover', 'grounding', '轻松一些', { at: '2026-02-30T12:00:00Z' })];
  assert.deepEqual(careHistory(sessions).map(item => item.activityId), ['music', 'stretch', 'breathe']);
  assert.deepEqual(careHistory(null), []);
});

test('positive history can change the context recommendation, with sample counts and reported feedback', () => {
  const sessions = [session('a', 'stretch'), session('b', 'stretch', '没什么变化')];
  const result = chooseCare({ mood: 2, energy: 1 }, sessions);
  assert.equal(result.id, 'stretch');
  assert.equal(result.basis, 'history');
  assert.match(result.reason, /2 次/);
  assert.match(result.reason, /1 次选择了“轻松一些”/);
});

test('neutral, single, short, canceled or unknown history does not override context', () => {
  const lowEnergy = { mood: 2, energy: 1, tags: ['工作'] };
  for (const sessions of [
    [session('a', 'stretch')],
    [session('a', 'stretch', '没什么变化'), session('b', 'stretch', '')],
    [session('a', 'stretch'), session('b', 'stretch', '没什么变化'), session('c', 'stretch', '')],
    [session('a', 'stretch', '轻松一些', { durationSeconds: 0 }), session('b', 'stretch', '轻松一些', { durationSeconds: 14 })],
    [session('a', 'unknown'), session('b', 'unknown')],
  ]) {
    assert.equal(chooseCare(lowEnergy, sessions).id, 'music');
    assert.equal(chooseCare(lowEnergy, sessions).basis, 'context');
  }
});

test('context priorities and default remain safe with incomplete or invalid entries', () => {
  assert.equal(chooseCare({ mood: 1, energy: 4, tags: ['工作'] }).id, 'grounding');
  assert.equal(chooseCare({ mood: 3, energy: 3, tags: ['学习'] }).id, 'stretch');
  assert.equal(chooseCare({ mood: 5, energy: 3 }).id, 'breathe');
  assert.equal(chooseCare({ mood: 5, energy: 3 }).basis, 'context');
  for (const entry of [null, undefined, {}, [], { energy: -1, mood: '1', tags: '工作' }]) {
    assert.deepEqual(chooseCare(entry, null), { id: 'breathe', reason: '不需要准备，也不用开声音。一分钟就能结束。', basis: 'default' });
  }
});
