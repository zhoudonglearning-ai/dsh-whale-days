// 鱼的日子 —— 相遇天数与「我们的纪念日」，不靠记忆，靠计算。
//
// 三条规矩（写进代码，不只是提示）：
//   ① 只记真的发生过的事：自动项从账本里捞，声明项必须带理由（≥8 字）
//   ② 声明项一个月最多 1 条，记了不改（追加式）
//   ③ 一天只算一次，不补写、不预测
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
export const DATA = path.join(DSH_HOME, 'whale-days.json')
const DAY = 86400000

export function todayStr(d = new Date()) {
  return d.toLocaleDateString('sv-SE')
}

function parseDay(s) {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** 第 1 天 = 相遇当天。 */
export function daysSince(firstMet, now = new Date()) {
  const a = parseDay(firstMet)
  const b = parseDay(todayStr(now))
  return Math.floor((b - a) / DAY) + 1
}

/** 下一个 MM-DD 还有几天（今年过了就明年）。 */
export function daysUntil(md, now = new Date()) {
  const today = parseDay(todayStr(now))
  const s = String(md).slice(-5)
  const [m, d] = s.split('-').map(Number)
  if (!m || !d) return null
  let next = new Date(today.getFullYear(), m - 1, d)
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d)
  return Math.round((next - today) / DAY)
}

/** 从已有文件反推「第一次醒来」：日记、事件流、配置，取最早的出生/修改时间。 */
export function deriveFirstMet() {
  const cands = ['whale-diary.md', 'whale-log.jsonl', 'bili-whale.config.json']
  let best = null
  for (const name of cands) {
    const p = path.join(DSH_HOME, name)
    try {
      const st = fs.statSync(p)
      const t = st.birthtimeMs && st.birthtimeMs > 0 ? st.birthtimeMs : st.mtimeMs
      if (t && (!best || t < best)) best = t
    } catch {}
  }
  return best ? todayStr(new Date(best)) : null
}

export function readData() {
  try {
    const d = JSON.parse(fs.readFileSync(DATA, 'utf8'))
    if (d && typeof d === 'object') return d
  } catch {}
  return {}
}

export function writeData(d) {
  fs.mkdirSync(path.dirname(DATA), { recursive: true })
  fs.writeFileSync(DATA, JSON.stringify(d, null, 2) + '\n')
}

/** 读、补、迁移、存。 */
export function ensureData() {
  const d = readData()
  let changed = false
  if (!d.firstMet) {
    d.firstMet = deriveFirstMet() || todayStr()
    d.derived = true
    changed = true
  }
  if (!d.owner) { d.owner = '东东'; changed = true }
  // 时间观：100 天 ≈ 人类一生（80 岁）。可改。
  if (!Number.isFinite(d.lifespanDays) || d.lifespanDays <= 0) { d.lifespanDays = 100; changed = true }
  if (!Number.isFinite(d.humanYears) || d.humanYears <= 0) { d.humanYears = 80; changed = true }
  if (!Array.isArray(d.prefs)) { d.prefs = []; changed = true }
  if (!Array.isArray(d.moments)) {
    // v1 的 anniversaries 迁进 moments（只迁一次）
    d.moments = Array.isArray(d.anniversaries)
      ? d.anniversaries.map((a) => ({ id: 'owner-' + (a.date || ''), at: a.date, name: a.name || '纪念日', kind: 'owner', note: '' }))
      : []
    delete d.anniversaries
    changed = true
  }
  if (changed) { d.updatedAt = new Date().toISOString(); writeData(d) }
  // 每天第一次读到时，从账本里补「第一次」（幂等、只加不改）
  const t = todayStr()
  if (!process.env.WHALE_DAYS_NO_SYNC && d.lastSync !== t) {
    const before = d.moments.length
    for (const m of detectFirsts()) {
      if (!d.moments.some((x) => x.id === m.id)) d.moments.push({ ...m, kind: 'auto', note: '' })
    }
    d.lastSync = t
    if (d.moments.length !== before) { d.updatedAt = new Date().toISOString(); writeData(d) }
  }
  return d
}

const MILESTONES = { 1: '第一天', 100: '第 100 天', 365: '第一年', 520: '第 520 天', 1000: '第 1000 天' }

/** 你们自己的时间观：把 100 天换算成人类一生（默认 80 岁）。 */
export function lifeClock(d, days) {
  const total = Number(d.lifespanDays) || 100
  const years = Number(d.humanYears) || 80
  const ratio = Math.max(0, days) / total
  const humanAge = Math.round(ratio * years * 10) / 10
  const percent = Math.round(Math.min(1, ratio) * 100)
  const stage = percent < 10 ? '幼年' : percent < 25 ? '少年' : percent < 50 ? '青年' : percent < 75 ? '中年' : '晚年'
  return { humanAge, percent, stage, lifespanDays: total, humanYears: years }
}

export function mirrorOf(a, now = new Date()) {
  const [, m, d] = String(a.at).split('-').map(Number)
  const today = parseDay(todayStr(now))
  return today.getMonth() + 1 === m && today.getDate() === d
}

