import { Zap, Brain, History } from 'lucide-react';
import { gmaoApi } from '@/services/api';

interface MlDateInfo {
    date: Date | null;
    isOverdue: boolean;
    daysUntil: number;
}

interface Props {
    machine: any;
    mlData: any;
    score: number;
    mlDateInfo: MlDateInfo;
    triggering: boolean;
    onTriggerMaintenance: () => void;
    onRefresh: () => void;
}

export default function MachineActionButtons({ machine, mlData, score, mlDateInfo, triggering, onTriggerMaintenance, onRefresh }: Props) {
    const handleMLWorkOrder = async () => {
        const targetDate = mlDateInfo.isOverdue || !mlDateInfo.date ? new Date() : mlDateInfo.date;
        const dateStr = targetDate.toISOString().split('T')[0];
        try {
            await gmaoApi.createWorkOrder({
                title: `[ML] Maintenance Prédictive — ${machine.name}`,
                type: 'preventive',
                priority: (score < 50 || mlDateInfo.isOverdue) ? 'high' : 'medium',
                equipment_id: String(machine.id),
                planned_start_date: dateStr,
                description: `Intervention suggérée par l'algorithme ML. MTBF: ${mlData.mtbf_days}j | Score: ${score}%`
            });
            window.dispatchEvent(new CustomEvent('api:success', { detail: 'OT Prédictif créé' }));
            onRefresh();
        } catch {
            window.dispatchEvent(new CustomEvent('api:error', { detail: 'Erreur création OT' }));
        }
    };

    const handleTransferStock = async () => {
        const item_code = window.prompt('Référence de la pièce à transférer :', '');
        if (!item_code) return;
        const qtyStr = window.prompt('Quantité :', '1');
        if (!qtyStr) return;
        const quantity = parseFloat(qtyStr);
        if (isNaN(quantity)) return;
        try {
            await gmaoApi.transferStock({ item_code, quantity, from_wh: '01', to_wh: '02' });
            window.dispatchEvent(new CustomEvent('api:success', { detail: 'Transfert SAP réussi !' }));
        } catch {
            window.dispatchEvent(new CustomEvent('api:error', { detail: 'Échec du transfert SAP' }));
        }
    };

    return (
        <div className="mt-4 space-y-2">
            {/* SAP Preventive */}
            <button
                onClick={onTriggerMaintenance}
                disabled={triggering}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black uppercase text-[0.65rem] tracking-widest transition-all flex items-center justify-center gap-2"
            >
                <Zap size={14} className={triggering ? 'animate-spin' : ''} />
                {triggering ? 'Synchronisation SAP...' : 'Déclencher Prévention SAP'}
            </button>

            {/* ML Suggestion */}
            {mlData?.mtbf_days != null && (
                <button
                    onClick={handleMLWorkOrder}
                    className={`w-full py-3 rounded-xl border font-black uppercase text-[0.65rem] tracking-widest transition-all flex items-center justify-center gap-2 ${mlDateInfo.isOverdue ? 'bg-rose-600/20 hover:bg-rose-600/40 border-rose-500/30 text-rose-300' : 'bg-blue-600/20 hover:bg-blue-600/40 border-blue-500/30 text-blue-300'}`}
                >
                    <Brain size={14} />
                    {mlDateInfo.isOverdue ? 'Urgence : Appliquer Correction ML' : 'Suivre Suggestion IA'}
                </button>
            )}

            {/* Stock Transfer */}
            <button
                onClick={handleTransferStock}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-black uppercase text-[0.65rem] tracking-widest transition-all flex items-center justify-center gap-2"
            >
                <History size={14} />
                Transfert de Pièces (Inter-Dépôts)
            </button>
        </div>
    );
}
