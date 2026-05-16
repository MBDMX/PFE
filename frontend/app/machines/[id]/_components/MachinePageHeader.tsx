import { ArrowLeft, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    reference: string;
}

export default function MachinePageHeader({ reference }: Props) {
    const router = useRouter();
    return (
        <div className="flex items-center justify-between mb-8">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600/20 transition-all">
                    <ArrowLeft size={18} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Parc Machines</span>
            </button>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/30 text-white transition-all group no-print"
                >
                    <Printer size={16} className="text-blue-400" />
                    <span className="text-[0.65rem] font-black uppercase tracking-widest">Générer Rapport PDF</span>
                </button>
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">
                    Réf SAP : {reference}
                </div>
            </div>
        </div>
    );
}
