'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Wrench,
  Package,
  Plus,
  Trash2,
  Clock,
  ListChecks,
  Download
} from 'lucide-react';
import { gmaoApi } from '@/services/api';
import { useToast } from '@/components/ui/toast';

const SAP_TEMPLATES = {
  'preventive': [
    "Inspection visuelle et sonore",
    "Nettoyage des composants critiques",
    "Lubrification / Graissage",
    "Contrôle des serrages et fixations",
    "Test fonctionnel et validation"
  ],
  'moteur': [
    "Démontage du carter de protection",
    "Inspection de l'usure des charbons/balais",
    "Contrôle de l'isolement bobinage",
    "Nettoyage du collecteur",
    "Remontage et test de montée en température"
  ],
  'hydraulique': [
    "Vérification du niveau et état de l'huile",
    "Purge du circuit d'air",
    "Remplacement des crépines/filtres",
    "Contrôle d'étanchéité des raccords",
    "Test de pression nominale"
  ]
};

export default function NewWorkOrder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState<any[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const { success } = useToast();
  
  // Local Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    equipmentId: searchParams.get('machine') || '',
    type: 'corrective',
    priority: 'medium',
    location: '',
    team: '',
    technicianId: '',
    responsiblePerson: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString().slice(0, 16) // "YYYY-MM-DDTHH:mm"
  });

  // Steps / Tasks Logic
  const [steps, setSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState('');

  // Spare Parts Logic
  const [selectedParts, setSelectedParts] = useState<any[]>([]);
  const [currentPartCode, setCurrentPartCode] = useState('');
  const [currentPartQty, setCurrentPartQty] = useState(1);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [mats, techs, items] = await Promise.all([
          gmaoApi.getMachines(),
          gmaoApi.getTechnicians(),
          gmaoApi.getStock()
        ]);
        setMachines(mats);
        setAllTechnicians(techs);
        setStock(items);

        // Prefill location if machine is in query
        const prefillRef = searchParams.get('machine');
        if (prefillRef) {
          const machine = mats.find((m: any) => m.reference === prefillRef);
          if (machine) setFormData(prev => ({...prev, location: machine.location}));
        }
      } catch (err) {
        console.error("Failed to load data", err);
      }
    };
    loadInitialData();
  }, [searchParams]);

  // Filter technicians based on selected team
  const filteredTechs = allTechnicians.filter(t => t.team === formData.team);

  const handleAddPart = () => {
    if (!currentPartCode) return;
    const part = stock.find(s => s.reference === currentPartCode);
    if (!part) return;

    const existingIndex = selectedParts.findIndex(p => p.part_code === currentPartCode);
    if (existingIndex >= 0) {
      const updated = [...selectedParts];
      updated[existingIndex].quantity += currentPartQty;
      setSelectedParts(updated);
    } else {
      setSelectedParts([...selectedParts, { 
        part_code: part.reference, 
        part_name: part.name, 
        quantity: currentPartQty 
      }]);
    }
    setCurrentPartCode('');
    setCurrentPartQty(1);
  };

  const handleRemovePart = (code: string) => {
    setSelectedParts(selectedParts.filter(p => p.part_code !== code));
  };

  const handleAddStep = () => {
    if (currentStep.trim()) {
      setSteps([...steps, currentStep.trim()]);
      setCurrentStep('');
    }
  };

  const handleImportTemplate = (type: keyof typeof SAP_TEMPLATES) => {
    setSteps([...steps, ...SAP_TEMPLATES[type]]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        parts: selectedParts,
        steps: steps
      };
      const res = await gmaoApi.createWorkOrder(payload);
      if (res.offline) {
        success('Mode Hors-Ligne', 'L\'ordre de travail est enregistré localement.');
      } else {
        success('Ordre de Travail créé', `${res.sap_order_id || 'SAP Confirmation'} enregistré.`);
      }
      router.push('/work-orders');
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="flex items-center gap-6 mb-12">
        <button 
          onClick={() => router.push('/work-orders')}
          className="size-14 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5 shadow-xl"
        >
          <ArrowLeft size={28} />
        </button>
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">Nouvel Ordre de Travail</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">Génération d'une demande d'intervention avancée (SAP)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* ── Section 1: Informations Principales ── */}
        <div className="azure-card p-10 space-y-10">
          <div className="space-y-4">
            <label className="text-[0.75rem] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">Titre de l'Intervention</label>
            <div className="relative group">
              <FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
              <input 
                required
                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold text-xl placeholder:text-slate-600"
                placeholder="ex: Réparation fuite d'huile - Presse Hydraulique P5"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-[0.75rem] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">Machine / Équipement</label>
              <div className="relative group">
                <Wrench className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                <select 
                  required
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold text-lg appearance-none cursor-pointer"
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

            <div className="space-y-4">
              <label className="text-[0.75rem] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">Localisation</label>
              <div className="relative group">
                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                <input 
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold text-lg"
                  placeholder="Atelier Nord - Zone A"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[0.75rem] font-black text-slate-500 uppercase tracking-[0.25em] ml-1">Description Technique</label>
            <textarea 
              rows={4}
              className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-6 text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium text-lg leading-relaxed placeholder:text-slate-600"
              placeholder="Détaillez les symptômes observés ou les travaux planifiés..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
        </div>

        {/* ── Section 2: Assignation & Pièces ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Assignment Card */}
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
                onChange={(e) => setFormData({...formData, team: e.target.value, technicianId: '', responsiblePerson: ''})}
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
                <div className="relative">
                  <select 
                    required
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-violet-500/50 font-bold text-base appearance-none"
                    value={formData.technicianId}
                    onChange={(e) => {
                      const tech = allTechnicians.find(t => t.id === Number(e.target.value));
                      setFormData({...formData, technicianId: e.target.value, responsiblePerson: tech?.name || ''});
                    }}
                  >
                    <option value="">Choisir un membre de l'équipe ({filteredTechs.length})</option>
                    {filteredTechs.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
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
                  onChange={(e) => setFormData({...formData, createdAt: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Spare Parts Card */}
          <div className="azure-card p-10 flex flex-col">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-5">
              <Package size={24} className="text-emerald-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Pièces de Rechange Requises</h2>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="col-span-2">
                <select 
                  className="w-full bg-slate-950 border border-white/10 rounded-[1.25rem] py-4 px-5 text-white text-sm font-bold appearance-none"
                  value={currentPartCode}
                  onChange={(e) => setCurrentPartCode(e.target.value)}
                >
                  <option value="">Chercher une pièce...</option>
                  {stock.map(s => (
                    <option key={s.id} value={s.reference}>{s.name} ({s.quantity} dispo)</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input 
                  type="number"
                  min="1"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 px-4 text-white text-center font-bold"
                  value={currentPartQty}
                  onChange={(e) => setCurrentPartQty(Number(e.target.value))}
                />
                <button 
                  type="button"
                  onClick={handleAddPart}
                  className="size-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-950/30 rounded-3xl border border-white/5 overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto px-4 py-2 custom-scrollbar">
                {selectedParts.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-600 opacity-50 italic text-sm text-center">
                    <Package size={32} className="mb-2" />
                    Aucune pièce ajoutée
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    {selectedParts.map((p) => (
                      <div key={p.part_code} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group">
                        <div>
                          <div className="text-sm font-bold text-white">{p.part_name}</div>
                          <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">{p.part_code} × {p.quantity}</div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemovePart(p.part_code)}
                          className="size-10 rounded-xl hover:bg-rose-500/10 text-slate-600 hover:text-rose-500 flex items-center justify-center transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 3: Étapes / Checklist d'intervention ── */}
        <div className="azure-card p-10 space-y-8">
          <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-5">
            <div className="flex items-center gap-3">
              <ListChecks size={24} className="text-sky-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Étapes / Checklist d'Intervention</h2>
            </div>
            
            {/* SAP Import Buttons */}
            <div className="flex items-center gap-3">
              <p className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest mr-2">Importer gamme SAP :</p>
              <button 
                type="button"
                onClick={() => handleImportTemplate('preventive')}
                className="px-3 py-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-[0.6rem] font-black text-sky-400 uppercase tracking-widest hover:bg-sky-500/20 transition-all"
              >
                Gamme-PV
              </button>
              <button 
                type="button"
                onClick={() => handleImportTemplate('moteur')}
                className="px-3 py-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-[0.6rem] font-black text-sky-400 uppercase tracking-widest hover:bg-sky-500/20 transition-all"
              >
                Révision-M
              </button>
              <button 
                type="button"
                onClick={() => handleImportTemplate('hydraulique')}
                className="px-3 py-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-[0.6rem] font-black text-sky-400 uppercase tracking-widest hover:bg-sky-500/20 transition-all"
              >
                Gamme-HYD
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="relative flex-1 group">
                <input 
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-white text-base font-bold placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 transition-all"
                  placeholder="Ajouter une étape manuelle (ex: Vérifier le serrage moteur)"
                  value={currentStep}
                  onChange={(e) => setCurrentStep(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStep())}
                />
              </div>
              <button 
                type="button"
                onClick={handleAddStep}
                className="size-14 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-lg shadow-sky-500/20"
              >
                <Plus size={26} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:border-sky-500/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="size-8 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center text-xs font-black">
                      {i + 1}
                    </div>
                    <span className="text-sm font-bold text-slate-200">{s}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSteps(steps.filter((_, idx) => idx !== i))}
                    className="size-8 rounded-lg hover:bg-rose-500/10 text-slate-700 hover:text-rose-500 flex items-center justify-center transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {steps.length === 0 && (
                <div className="md:col-span-2 py-10 flex flex-col items-center justify-center text-slate-700 border-2 border-dashed border-white/5 rounded-2xl">
                  <Download size={32} className="mb-2 opacity-20" />
                  <p className="text-xs font-black uppercase tracking-widest opacity-30">Aucune étape définie pour cet OT</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-6 pt-10">
          <button 
            type="button"
            onClick={() => router.push('/work-orders')}
            className="flex-1 py-6 rounded-[2rem] bg-white/5 text-slate-400 font-black uppercase text-sm tracking-[0.2em] hover:bg-white/10 border border-white/5 transition-all flex items-center justify-center gap-3"
          >
            <X size={20} /> Annuler
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="flex-[2] py-6 rounded-[2rem] bg-blue-600 text-white font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-blue-500/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin size-6 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <Save size={20} /> Transmettre l'Ordre à SAP
              </>
            )}
          </button>
        </div>
      </form>

      {/* SAP Disclaimer */}
      <div className="mt-12 flex items-center justify-center gap-4 px-10 py-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 text-amber-500/60 max-w-3xl mx-auto">
        <AlertCircle size={20} />
        <p className="text-[0.7rem] font-black uppercase tracking-[0.15em] leading-relaxed text-center">
          Système Connecté : Cette action génère un ID d'ordre permanent synchronisé avec SAP RPA.
        </p>
      </div>
    </div>
  );
}