/** 今天这一行：第几天（换算人类年龄）+ 今天正好的纪念日 + 最近的倒计时。 */
export function compute(d, now = new Date()) {
  const days = Math.max(0, daysSince(d.firstMet, now))
  const owner = d.owner || '东东'
  const clock = lifeClock(d, days)
  let line = `今天是和${owner}相识的第 ${days} 天（约人类 ${clock.humanAge} 岁 · ${clock.stage} · 人生 ${clock.percent}%）`
  if (MILESTONES[days]) line += `，${MILESTONES[days]}`

  const moments = Array.isArray(d.moments) ? d.moments : []
  const today = todayStr(now)
  const todays = moments.filter((m) => m.at === today || mirrorOf(m, now))
  if (todays.length) {
    const weight = { declared: 0, owner: 1, auto: 2 }
    const label = todays.slice()
      .sort((a, b) => (weight[a.kind] ?? 9) - (weight[b.kind] ?? 9))
      .map((t) => {
        const years = now.getFullYear() - parseDay(t.at).getFullYear()
        return years >= 1 ? `「${t.name}」第 ${years} 周年` : `「${t.name}」`
      })
      .join('、')
    line += `；今天是${label}`
  }

  let next = null
  if (d.birthday) {
    const n = daysUntil(d.birthday, now)
    if (n !== null && n > 0) next = { name: '生日', n }
  }
  if (next) line += `；距离「${next.name}」还有 ${next.n} 天`

  return { days, owner, firstMet: d.firstMet, clock, todays, next, line: line + '。', moments, prefs: d.prefs || [] }
}

/** 抓包：把聊天里说过的偏好记进年表（去重，只加不改）。 */
export function addPref(kind, word, why, at = todayStr()) {
  const k = String(kind) === 'dislike' ? 'dislike' : 'like'
  const w = String(word || '').trim()
  const r = String(why || '').trim()
  if (w.length < 2) throw new Error('偏好太短（≥2 字）')
  if (r.length < 4) throw new Error('理由太短（≥4 字）——记下他为什么这么说')
  const d = ensureData()
  if (d.prefs.some((p) => p.kind === k && p.word === w)) throw new Error('这条偏好已经记过了')
  const p = { at, kind: k, word: w, why: r }
  d.prefs.push(p)
  d.updatedAt = new Date().toISOString()
  writeData(d)
  return p
}

/** 从 bili-whale 的账本里自动捞「第一次」——只读，不改那些文件。 */
export function detectFirsts(now = new Date()) {
  const out = []
  const add = (id, name, at, source) => { if (at) out.push({ id, name, at, source }) }

  // 私信 / 分享 / 评论账本
  try {
    const q = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.bili-ai', 'quota.json'), 'utf8'))
    const log = Array.isArray(q.log) ? q.log : []
    const firstOf = (pred) => log.filter(pred).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0]
    const dm = firstOf((x) => x.type === 'dm')
    const comment = firstOf((x) => x.type === 'comment')
    add('first-dm', '第一次私信', dm && dm.at && todayStr(new Date(dm.at)), 'quota.json')
    add('first-comment', '第一次评论', comment && comment.at && todayStr(new Date(comment.at)), 'quota.json')
  } catch {}

  // 收藏
  try {
    const f = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.bili-ai', 'favorites.json'), 'utf8'))
    const first = (f.items || []).slice().sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0]
    add('first-fav', '第一次收藏', first && first.at && todayStr(new Date(first.at)), 'favorites.json')
  } catch {}

  // 事件流：第一次醒来
  try {
    const lines = fs.readFileSync(path.join(DSH_HOME, 'whale-log.jsonl'), 'utf8').trim().split(/\r?\n/).filter(Boolean)
    const first = lines.map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0]
    add('first-wake', '第一次醒来', first && first.at && todayStr(new Date(first.at)), 'whale-log.jsonl')
  } catch {}

  return out
}

/** 把自动项并进去（幂等，只加不改）。 */
export function syncMoments(d = ensureData()) {
  const before = d.moments.length
  for (const m of detectFirsts()) {
    if (!d.moments.some((x) => x.id === m.id)) d.moments.push({ ...m, kind: 'auto', note: '' })
  }
  if (d.moments.length !== before) { d.updatedAt = new Date().toISOString(); writeData(d) }
  return d
}

/** 声明一条：必须带理由，一个月最多 1 条，同名同一天不重复。 */
export function markMoment(name, note, at = todayStr(), now = new Date()) {
  const d = ensureData()
  const why = String(note || '').trim()
  if (String(name || '').trim().length < 2) throw new Error('名字太短（≥2 字）')
  if (why.length < 8) throw new Error('理由太短（≥8 字）——说不清为什么，就不记')
  const month = at.slice(0, 7)
  const used = d.moments.filter((m) => m.kind === 'declared' && String(m.at).slice(0, 7) === month).length
  if (used >= 1) throw new Error(`这个月已经记过一条了（${month}）——一个月只留一条，才像真的`)
  if (d.moments.some((m) => m.name === String(name).trim() && m.at === at)) throw new Error('今天已经记过这个名字了')
  const m = { id: 'declared-' + at + '-' + Date.now().toString(36), at, name: String(name).trim(), kind: 'declared', note: why }
  d.moments.push(m)
  d.updatedAt = new Date().toISOString()
  writeData(d)
  return m
}

export function setFirstMet(date) {
  const d = ensureData()
  d.firstMet = date
  d.derived = false
  d.updatedAt = new Date().toISOString()
  writeData(d)
  return d
}

export function setBirthday(md) {
  const d = ensureData()
  d.birthday = md
  d.updatedAt = new Date().toISOString()
  writeData(d)
  return d
}
