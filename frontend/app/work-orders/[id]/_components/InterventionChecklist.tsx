import { Check } from 'lucide-react';
import { gmaoApi } from '../../../../services/api';
import { useToast } from '../../../../components/ui/toast';
import { db } from '../../../../lib/db';

interface Props {
    order: any;
    workOrderId: string;
}

export default function InterventionChecklist({ order, workOrderId }: Props) {
    const { success, error } = useToast();

    if (!order.steps || order.steps.length === 0) return null;

    const handleToggle = async (step: any) => {
        try {
            const updatedStep = await gmaoApi.toggleStep(step.id, !step.is_done);
            const freshWO = await gmaoApi.getWorkOrder(workOrderId);
            await db.workOrders.put(freshWO);
            if (updatedStep.offline) success('Action enregistrée (Mode Offline)');
        } catch {
            error("Erreur lors de la mise à jour de l'étape");
        }
    };

    return (
        <div className="mt-8 pt-8 border-t border-white/5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[0.7rem] font-black text-slate-400 uppercase tracking-[0.2em]">Checklist d'Intervention</h3>
                <div className="text-[0.6rem] font-black px-2 py-1 bg-sky-500/10 text-sky-400 rounded-lg uppercase tracking-widest">
                    {order.steps.filter((s: any) => s.is_done).length} / {order.steps.length} complétées
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {order.steps
                    .sort((a: any, b: any) => a.order_index - b.order_index)
                    .map((step: any) => (
                        <button
                            key={step.id}
                            onClick={() => handleToggle(step)}
                            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${step.is_done ? 'bg-emerald-500/5 border-emerald-500/20 opacity-80' : 'bg-white/5 border-white/5 hover:border-sky-500/30'}`}
                        >
                            <div className={`size-6 rounded-lg border-2 flex items-center justify-center transition-all ${step.is_done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700 group-hover:border-sky-500/50'}`}>
                                {step.is_done && <Check size={14} strokeWidth={4} />}
                            </div>
                            <span className={`text-sm font-bold transition-all ${step.is_done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                {step.description}
                            </span>
                        </button>
                    ))}
            </div>
        </div>
    );
}
