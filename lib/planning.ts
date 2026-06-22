import type { PlanKind } from '@/types'

type Tx = { type: string; amount: number; category: string; subcategory?: string | null }

export interface ActualMaps {
  incomeByCat: Record<string, number>
  incomeByCatSub: Record<string, number>
  expenseByCat: Record<string, number>
  expenseByCatSub: Record<string, number>
}

// Composite key for category + subcategory ("||" separator avoids collisions)
export const catSubKey = (cat: string, sub?: string | null) => `${cat}||${sub ?? ''}`

export function buildActualMaps(txs: Tx[]): ActualMaps {
  const maps: ActualMaps = {
    incomeByCat: {}, incomeByCatSub: {},
    expenseByCat: {}, expenseByCatSub: {},
  }
  for (const t of txs) {
    const income = t.type === 'income'
    const byCat = income ? maps.incomeByCat : maps.expenseByCat
    const byCatSub = income ? maps.incomeByCatSub : maps.expenseByCatSub
    byCat[t.category] = (byCat[t.category] ?? 0) + t.amount
    if (t.subcategory) {
      const k = catSubKey(t.category, t.subcategory)
      byCatSub[k] = (byCatSub[k] ?? 0) + t.amount
    }
  }
  return maps
}

// Realized amount for a plan line: by subcategory if set, otherwise the whole category
export function realizedFor(
  p: { kind: PlanKind; category: string; subcategory?: string | null },
  m: ActualMaps,
): number {
  const income = p.kind === 'renda'
  if (p.subcategory) {
    const byCatSub = income ? m.incomeByCatSub : m.expenseByCatSub
    return byCatSub[catSubKey(p.category, p.subcategory)] ?? 0
  }
  const byCat = income ? m.incomeByCat : m.expenseByCat
  return byCat[p.category] ?? 0
}
