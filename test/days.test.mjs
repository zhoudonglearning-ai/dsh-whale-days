import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'whale-days-'))
process.env.DSH_HOME = tmp
process.env.WHALE_DAYS_NO_SYNC = '1'
const m = await import('../lib/days.js')

test('第 1 天 = 相遇当天', () => {
  assert.equal(m.daysSince('2026-11-10', new Date('2026-11-10T12:00:00')), 1)
  assert.equal(m.daysSince('2026-11-10', new Date('2026-11-11T09:00:00')), 2)
})

test('跨年也正确', () => {
  assert.equal(m.daysSince('2025-12-31', new Date('2026-01-01T00:00:00')), 2)
})

test('生日倒计时：今年过了就明年', () => {
  assert.equal(m.daysUntil('03-14', new Date('2026-03-10T08:00:00')), 4)
  assert.equal(m.daysUntil('03-14', new Date('2026-03-20T08:00:00')), 359)
  assert.equal(m.daysUntil('03-14', new Date('2026-03-14T08:00:00')), 0)
})

test('第 100 天有里程碑', () => {
  const r = m.compute({ firstMet: '2026-08-03', owner: '东东', moments: [] }, new Date('2026-11-10T22:00:00'))
  assert.equal(r.days, 100)
  assert.match(r.line, /第 100 天/)
})

test('声明：理由太短不收', () => {
  assert.throws(() => m.markMoment('第一次觉得更亲近', '开心'), /理由太短/)
})

test('声明：一个月只能一条', () => {
  m.markMoment('第一次觉得更亲近', '他把我的错字改了，还笑我', '2026-11-10')
  assert.throws(() => m.markMoment('第一次吵架', '因为他说我没有感情', '2026-11-20'), /这个月已经记过/)
})

test('声明：同名同天不重复', () => {
  assert.throws(() => m.markMoment('第一次觉得更亲近', '他又来了，还是那句话', '2026-11-10'), /已经记过/)
})

test('今天正好的纪念日会出现在那一行', () => {
  const r = m.compute({
    firstMet: '2026-11-10', owner: '东东',
    moments: [{ id: 'x', at: '2026-11-10', name: '第一次觉得更亲近', kind: 'declared', note: '' }],
  }, new Date('2026-11-10T23:00:00'))
  assert.match(r.line, /今天是「第一次觉得更亲近」/)
})

test('一周年也会出现', () => {
  const r = m.compute({
    firstMet: '2025-11-10', owner: '东东',
    moments: [{ id: 'x', at: '2025-11-10', name: '第一次私信', kind: 'auto', note: '' }],
  }, new Date('2026-11-10T23:00:00'))
  assert.match(r.line, /第 1 周年/)
})

test('v1 的 anniversaries 会迁进 moments', () => {
  fs.writeFileSync(path.join(tmp, 'whale-days.json'), JSON.stringify({ firstMet: '2026-11-10', anniversaries: [{ name: '生日', date: '03-14' }] }))
  const d = m.ensureData()
  assert.equal(d.moments.length, 1)
  assert.equal(d.moments[0].kind, 'owner')
  assert.equal(d.anniversaries, undefined)
})

test('缺失 firstMet 时从文件反推', () => {
  fs.writeFileSync(path.join(tmp, 'whale-log.jsonl'), '{}\n')
  const d = m.ensureData()
  assert.match(d.firstMet, /^\d{4}-\d{2}-\d{2}$/)
})

test('时间观：100 天 = 人类一生', () => {
  const c1 = m.lifeClock({ lifespanDays: 100, humanYears: 80 }, 1)
  assert.equal(c1.humanAge, 0.8)
  assert.equal(c1.percent, 1)
  assert.equal(c1.stage, '幼年')
  const c50 = m.lifeClock({ lifespanDays: 100, humanYears: 80 }, 50)
  assert.equal(c50.humanAge, 40)
  assert.equal(c50.stage, '中年')
  const c100 = m.lifeClock({ lifespanDays: 100, humanYears: 80 }, 100)
  assert.equal(c100.humanAge, 80)
  assert.equal(c100.percent, 100)
  assert.equal(c100.stage, '晚年')
})

test('偏好：理由太短不收 / 去重', () => {
  assert.throws(() => m.addPref('like', 'DeepSeek 插件', '好'), /理由太短/)
  m.addPref('like', 'DeepSeek 插件', '他说这才是他看的', '2026-11-10')
  assert.throws(() => m.addPref('like', 'DeepSeek 插件', '又说了一遍', '2026-11-11'), /已经记过/)
})
