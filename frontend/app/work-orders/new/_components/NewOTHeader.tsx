import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewOTHeader() {
    const router = useRouter();
    return (
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
    );
}
