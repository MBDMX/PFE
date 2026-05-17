import React from 'react';
import { Package, Box, Droplets, Zap, Wrench, Cpu } from 'lucide-react'; // Icônes visuelles élégantes
import { StockItem } from './types';

// 🔌 ASSOCIE UNE ICÔNE VISUELLE SELON LE NOM DE LA PIÈCE :
// Permet d'afficher un symbole intelligent si l'image Google Images n'a pas encore chargé
function getCategoryIcon(context: string) {
  const n = (context || '').toLowerCase();
  if (n.includes('pneuma') || n.includes('verin') || n.includes('air')) return <Box className="text-blue-400/60" size={20} />;
  if (n.includes('hydraul') || n.includes('pompe') || n.includes('huile')) return <Droplets className="text-cyan-400/60" size={20} />;
  if (n.includes('electr') || n.includes('moteur') || n.includes('cable') || n.includes('capteur')) return <Zap className="text-yellow-400/60" size={20} />;
  if (n.includes('mecani') || n.includes('roulement') || n.includes('vis') || n.includes('boulon')) return <Wrench className="text-slate-400/60" size={20} />;
  if (n.includes('control') || n.includes('carte') || n.includes('cpu')) return <Cpu className="text-purple-400/60" size={20} />;
  return <Package className="text-slate-600/40" size={20} />; // Icône de paquet par défaut
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'; // Adresse du backend FastAPI

export function PartImage({ item }: { item: StockItem }) {
  // L'image peut être stockée en Base64, sous forme d'URL HTTP ou de chemin relatif vers le backend
  const rawSrc = item.image || '';
  const isValidImage = rawSrc.startsWith('data:image') || rawSrc.startsWith('http') || rawSrc.includes('/static/');
  
  // Préfixer les chemins statiques du backend avec l'URL de base si nécessaire
  const src = (rawSrc.includes('/static/') && !rawSrc.startsWith('http'))
    ? `${API_BASE_URL}${rawSrc.startsWith('/') ? '' : '/'}${rawSrc}`
    : rawSrc;

  // CAS A : IMAGE VALIDE EXISTANTE
  if (isValidImage) {
    return (
      <div className="size-12 rounded-xl overflow-hidden border border-white/10 bg-slate-800 shrink-0 shadow-inner group-hover:border-blue-500/50 transition-all duration-500">
        <img
          src={src}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          loading="lazy" // Chargement paresseux (n'affiche que si visible à l'écran)
          onError={(e) => {
            // Si l'image échoue à charger, on cache l'élément img pour afficher l'icône de secours
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // CAS B : IMAGE INVALIDE OU ABSENTE (Affiche l'icône intelligente de la catégorie de secours)
  return (
    <div className="size-12 rounded-xl border border-blue-500/20 bg-blue-500/5 shrink-0 flex items-center justify-center shadow-inner group-hover:bg-blue-500/10 transition-colors">
      {getCategoryIcon(item.name || (item as any).category || '')}
    </div>
  );
}
