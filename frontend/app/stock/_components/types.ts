// ────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────
export interface StockItem {
  id: number;
  name: string;
  reference: string;
  quantity: number;
  unit: string;
  location: string;
  image?: string;
  synonyms?: string;
  unit_price?: number;
}

// ────────────────────────────────────────────
// UTILS
// ────────────────────────────────────────────

export const getPieceIcon = (name: string) => {
  if (name.includes('Courroie') || name.includes('Bande')) return { icon: '🔧', gradient: 'from-orange-500/20 to-amber-500/10', border: 'border-orange-500/20' };
  if (name.includes('Roulement')) return { icon: '⚙️', gradient: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/20' };
  if (name.includes('Filtre')) return { icon: '🛢️', gradient: 'from-yellow-500/20 to-orange-500/10', border: 'border-yellow-500/20' };
  if (name.includes('Joint')) return { icon: '⭕', gradient: 'from-rose-500/20 to-pink-500/10', border: 'border-rose-500/20' };
  if (name.includes('Vérin') || name.includes('Flexible')) return { icon: '🔩', gradient: 'from-slate-400/20 to-zinc-500/10', border: 'border-slate-400/20' };
  if (name.includes('Graisse')) return { icon: '🧴', gradient: 'from-emerald-500/20 to-teal-500/10', border: 'border-emerald-500/20' };
  if (name.includes('Capteur')) return { icon: '📡', gradient: 'from-indigo-500/20 to-violet-500/10', border: 'border-indigo-500/20' };
  if (name.includes('Relais') || name.includes('Contacteur')) return { icon: '⚡', gradient: 'from-yellow-400/20 to-amber-400/10', border: 'border-yellow-400/20' };
  return { icon: '📦', gradient: 'from-blue-500/20 to-slate-500/10', border: 'border-blue-500/20' };
};

export const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20';
  if (score >= 60) return 'text-blue-400 bg-blue-400/10 border-blue-500/20';
  if (score >= 35) return 'text-amber-400 bg-amber-400/10 border-amber-500/20';
  return 'text-slate-400 bg-slate-400/10 border-slate-500/20';
};
