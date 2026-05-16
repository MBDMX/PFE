import { Users, Clock } from 'lucide-react';

interface Props {
    formData: any;
    allTechnicians: any[];
    onChange: (updates: Partial<any>) => void;
}

export default function AssignmentSection({ formData, allTechnicians, onChange }: Props) {
    const filteredTechs = allTechnicians.filter(t => t.team === formData.team);

    return (
        <div className="azure-card p-10 space-y-8">
            <div className="flex items-center gap-3 mb-2 border-b border-white/5 pb-5">
                <Users size={24} className="text-violet-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Assignation d'Équipe</h2>
            </div>

            <div className="space-y-4">
                <label className="text-[0.7rem] font-black text-slate-500 uppercase tracking-[0.2em]">Équipe Responsable</label>
                <select
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-violet-500/50 font-bold text-base appearance-none"
                    value={formData.team}
                    onChange={e => onChange({ team: e.target.value, technicianId: '', responsiblePerson: '' })}
                >
                    <option value="">Sélectionner une équipe</option>
                    <option value="Maint-Meca">🔧 Équipe Mécanique</option>
                    <option value="Maint-Elec">⚡ Équipe Électrique</option>
                    <option value="Maint-Hydrique">💧 Équipe Hydraulique</option>
                    <option value="Utility-Hvac">❄️ Équipe HVAC</option>
                </select>
            </div>

            {formData.team && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[0.7rem] font-black text-slate-500 uppercase tracking-[0.2em]">Intervenant Associé</label>
                    <select
                        required
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-violet-500/50 font-bold text-base appearance-none"
                        value={formData.technicianId}
                        onChange={e => {
                            const tech = allTechnicians.find(t => t.id === Number(e.target.value));
                            onChange({ technicianId: e.target.value, responsiblePerson: tech?.name || '' });
                        }}
                    >
                        <option value="">Choisir un membre de l'équipe ({filteredTechs.length})</option>
                        {filteredTechs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            )}

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
                        onChange={e => onChange({ createdAt: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );
}
