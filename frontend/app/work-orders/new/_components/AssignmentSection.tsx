import { Users, Clock } from 'lucide-react'; // Importation des icônes de Groupe et d'Horloge

// Définition de l'interface des propriétés (Props) reçues par ce composant
interface Props {
    formData: any; // Données globales de saisie du formulaire parent
    allTechnicians: any[]; // Liste complète de tous les techniciens
    onChange: (updates: Partial<any>) => void; // Fonction pour notifier le parent d'un changement de valeur
}

export default function AssignmentSection({ formData, allTechnicians, onChange }: Props) {
    // 👥 FILTRAGE DYNAMIQUE : Ne garde que les techniciens qui font partie de l'équipe sélectionnée
    const filteredTechs = allTechnicians.filter(t => t.team === formData.team);

    return (
        <div className="azure-card p-10 space-y-8">
            
            {/* Titre de la section assignation */}
            <div className="flex items-center gap-3 mb-2 border-b border-white/5 pb-5">
                <Users size={24} className="text-violet-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Assignation d'Équipe</h2>
            </div>

            {/* 1. SÉLECTION DE L'ÉQUIPE DE MAINTENANCE */}
            <div className="space-y-4">
                <label className="text-[0.7rem] font-black text-slate-500 uppercase tracking-[0.2em]">Équipe Responsable</label>
                <select
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-violet-500/50 font-bold text-base appearance-none"
                    value={formData.team}
                    // Quand l'équipe change, on vide le technicien et le nom du responsable précédemment choisis par sécurité
                    onChange={e => onChange({ team: e.target.value, technicianId: '', responsiblePerson: '' })}
                >
                    <option value="" className="bg-slate-950 text-slate-400">Sélectionner une équipe</option>
                    <option value="Maint-Meca" className="bg-slate-950 text-white">🔧 Équipe Mécanique</option>
                    <option value="Maint-Elec" className="bg-slate-950 text-white">⚡ Équipe Électrique</option>
                    <option value="Maint-Hydrique" className="bg-slate-950 text-white">💧 Équipe Hydraulique</option>
                    <option value="Utility-Hvac" className="bg-slate-950 text-white">❄️ Équipe HVAC</option>
                </select>
            </div>

            {/* 2. SÉLECTION DU TECHNICIEN (Affiche cet input uniquement si une équipe a été sélectionnée au préalable) */}
            {formData.team && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[0.7rem] font-black text-slate-500 uppercase tracking-[0.2em]">Intervenant Associé</label>
                    <select
                        required
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-violet-500/50 font-bold text-base appearance-none"
                        value={formData.technicianId}
                        onChange={e => {
                            // Trouve le technicien correspondant à l'identifiant choisi
                            const tech = allTechnicians.find(t => t.id === Number(e.target.value));
                            // Enregistre son ID et son nom en clair dans le formulaire global
                            onChange({ technicianId: e.target.value, responsiblePerson: tech?.name || '' });
                        }}
                    >
                        <option value="" className="bg-slate-950 text-slate-400">Choisir un membre de l'équipe ({filteredTechs.length})</option>
                        {filteredTechs.map(t => <option key={t.id} value={t.id} className="bg-slate-950 text-white">{t.name}</option>)}
                    </select>
                </div>
            )}

            {/* 3. DATES DE PLANIFICATION */}
            <div className="pt-4 space-y-4">
                <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-3">
                    <Clock size={20} className="text-amber-400" />
                    <h2 className="text-xs font-black text-white uppercase tracking-widest">Horodatage de l'Intervention</h2>
                </div>
                <div className="space-y-3">
                    <label className="text-[0.7rem] font-black text-slate-500 uppercase tracking-[0.2em]">Date et Heure exactes</label>
                    <input
                        type="datetime-local"
                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-5 text-white font-bold text-base focus:border-amber-500/50"
                        value={formData.createdAt}
                        onChange={e => onChange({ createdAt: e.target.value })} // Enregistre la date modifiée
                    />
                </div>
            </div>
        </div>
    );
}
