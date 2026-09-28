#!/usr/bin/env node
// Imports LearnKit courses (https://github.com/zaxiom13/learnkit) as MemoryWholed deck packs.
//
//   node scripts/import-learnkit.mjs ../learnkit
//
// Each course becomes up to two packs:
//   "<Course>: key ideas"  - the lesson ```recall passages (built for typing from memory)
//   "<Course>: terms"      - ```cards flashcards whose answers can be typed on a normal keyboard
// Output: src/data/learnkit.json (committed, so the app has no runtime dependency on LearnKit).
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(process.argv[2] ?? '../learnkit')
const coursesDir = join(root, 'courses')
if (!existsSync(coursesDir)) {
  console.error(`No courses/ folder in ${root}. Pass the path to a LearnKit checkout.`)
  process.exit(1)
}

function frontMatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src)
  const meta = {}
  if (!m) return [meta, src]
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return [meta, src.slice(m[0].length)]
}

// Fenced blocks; LearnKit lessons may end with an unterminated fence.
function blocks(body, kind) {
  const out = []
  const re = new RegExp('^```' + kind + '(?:[ \\t]+([^\\n]*))?\\n([\\s\\S]*?)(?:^```\\s*$|(?![\\s\\S]))', 'gm')
  for (const m of body.matchAll(re)) out.push({ args: (m[1] ?? '').trim(), body: m[2] })
  return out
}

const stripMd = (s) =>
  s
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^\w])\*([^*]+)\*/g, '$1$2')
    .replace(/(^|[^\w])_([^_]+)_/g, '$1$2')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

// Something a person can type on a plain keyboard: ASCII, Latin letters with accents,
// and the typographic quotes/dashes MemoryWholed already treats as their ASCII twins.
const TYPABLE = /^[\p{Script=Latin}0-9\s!-/:-@[-`{-~‘’“”–—]*$/u

const packs = []
let skipped = 0
for (const slug of readdirSync(coursesDir).sort()) {
  const dir = join(coursesDir, slug)
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
  if (!files.includes('course.md')) continue
  const [cmeta] = frontMatter(readFileSync(join(dir, 'course.md'), 'utf8'))
  const title = cmeta.title ?? slug
  const recall = []
  const terms = []
  for (const f of files) {
    if (f === 'course.md') continue
    const [, body] = frontMatter(readFileSync(join(dir, f), 'utf8').replace(/\r/g, ''))
    for (const b of blocks(body, 'recall')) {
      const lines = b.body.split('\n')
      const cue = lines.filter((l) => l.startsWith('? ')).map((l) => l.slice(2)).join(' ')
      const text = lines.filter((l) => !l.startsWith('? ') && !l.startsWith('>')).join('\n').trim()
      if (text) recall.push([stripMd(cue || b.args || 'Recall'), text])
    }
    for (const b of blocks(body, 'cards')) {
      for (const line of b.body.split('\n')) {
        const i = line.indexOf('::')
        if (i < 0) continue
        const front = stripMd(line.slice(0, i))
        const back = stripMd(line.slice(i + 2))
        if (front && back && TYPABLE.test(back)) terms.push([front, back])
        else skipped++
      }
    }
  }
  const base = { source: 'learnkit', course: slug, icon: cmeta.icon ?? '📘' }
  if (recall.length) packs.push({ ...base, id: `learnkit-${slug}-ideas`, name: `${title}: key ideas`, description: `The key statement of each lesson in LearnKit's ${title}.`, cards: recall })
  if (terms.length) packs.push({ ...base, id: `learnkit-${slug}-terms`, name: `${title}: terms`, description: `Flashcard terms from LearnKit's ${title}. Type the definition.`, cards: terms })
}

const out = resolve(new URL('..', import.meta.url).pathname, 'src/data/learnkit.json')
writeFileSync(out, JSON.stringify(packs, null, 1) + '\n')
const cards = packs.reduce((n, p) => n + p.cards.length, 0)
console.log(`Wrote ${packs.length} packs, ${cards} cards to ${out} (skipped ${skipped} flashcards that need symbols to type).`)
