import { FileText, Wrench, MapPin, Settings, AlertCircle } from 'lucide-react';

interface Props {
    formData: any;
    machines: any[];
    onChange: (updates: Partial<any>) => void;
}

export default function MainInfoSection({ formData, machines, onChange }: Props) {
    return (
        <div className="azure-card p-10 space-y-10">
            {/* Title */}
            <div className="space-y-4">
                <label className="text-[0.75rem] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">Titre de l'Intervention</label>
                <div className="relative group">
                    <FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                    <input
                        required
                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold text-xl placeholder:text-slate-600"
                        placeholder="ex: Réparation fuite d'huile - Presse Hydraulique P5"
                        value={formData.title}
                        onChange={e => onChange({ title: e.target.value })}
                    />
                </div>
            </div>

            {/* Machine + Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="text-[0.75rem] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">Machine / Équipement</label>
                    <div className="relative group">
                        <Wrench className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <select
                            required
                            className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold text-lg appearance-none cursor-pointer"
                            value={formData.equipmentId}
                            onChange={e => {
                                const machine = machines.find(m => m.reference === e.target.value);
                                onChange({ equipmentId: e.target.value, location: machine?.location || '' });
                            }}
                        >
                            <option value="">Sélectionner une machine</option>
                            {machines.map(m => <option key={m.id} value={m.reference}>{m.name} ({m.reference})</option>)}
                        </select>
                    </div>
                </div>
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

            {/* Type + Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="text-[0.75rem] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">Type d'intervention</label>
                    <div className="relative group">
                        <Settings className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <select required className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold text-lg appearance-none cursor-pointer" value={formData.type} onChange={e => onChange({ type: e.target.value })}>
                            <option value="corrective">🚧 Corrective (Curatif)</option>
                            <option value="preventive">📅 Préventive</option>
                            <option value="amélioration">✨ Amélioration</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-4">
                    <label className="text-[0.75rem] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">Niveau de Priorité</label>
                    <div className="relative group">
                        <AlertCircle className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-rose-400 transition-colors" size={20} />
                        <select required className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-rose-500/50 transition-all font-bold text-lg appearance-none cursor-pointer" value={formData.priority} onChange={e => onChange({ priority: e.target.value })}>
                            <option value="low">🟢 Basse (Routine)</option>
                            <option value="medium">🟡 Moyenne (Standard)</option>
                            <option value="high">🟠 Haute (Urgent)</option>
                            <option value="critical">🔴 Critique (Blocage Prod)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Description */}
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
