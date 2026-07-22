// Character description generator for bot avatars.
// Generates diverse, believable descriptions that don't reveal archetype.
// Run: npx tsx scripts/generate-avatar-prompts.ts

const FEMALE_NAMES = ['Mara','Nika','Juno','Sora','Mina','Kira','Liv','Elin','Tessa','Runa','Alva','Mira','Nele','Yara','Enya','Leni','Cleo','Nuri','Hedi','Jara','Lale','Nila']
const MALE_NAMES = ['Elias','Tom','Levin','Theo','Noel','Dario','Sami','Milan','Jan','Robin','Lio','Finn','David','Armin','Jonas','Zora','Bela','Oskar','Ivo','Kuno','Mateo','Otto']

const AGES = {
  '20s': 'early-to-mid-20s',
  '30s': '30s',
  '40s': 'mid-40s',
  '50s': 'early-50s',
}
const HAIR_FEMALE = ['short straight chin-length black hair','long wavy dark brown hair','shoulder-length blonde bob','short curly natural black hair','medium straight auburn hair','chin-length silver-streaked dark hair','tight dark curls pulled back','long braided brown hair']
const HAIR_MALE = ['short wavy brown hair','short grey stubble-cut','short curly dark hair','clean-shaven with short straight blond hair','short black hair with greying temples','slightly receding short brown hair','close-cropped salt-and-pepper hair','short straight dark hair with side part']
const SHIRT_COLORS = ['muted teal','muted burgundy','muted dark-blue','olive-green','charcoal grey','warm off-white','muted mustard','deep petrol','muted rust-red','soft slate-blue','muted plum','warm taupe']
const EXPRESSIONS = ['composed and observant','relaxed and thoughtful','alert but natural','friendly and composed','calm and focused','quietly confident','warm and attentive','serious but approachable','slightly amused but reserved','patient and watchful']
const FACE_SHAPES = ['softly angular face','oval face with gentle features','broad and open face','thin face with sharp cheekbones','round and approachable face','strong jaw and defined features','delicate and refined features','square-jawed and sturdy face']

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = s + 1831565813 | 0
    const t = Math.imul(s ^ s >>> 15, 1 | s)
    const v = (t ^ t + Math.imul(t ^ t >>> 7, 61 | t) ^ t) >>> 0
    return (v >>> 0) / 4294967296
  }
}

interface CharacterDesc {
  name: string
  gender: 'female' | 'male'
  archetypeId: string
  age: string
  hair: string
  shirt: string
  face: string
  expression: string
  prompt: string
}

function generate(archetypes: Array<{ id: string; name: string; isManiac: boolean }>): CharacterDesc[] {
  const chars: CharacterDesc[] = []
  const usedHair = new Set<string>()
  const usedShirt = new Set<string>()
  const usedFace = new Set<string>()
  const usedExpression = new Set<string>()

  // Interleave genders roughly 50/50, shuffle names
  const shuffledFemale = [...FEMALE_NAMES].sort(() => Math.random() - 0.5)
  const shuffledMale = [...MALE_NAMES].sort(() => Math.random() - 0.5)
  const names: Array<{ name: string; gender: 'female' | 'male' }> = []
  // Exclude names that already have avatars: Elias, Juno, Nika, Tom
  const existing = new Set(['elias','juno','nika','tom'])

  for (const n of FEMALE_NAMES) {
    if (!existing.has(n.toLowerCase())) names.push({ name: n, gender: 'female' })
  }
  for (const n of MALE_NAMES) {
    if (!existing.has(n.toLowerCase())) names.push({ name: n, gender: 'male' })
  }

  const rng = mulberry32(42)

  for (let i = 0; i < names.length; i++) {
    const { name, gender } = names[i]
    const archetype = archetypes[i % archetypes.length]

    const hairPool = gender === 'female' ? HAIR_FEMALE : HAIR_MALE
    const agePool = Object.values(AGES)
    const ageIdx = i % 4

    // Avoid repeats but allow reuse if pool exhausted
    let hair = pick(hairPool.filter(h => !usedHair.has(h)), () => rng() * i + rng())
    if (!hair) { hair = pick(hairPool, () => Math.random()); usedHair.clear() }
    usedHair.add(hair)

    let shirt = pick(SHIRT_COLORS.filter(s => !usedShirt.has(s)), () => rng() * i + rng())
    if (!shirt) { shirt = pick(SHIRT_COLORS, () => Math.random()); usedShirt.clear() }
    usedShirt.add(shirt)

    let face = pick(FACE_SHAPES.filter(f => !usedFace.has(f)), () => rng() * i + rng())
    if (!face) { face = pick(FACE_SHAPES, () => Math.random()); usedFace.clear() }
    usedFace.add(face)

    let expression = pick(EXPRESSIONS.filter(e => !usedExpression.has(e)), () => rng() * i + rng())
    if (!expression) { expression = pick(EXPRESSIONS, () => Math.random()); usedExpression.clear() }
    usedExpression.add(expression)

    const age = Object.values(AGES)[ageIdx % 4]

    // Map archetype to gender-appropriate description
    const genderLabel = gender === 'female' ? 'a woman' : 'a man'
    const pronoun = gender === 'female' ? 'her' : 'his'
    const prompt = `${name}, ${genderLabel} in ${pronoun} ${age} with ${face}, ${hair} and a ${shirt} shirt, ${expression} expression`

    chars.push({ name, gender, archetypeId: archetype.id, age, hair, shirt, face, expression, prompt })
  }

  return chars
}

// Archetype distribution: 11 per archetype, no pattern in visuals
const archetypes = [
  { id: 'tag', name: 'TAG', isManiac: false },
  { id: 'nit', name: 'Nit', isManiac: false },
  { id: 'lag', name: 'LAG', isManiac: false },
  { id: 'calling-station', name: 'CS', isManiac: false },
]

const chars = generate(archetypes)

console.log(JSON.stringify(chars.map(c => ({
  name: c.name,
  archetype: c.archetypeId,
  gender: c.gender,
  prompt: c.prompt,
})), null, 2))

// Save to file
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'avatar-prompts.json')
writeFileSync(outPath, JSON.stringify(chars.map(c => ({
  name: c.name,
  archetype: c.archetypeId,
  gender: c.gender,
  prompt: c.prompt,
})), null, 2))
console.log(`\nSaved to: ${outPath}`)

console.log(`\nTotal: ${chars.length} characters`)
// Count per archetype
const counts: Record<string, number> = {}
for (const c of chars) counts[c.archetypeId] = (counts[c.archetypeId] ?? 0) + 1
console.log('Per archetype:', counts)
