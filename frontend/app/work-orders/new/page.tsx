'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  X, 
  Settings, 
  FileText, 
  Calendar, 
  AlertCircle,
  MapPin,
  Users,
  Wrench
} from 'lucide-react';
import { gmaoApi } from '@/services/api';
import { useToast } from '@/components/ui/toast';

export default function NewWorkOrder() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState<any[]>([]);
  const { success, error: toastError } = useToast();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    equipmentId: '',
    type: 'corrective',
    priority: 'medium',
    location: '',
    team: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const loadMachines = async () => {
      try {
        const data = await gmaoApi.getMachines();
        setMachines(data);
      } catch (err) {
        console.error("Failed to load machines", err);
      }
    };
    loadMachines();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await gmaoApi.createWorkOrder(formData);
      success('Ordre de Travail créé', `${res.sap_order_id || 'SAP Confirmation'} enregistré.`);
      router.push('/work-orders');
      router.refresh(); 
    } catch (err) {
      console.error("Failed to create work order", err);
      toastError('Erreur de création', 'Impossible de joindre le serveur SAP');
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={() => router.push('/work-orders')}
          className="size-11 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5 shadow-inner"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">Nouvel Ordre de Travail</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Génération d'une demande d'intervention SAP</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Info Card */}
        <div className="azure-card p-8 space-y-8">
          <div className="space-y-2">
            <label className="text-[0.65rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Titre de l'Intervention</label>
            <div className="relative group">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
              <input 
                required
                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold text-lg"
                placeholder="ex: Réparation fuite d'huile - Presse Hydraulique P5"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Équipement / Machine</label>
              <div className="relative group">
                <Wrench className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <select 
                  required
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold appearance-none cursor-pointer"
                  value={formData.equipmentId}
                  onChange={(e) => {
                    const machine = machines.find(m => m.reference === e.target.value);
                    setFormData({...formData, equipmentId: e.target.value, location: machine?.location || ''});
                  }}
                >
                  <option value="">Sélectionner une machine</option>
                  {machines.map(m => (
                    <option key={m.id} value={m.reference}>{m.name} ({m.reference})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[0.65rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Localisation Technique</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input 
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold"
                  placeholder="ex: Atelier Nord - Zone A"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[0.65rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Description du Problème / Travaux</label>
            <textarea 
              rows={4}
              className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium leading-relaxed"
              placeholder="Décrivez les symptômes de la panne ou les tâches de maintenance préventive à effectuer..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
        </div>

        {/* Configuration Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="azure-card p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-3">
              <Settings size={16} className="text-blue-400" />
              <h2 className="text-xs font-black text-white uppercase tracking-widest">Paramètres d'Intervention</h2>
            </div>
            
            <div className="space-y-2">
              <label className="text-[0.6rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Type d'Ordre</label>
              <div className="grid grid-cols-2 gap-2">
                {['corrective', 'preventive'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({...formData, type: t})}
                    className={`py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${
                      formData.type === t ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-950/50 border-white/5 text-slate-500 hover:border-white/20'
                    }`}
                  >
                    {t === 'corrective' ? 'Correctif' : 'Préventif'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[0.6rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Priorité</label>
              <div className="grid grid-cols-4 gap-2">
                {['low', 'medium', 'high', 'critical'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormData({...formData, priority: p})}
                    className={`py-3 rounded-xl border font-bold text-[0.6rem] uppercase tracking-widest transition-all ${
                      formData.priority === p 
                        ? p === 'critical' ? 'bg-rose-600/20 border-rose-500 text-rose-400' : 'bg-blue-600/20 border-blue-500 text-blue-400'
                        : 'bg-slate-950/50 border-white/5 text-slate-500 hover:border-white/20'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="azure-card p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-3">
              <Calendar size={16} className="text-purple-400" />
              <h2 className="text-xs font-black text-white uppercase tracking-widest">Planification</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[0.6rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Début Prévu</label>
                <input 
                  type="date"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold text-xs"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.6rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Fin Prévue</label>
                <input 
                  type="date"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold text-xs"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[0.6rem] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Équipe Responsable</label>
              <div className="relative group">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={14} />
                <select 
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold text-xs appearance-none"
                  value={formData.team}
                  onChange={(e) => setFormData({...formData, team: e.target.value})}
                >
                  <option value="">Sélectionner une équipe</option>
                  <option value="Maint-Meca">Equipe Mécanique</option>
                  <option value="Maint-Elec">Equipe Électrique</option>
                  <option value="Maint-Hydrique">Equipe Hydraulique</option>
                  <option value="Utility-Hvac">Equipe HVAC</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6">
          <button 
            type="button"
            onClick={() => router.push('/work-orders')}
            className="flex-1 py-5 rounded-2xl bg-white/5 text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-white/10 border border-white/5 transition-all flex items-center justify-center gap-2"
          >
            <X size={18} /> Annuler
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="flex-[2] py-5 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <div className="animate-spin size-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <Save size={18} /> Créer l'Ordre de Travail (SAP)
              </>
            )}
          </button>
        </div>
      </form>

      {/* SAP Disclaimer */}
      <div className="mt-10 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-500/60 max-w-2xl mx-auto">
        <AlertCircle size={16} />
        <p className="text-[0.65rem] font-bold uppercase tracking-widest leading-relaxed">
          Attention : Cette action génère automatiquement un ID dans le cache SAP B1 via l'intégration RPA de la plateforme.
        </p>
      </div>
    </div>
  );
}
