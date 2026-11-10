#!/usr/bin/env node
// 鱼的日子 · 命令行入口
//
//   node tools/days.mjs                     今天第几天
//   node tools/days.mjs --json              给程序看
//   node tools/days.mjs --list              所有纪念日
//   node tools/days.mjs --report            年表（按时间排的整份日子）
//   node tools/days.mjs --mark "第一次觉得更亲近" --why "他把我的错字改了，还笑"
//   node tools/days.mjs --set-first 2026-11-10
//   node tools/days.mjs --birthday 03-14
import {
  compute, ensureData, setFirstMet, setBirthday, markMoment, addPref,
  todayStr, DSH_HOME, DATA,
} from '../lib/days.js'

const argv = process.argv.slice(2)
const get = (k) => {
  const i = argv.indexOf(k)
  return i >= 0 ? argv[i + 1] : undefined
}
const die = (msg) => { console.error('✗ ' + msg); process.exit(1) }

if (get('--set-first')) {
  const d = setFirstMet(get('--set-first'))
  console.log(`已设相识日：${d.firstMet}`)
}
if (get('--birthday')) {
  const d = setBirthday(get('--birthday'))
  console.log(`已设生日：${d.birthday}`)
}

const data = ensureData()

if (get('--mark')) {
  const name = get('--mark')
  const why = get('--why')
  const at = get('--date') || todayStr()
  try {
    const m = markMoment(name, why, at)
    console.log(`✓ 记下了：${m.at}「${m.name}」—— ${m.note}`)
  } catch (e) {
    die(e.message)
  }
}

if (get('--pref')) {
  const kind = get('--pref')
  const word = get('--word')
  const why = get('--why')
  try {
    const p = addPref(kind, word, why)
    console.log(`✓ 记下偏好：${p.kind === 'like' ? '喜欢' : '不喜欢'}「${p.word}」—— ${p.why}`)
  } catch (e) {
    die(e.message)
  }
}

if (argv.includes('--prefs')) {
  if (!data.prefs.length) console.log('（还没有偏好记录）')
  for (const p of data.prefs) console.log(`${p.at}  ${p.kind === 'like' ? '喜欢' : '不喜欢'}「${p.word}」—— ${p.why}`)
  process.exit(0)
}

if (argv.includes('--list')) {
  const ms = data.moments.slice().sort((a, b) => String(a.at).localeCompare(String(b.at)))
  if (!ms.length) console.log('（还没有纪念日）')
  for (const m of ms) {
    const tag = m.kind === 'auto' ? '自动' : m.kind === 'declared' ? '她记的' : '你设的'
    console.log(`${m.at}  ${m.name}  [${tag}]${m.note ? '  —— ' + m.note : ''}`)
  }
  process.exit(0)
}

if (argv.includes('--report')) {
  const ms = data.moments.slice().sort((a, b) => String(a.at).localeCompare(String(b.at)))
  const first = data.firstMet
  console.log(`═══ 我们的年表 · 从 ${first} 开始 ═══\n`)
  for (const m of ms) {
    console.log(`  第 ${String(compute({ firstMet: first, owner: data.owner, moments: [] }, new Date(m.at + 'T12:00:00')).days).padStart(3)} 天   ${m.at}   ${m.name}${m.note ? ' —— ' + m.note : ''}`)
  }
  if (!ms.length) console.log('  （还没有）')
  console.log(`\n今天：${compute(data).line}`)
  process.exit(0)
}

const r = compute(data)
if (argv.includes('--json')) {
  console.log(JSON.stringify({ ...r, data, file: DATA, dshHome: DSH_HOME }, null, 2))
} else {
  console.log(r.line)
  console.log(`（数据：${DATA}）`)
}
