import type { AppStateShape, Card, Deck } from '@/types'
import { storage } from '@/lib/storage'
import type { Pack } from '@/lib/library'

type DemoDeck = { name: string; description: string; cards: Array<[title: string, content: string]> }

// Public-domain texts and short fact cards so a first visit has something to play.
const DEMO: DemoDeck[] = [
  {
    name: 'Famous Words',
    description: 'Short public-domain lines worth knowing by heart.',
    cards: [
      ['Moby-Dick opens', 'Call me Ishmael.'],
      ['A Tale of Two Cities opens', 'It was the best of times, it was the worst of times.'],
      ['Sonnet 18, first lines', "Shall I compare thee to a summer's day?\nThou art more lovely and more temperate."],
      ['Gettysburg Address opens', 'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.'],
      ['Hope, according to Dickinson', 'Hope is the thing with feathers\nThat perches in the soul,\nAnd sings the tune without the words,\nAnd never stops at all.'],
      ['Hamlet asks', 'To be, or not to be, that is the question.'],
    ],
  },
  {
    name: 'Scientific Reasoning',
    description: 'Core ideas in logic, evidence, and inference.',
    cards: [
      ['Falsifiability', 'A scientific claim must be testable in a way that could prove it wrong, not only confirm it.'],
      ['Null and Alternative Hypotheses', 'The null hypothesis states no effect or no difference; evidence must be strong enough to reject it in favor of an alternative.'],
      ['Correlation vs Causation', 'Correlation shows variables move together. Causation means one variable produces change in another; this requires stronger evidence.'],
      ['Bayes Rule (plain language)', 'Update your belief by combining prior probability with new evidence, weighted by how likely that evidence is under each explanation.'],
      ["Occam's Razor", 'Among explanations that fit the facts, prefer the one with the fewest unnecessary assumptions.'],
    ],
  },
  {
    name: 'World History Milestones',
    description: 'Turning points that reshaped institutions and ideas.',
    cards: [
      ['Magna Carta (1215)', 'Limited royal power and advanced the principle that rulers are subject to law.'],
      ['Printing Press (15th century)', 'Cheap reproduction of texts accelerated literacy, scholarship, and religious and political debate.'],
      ['Peace of Westphalia (1648)', 'Helped establish the norm of state sovereignty and non-interference in domestic affairs.'],
      ['Industrial Revolution', 'Mechanization and fossil-fuel energy drove productivity growth, urbanization, and major social transformation.'],
      ['Fall of the Berlin Wall (1989)', 'Symbolized the collapse of communist regimes in Eastern Europe and the approaching end of the Cold War.'],
    ],
  },
  {
    name: 'Constitutional Government',
    description: 'Key principles behind modern democratic systems.',
    cards: [
      ['Separation of Powers', 'Government authority is split among legislative, executive, and judicial branches to reduce concentration of power.'],
      ['Checks and Balances', 'Each branch has tools to constrain the others, such as vetoes, judicial review, and legislative oversight.'],
      ['Federalism', 'Sovereign authority is divided between national and subnational governments with distinct responsibilities.'],
      ['Due Process', 'The state must follow fair procedures and respect legal rights before depriving anyone of life, liberty, or property.'],
      ['Rule of Law', 'Laws govern both citizens and leaders, and legal rules are applied predictably rather than by arbitrary power.'],
    ],
  },
  {
    name: 'Economics in One Page',
    description: 'High-leverage concepts from micro and macroeconomics.',
    cards: [
      ['Opportunity Cost', 'The true cost of a choice is the value of the best alternative you give up.'],
      ['Comparative Advantage', 'Trade benefits parties when each specializes in what they produce at lower opportunity cost.'],
      ['Marginal Analysis', 'Good decisions compare additional benefit with additional cost at the margin, not total averages.'],
      ['Inflation', 'A sustained rise in the general price level reduces purchasing power; real values adjust nominal values for inflation.'],
      ['Monetary vs Fiscal Policy', 'Monetary policy uses interest rates and money conditions; fiscal policy uses taxes and public spending.'],
    ],
  },
]

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const CLASSIC_PACKS: Pack[] = DEMO.map((d) => ({
  id: `classic-${slug(d.name)}`,
  name: d.name,
  description: d.description,
  source: 'classic',
  icon: d.name === 'Famous Words' ? '📜' : '🃏',
  cards: d.cards,
}))

/** Turns a pack into a fresh deck + cards (new ids each time). */
export function packToDeck(pack: Pack, now = storage.now()): { deck: Deck; cards: Card[] } {
  const deck: Deck = { id: storage.uuid(), name: pack.name, description: pack.description, packId: pack.id, createdAt: now, updatedAt: now }
  const cards = pack.cards.map(([title, content], i): Card => ({ id: storage.uuid(), deckId: deck.id, title, content, createdAt: now + i, updatedAt: now }))
  return { deck, cards }
}

export function buildDemoState(): Pick<AppStateShape, 'decks' | 'cards'> {
  const now = storage.now()
  const decks: Deck[] = []
  const cards: Card[] = []
  CLASSIC_PACKS.forEach((pack, i) => {
    // Earlier packs get later timestamps so they sort first (newest first) on the home page.
    const built = packToDeck(pack, now - i * 1000)
    decks.push(built.deck)
    cards.push(...built.cards)
  })
  return { decks, cards }
}
