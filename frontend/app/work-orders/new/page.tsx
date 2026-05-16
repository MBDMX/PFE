'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Save, AlertCircle } from 'lucide-react';
import { gmaoApi } from '@/services/api';
import { useToast } from '@/components/ui/toast';
import NewOTHeader from './_components/NewOTHeader';
import MainInfoSection from './_components/MainInfoSection';
import AssignmentSection from './_components/AssignmentSection';
import SparePartsSection from './_components/SparePartsSection';
import ChecklistSection from './_components/ChecklistSection';

export default function NewWorkOrder() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center text-slate-500 animate-pulse uppercase font-black text-xs tracking-widest">Initialisation...</div>}>
            <NewWorkOrderContent />
        </Suspense>
    );
}

function NewWorkOrderContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(false);
    const [machines, setMachines] = useState<any[]>([]);
    const [allTechnicians, setAllTechnicians] = useState<any[]>([]);
    const [steps, setSteps] = useState<string[]>([]);
    const [currentStep, setCurrentStep] = useState('');
    const [selectedParts, setSelectedParts] = useState<any[]>([]);
    const [aiResults, setAiResults] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        title: '', description: '', equipmentId: searchParams.get('machine') || '',
        type: 'corrective', priority: 'medium', location: '', team: '',
        technicianId: '', responsiblePerson: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString().slice(0, 16),
    });

    useEffect(() => {
        const load = async () => {
            try {
                const [mats, techs] = await Promise.all([gmaoApi.getMachines(), gmaoApi.getTechnicians()]);
                setMachines(mats);
                setAllTechnicians(techs);
                const prefillRef = searchParams.get('machine');
                if (prefillRef) {
                    const m = mats.find((m: any) => m.reference === prefillRef);
                    if (m) setFormData(prev => ({ ...prev, location: m.location }));
                }
            } catch (err) { console.error('Failed to load data', err); }
        };
        load();
    }, [searchParams]);

    const handleChange = (updates: Partial<typeof formData>) => setFormData(prev => ({ ...prev, ...updates }));

    const handleAddPart = (part: any) => {
        const idx = selectedParts.findIndex(p => p.part_code === part.part_code);
        if (idx >= 0) { const updated = [...selectedParts]; updated[idx].quantity += 1; setSelectedParts(updated); }
        else setSelectedParts([...selectedParts, part]);
        setAiResults([]);
    };

    const handleAddStep = () => { if (currentStep.trim()) { setSteps([...steps, currentStep.trim()]); setCurrentStep(''); } };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await gmaoApi.createWorkOrder({ ...formData, parts: selectedParts, steps });
            res.offline
                ? success('Mode Hors-Ligne', "L'ordre de travail est enregistré localement.")
                : success('Ordre de Travail créé', `${res.sap_order_id || 'SAP Confirmation'} enregistré.`);
            router.push('/work-orders');
        } catch (err: any) {
            const msg = err.response?.data?.detail || "Erreur lors de la création de l'OT";
            toastError('Erreur SAP', Array.isArray(msg) ? msg.join(', ') : msg);
            setLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto py-12 px-6">
            <NewOTHeader />
            <form onSubmit={handleSubmit} className="space-y-8">
                <MainInfoSection formData={formData} machines={machines} onChange={handleChange} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <AssignmentSection formData={formData} allTechnicians={allTechnicians} onChange={handleChange} />
                    <SparePartsSection selectedParts={selectedParts} aiResults={aiResults} onAiSearch={setAiResults} onAddPart={handleAddPart} onRemovePart={code => setSelectedParts(selectedParts.filter(p => p.part_code !== code))} />
                </div>

                <ChecklistSection steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} onAddStep={handleAddStep} onRemoveStep={i => setSteps(steps.filter((_, idx) => idx !== i))} onImportTemplate={type => setSteps([...steps, ...{ preventive: ['Inspection visuelle et sonore', 'Nettoyage des composants critiques', 'Lubrification / Graissage', 'Contrôle des serrages et fixations', 'Test fonctionnel et validation'], moteur: ['Démontage du carter de protection', "Inspection de l'usure des charbons/balais", "Contrôle de l'isolement bobinage", 'Nettoyage du collecteur', 'Remontage et test de montée en température'], hydraulique: ["Vérification du niveau et état de l'huile", "Purge du circuit d'air", 'Remplacement des crépines/filtres', "Contrôle d'étanchéité des raccords", 'Test de pression nominale'] }[type]])} />

                <div className="flex gap-6 pt-10">
                    <button type="button" onClick={() => router.push('/work-orders')} className="flex-1 py-6 rounded-[2rem] bg-white/5 text-slate-400 font-black uppercase text-sm tracking-[0.2em] hover:bg-white/10 border border-white/5 transition-all flex items-center justify-center gap-3">
                        <X size={20} /> Annuler
                    </button>
                    <button type="submit" disabled={loading} className="flex-[2] py-6 rounded-[2rem] bg-blue-600 text-white font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-blue-500/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                        {loading ? <div className="animate-spin size-6 border-2 border-white/30 border-t-white rounded-full" /> : <><Save size={20} /> Transmettre l'Ordre à SAP</>}
                    </button>
                </div>
            </form>

            <div className="mt-12 flex items-center justify-center gap-4 px-10 py-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 text-amber-500/60 max-w-3xl mx-auto">
                <AlertCircle size={20} />
                <p className="text-[0.7rem] font-black uppercase tracking-[0.15em] leading-relaxed text-center">Système Connecté : Cette action génère un ID d'ordre permanent synchronisé avec SAP RPA.</p>
            </div>
        </div>
    );
}
