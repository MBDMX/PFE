import { Brain, Info, ShieldAlert } from 'lucide-react'; // Importation des icônes visuelles de Lucide

interface Props {
    mlData: any; // Données d'explication SHAP/LIME issues du module ML
    modelStats: any; // Statistiques techniques du modèle de clustering
}

// 🧠 COMPOSANT D'EXPLICABILITÉ DE L'IA (Explainable AI - XAI)
// Il détaille précisément POURQUOI l'IA a mis une bonne ou une mauvaise note de santé à cette machine
export default function AIExplanationTable({ mlData, modelStats }: Props) {
    return (
        <section className="azure-card p-0 overflow-hidden">
            
            {/* EN-TÊTE DU TABLEAU */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-blue-600/5">
                <div className="flex items-center gap-3">
                    <Brain size={18} className="text-blue-400" />
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Justification du Score (Explainable AI)</h2>
                </div>
                {/* Affiche le score de Silhouette du modèle de clustering IA (K-Means/GMM) */}
                {modelStats?.silhouette_score && (
                    <div className="flex items-center gap-2 text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest border border-white/5 px-3 py-1 rounded-lg bg-white/5 select-none">
                        <Info size={10} className="text-blue-400" />
                        Silhouette : <span className="text-blue-400 font-black ml-1">{modelStats.silhouette_score}</span>
                    </div>
                )}
            </div>

            {/* TABLEAU DES COEFFICIENTS D'ANOMALIE */}
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-900/50">
                        <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase tracking-widest">Cas Détecté</th>
                        <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase tracking-widest">Mesure</th>
                        <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase tracking-widest text-center">Coefficient</th>
                        <th className="p-4 text-[0.55rem] font-black text-slate-500 uppercase tracking-widest text-right text-rose-500">Impact Score</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Boucle map sur les explications calculées par SHAP/LIME */}
                    {mlData?.explanations?.length > 0 ? mlData.explanations.map((exp: any, i: number) => (
                        <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                            {/* Titre du cas d'anomalie détecté */}
                            <td className="p-4 font-bold text-white text-xs uppercase tracking-tight">{exp.case}</td>
                            {/* Mesure physique relevée par les capteurs */}
                            <td className="p-4 text-slate-400 text-xs">{exp.metric}</td>
                            {/* Importance relative (Poids/Coefficient mathématique du critère) */}
                            <td className="p-4 text-center">
                                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[0.7rem] font-black border border-blue-500/10">{exp.coeff}</span>
                            </td>
                            {/* Impact négatif de l'anomalie sur le score de santé global */}
                            <td className={`p-4 text-right font-black text-sm ${exp.impact === '0%' ? 'text-emerald-400' : 'text-rose-400'}`}>{exp.impact}</td>
                        </tr>
                    )) : (
                        // CAS PARFAIT : Zéro défaut, la machine est 100% stable
                        <tr>
                            <td colSpan={4} className="p-8 text-center">
                                <div className="flex flex-col items-center gap-2 text-emerald-400">
                                    <ShieldAlert size={20} className="opacity-50" />
                                    <span className="text-[0.65rem] font-black uppercase tracking-widest">Aucune anomalie — Équipement conforme</span>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </section>
    );
}
