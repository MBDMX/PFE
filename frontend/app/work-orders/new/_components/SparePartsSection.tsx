import { Package, Plus, Trash2 } from 'lucide-react'; // Importation des icônes de Boîte/Colis, d'Ajout et de Corbeille
import { gmaoApi } from '@/services/api'; // Service de communication avec le serveur backend FastAPI

// Définition de l'interface des propriétés (Props) reçues par ce composant
interface Props {
    selectedParts: any[]; // Liste des pièces de rechange déjà sélectionnées
    aiResults: any[]; // Résultats suggestionnés par la recherche IA en temps réel
    onAiSearch: (results: any[]) => void; // Fonction pour mettre à jour les résultats IA dans le parent
    onAddPart: (part: any) => void; // Fonction pour ajouter une pièce détachée
    onRemovePart: (code: string) => void; // Fonction pour enlever une pièce détachée
}

export default function SparePartsSection({ selectedParts, aiResults, onAiSearch, onAddPart, onRemovePart }: Props) {
    return (
        <div className="azure-card p-10 flex flex-col">
            
            {/* EN-TÊTE DE LA SECTION PIÈCES DETACHÉES */}
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-5">
                <div className="flex items-center gap-3">
                    <Package size={24} className="text-emerald-400" />
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Pièces de Rechange (IA Search)</h2>
                </div>
                {/* Petit badge vert indiquant que le moteur de suggestion par IA est prêt */}
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
                    <div className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-[0.6rem] font-black text-blue-400 uppercase tracking-widest">IA 100% Active</span>
                </div>
            </div>

            {/* 🔍 RECHERCHE SÉMANTIQUE IA (L'utilisateur tape en langage naturel, ex: "truc pour serrer") */}
            <div className="space-y-4 mb-6">
                <div className="relative group">
                    <input
                        type="text"
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-5 text-white text-sm font-bold placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                        placeholder="Décrivez ce que vous cherchez... (ex: truc pour serrer)"
                        // Déclenché à chaque frappe de touche dans le champ
                        onChange={async e => {
                            const q = e.target.value;
                            // Démarre la recherche IA s'il y a plus de 2 caractères saisis
                            if (q.length > 2) {
                                // Appelle notre API de recherche sémantique AI sur le backend
                                const results = await gmaoApi.searchStockAI(q);
                                onAiSearch(results);
                            } else {
                                onAiSearch([]); // Efface les résultats si le texte est trop court
                            }
                        }}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"><Package size={18} /></div>
                </div>

                {/* 🤖 BOÎTE DE DIALOGUE DES SUGGESTIONS IA (Affiche la liste si l'IA trouve des correspondances) */}
                {aiResults.length > 0 && (
                    <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {aiResults.map((r: any) => (
                            <button key={r.id} type="button" onClick={() => onAddPart({ part_code: r.reference, part_name: r.name, quantity: 1 })}
                                className="w-full flex items-center justify-between p-4 hover:bg-white/5 border-b border-white/5 last:border-none transition-colors text-left"
                            >
                                <div className="flex flex-col">
                                    {/* Nom de la pièce et justification sémantique de l'IA (ex: "Clé à molette") */}
                                    <span className="text-sm font-bold text-white">{r.name}</span>
                                    <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">{r.reference} • {r.search_reason}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Score de correspondance calculé par l'IA (en %) */}
                                    <div className="text-[0.6rem] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">{r.search_score}%</div>
                                    <Plus size={16} className="text-slate-500" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 🛒 LISTE DES PIÈCES SÉLECTIONNÉES POUR L'ORDRE DE TRAVAIL */}
            <div className="flex-1 bg-slate-950/30 rounded-3xl border border-white/5 overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto px-4 py-2 custom-scrollbar">
                    {selectedParts.length === 0 ? (
                        // Message affiché si la liste de courses de pièces est encore vide
                        <div className="h-45 flex flex-col items-center justify-center text-slate-600 opacity-50 italic text-sm text-center">
                            <Package size={32} className="mb-2" /> Aucune pièce ajoutée
                        </div>
                    ) : (
                        // Affichage des pièces ajoutées sous forme de badges stylisés
                        <div className="space-y-2 py-4">
                            {selectedParts.map(p => (
                                <div key={p.part_code} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group">
                                    <div>
                                        <span className="text-sm font-bold text-white">{p.part_name}</span>
                                        <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">{p.part_code} × {p.quantity}</div>
                                    </div>
                                    {/* Bouton pour retirer la pièce de la liste */}
                                    <button type="button" onClick={() => onRemovePart(p.part_code)} className="size-10 rounded-xl hover:bg-rose-500/10 text-slate-600 hover:text-rose-500 flex items-center justify-center transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
