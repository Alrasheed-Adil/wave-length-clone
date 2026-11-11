// Deck sanity check: npx tsx src/cardcheck.ts
import { CARDS, CATEGORIES, CARD_COUNT_BY_CATEGORY } from '../../shared/src/cards';
import { CATEGORY_IDS } from '../../shared/src/types';

const problems: string[] = [];
const ids = new Set<string>();
const pairs = new Map<string, string>();
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();
const ARABIC = /[؀-ۿ]/;

for (const c of CARDS) {
  if (ids.has(c.id)) problems.push(`duplicate id ${c.id}`);
  ids.add(c.id);
  for (const s of [c.left.en, c.right.en, c.left.ar, c.right.ar]) if (!s.trim()) problems.push(`empty text in ${c.id}`);
  if (!ARABIC.test(c.left.ar) || !ARABIC.test(c.right.ar)) problems.push(`missing Arabic in ${c.id}`);
  if (ARABIC.test(c.left.en + c.right.en)) problems.push(`Arabic in English field of ${c.id}`);
  if (norm(c.left.en) === norm(c.right.en)) problems.push(`same ends in ${c.id}`);
  for (const key of [`${norm(c.left.en)}|${norm(c.right.en)}`, `${norm(c.right.en)}|${norm(c.left.en)}`]) {
    if (pairs.has(key)) problems.push(`duplicate spectrum ${c.id} ~ ${pairs.get(key)}`);
  }
  pairs.set(`${norm(c.left.en)}|${norm(c.right.en)}`, c.id);
}
for (const id of CATEGORY_IDS) {
  if (!CATEGORIES.find((c) => c.id === id)) problems.push(`category ${id} has no name`);
  if (!(CARD_COUNT_BY_CATEGORY[id] >= 15)) problems.push(`category ${id} has only ${CARD_COUNT_BY_CATEGORY[id] ?? 0} cards`);
}

console.log(`${CARDS.length} cards in ${CATEGORY_IDS.length} categories`);
console.log(CATEGORY_IDS.map((id) => `${id}:${CARD_COUNT_BY_CATEGORY[id]}`).join('  '));
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('deck ok');
