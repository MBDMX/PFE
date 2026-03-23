// @ts-ignore
import stringSimilarity from 'string-similarity';
import { StockItem } from './types';

function computeSimilarity(query: string, item: StockItem): number {
  if (!query.trim() || !item) return 0;

  const q = query.toLowerCase().trim();
  const name = (item.name || '').toLowerCase();
  const ref = (item.reference || '').toLowerCase();
  const synsText = (item.synonyms || '').toLowerCase();

  let baseScore = 0;

  if (name.includes(q)) baseScore = Math.max(baseScore, 80);
  if (ref.includes(q)) baseScore = Math.max(baseScore, 90);
  if (synsText.includes(q)) baseScore = Math.max(baseScore, 70);

  try {
    const searchableTerms = [name, ref];
    if (item.synonyms) {
      searchableTerms.push(...item.synonyms.split(',').map(s => s.trim().toLowerCase()));
    }
    const validTerms = searchableTerms.filter(t => t.length > 0);
    if (validTerms.length > 0) {
      const matches = stringSimilarity.findBestMatch(q, validTerms);
      const simScore = Math.round(matches.bestMatch.rating * 100);
      baseScore = Math.max(baseScore, simScore);
    }
  } catch (e) {
    console.error('String similarity error:', e);
  }

  return Math.min(Math.round(baseScore), 99);
}

export function smartSearch(
  query: string,
  items: StockItem[]
): Array<StockItem & { score: number }> {
  if (!query.trim()) return [];
  return items
    .map(item => ({ ...item, score: computeSimilarity(query, item) }))
    .filter(item => item.score >= 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}