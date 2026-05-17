import { FileText, Wrench, MapPin, Settings, AlertCircle } from 'lucide-react'; // Importation des icônes de formulaire (Texte, Clé, Carte, Paramètres, Alerte)

// Définition de l'interface des propriétés (Props) reçues par ce composant
interface Props {
    formData: any; // Données de saisie du formulaire parent
    machines: any[]; // Liste complète de nos machines industrielles
    onChange: (updates: Partial<any>) => void; // Fonction pour notifier le parent d'une mise à jour
}

export default function MainInfoSection({ formData, machines, onChange }: Props) {
    return (
        <div className="azure-card p-10 space-y-10">
            
            {/* 1. SAISIE DU TITRE DE L'INTERVENTION */}
            <div className="space-y-4">
                <label className="text-[0.75rem] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">Titre de l'Intervention</label>
                <div className="relative group">
                    <FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                    <input
                        required
                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold text-xl placeholder:text-slate-600"
                        placeholder="ex: Réparation fuite d'huile - Presse Hydraulique P5"
                        value={formData.title} // Liaison de valeur
                        onChange={e => onChange({ title: e.target.value })} // Modifie le titre dans le formulaire
                    />
                </div>
            </div>

            {/* Grille double-colonne (Machine + Localisation) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* 2. SÉLECTION DE LA MACHINE CONCERNÉE */}
                <div className="space-y-4">
                    <label className="text-[0.75rem] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">Machine / Équipement</label>
                    <div className="relative group">
                        <Wrench className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <select
                            required
                            className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold text-lg appearance-none cursor-pointer"
                            value={formData.equipmentId}
                            onChange={e => {
                                // Trouve la machine qui a la référence sélectionnée
                                const machine = machines.find(m => m.reference === e.target.value);
                                // Modifie l'ID de la machine et remplit automatiquement sa localisation physique pour aller plus vite !
                                onChange({ equipmentId: e.target.value, location: machine?.location || '' });
                            }}
                        >
                            <option value="" className="bg-slate-950 text-slate-400">Sélectionner une machine</option>
                            {machines.map(m => <option key={m.id} value={m.reference} className="bg-slate-950 text-white">{m.name} ({m.reference})</option>)}
                        </select>
                    </div>
                </div>

                {/* 3. LOCALISATION PHYSIQUE DANS L'USINE (Remplie automatiquement, mais modifiable si besoin) */}
                <div className="space-y-4">
                    <label className="text-[0.75rem] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">Localisation</label>
                    <div className="relative group">
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <input
                            className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold text-lg"
                            placeholder="Atelier Nord - Zone A"
                            value={formData.location}
                            onChange={e => onChange({ location: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Grille double-colonne (Type de panne + Degré d'urgence) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* 4. CHOIX DU TYPE D'INTERVENTION (Correctif, Préventif, Amélioration) */}
                <div className="space-y-4">
                    <label className="text-[0.75rem] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">Type d'intervention</label>
                    <div className="relative group">
                        <Settings className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <select required className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold text-lg appearance-none cursor-pointer" value={formData.type} onChange={e => onChange({ type: e.target.value })}>
                            <option value="corrective" className="bg-slate-950 text-white">🚧 Corrective (Curatif)</option>
                            <option value="preventive" className="bg-slate-950 text-white">📅 Préventive</option>
                            <option value="amélioration" className="bg-slate-950 text-white">✨ Amélioration</option>
                        </select>
                    </div>
                </div>

                {/* 5. NIVEAU DE PRIORITÉ / GRAVITÉ DE LA PANNE */}
                <div className="space-y-4">
                    <label className="text-[0.75rem] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">Niveau de Priorité</label>
                    <div className="relative group">
                        <AlertCircle className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-rose-400 transition-colors" size={20} />
                        <select required className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-rose-500/50 transition-all font-bold text-lg appearance-none cursor-pointer" value={formData.priority} onChange={e => onChange({ priority: e.target.value })}>
                            <option value="low" className="bg-slate-950 text-white">🟢 Basse (Routine)</option>
                            <option value="medium" className="bg-slate-950 text-white">🟡 Moyenne (Standard)</option>
                            <option value="high" className="bg-slate-950 text-white">🟠 Haute (Urgent)</option>
                            <option value="critical" className="bg-slate-950 text-white">🔴 Critique (Blocage Prod)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 6. DESCRIPTION TEXTUELLE DÉTAILLÉE DES TRAVAUX À ACCOMPLIR */}
            <div className="space-y-4">
                <label className="text-[0.75rem] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">Description Technique</label>
                <textarea
                    rows={4}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-6 text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium text-lg leading-relaxed placeholder:text-slate-600"
                    placeholder="Détaillez les symptômes observés ou les travaux planifiés..."
                    value={formData.description}
                    onChange={e => onChange({ description: e.target.value })}
                />
            </div>
        </div>
    );
}
