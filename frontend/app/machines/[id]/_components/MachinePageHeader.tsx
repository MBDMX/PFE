import { ArrowLeft, Printer } from 'lucide-react'; // Importation des icônes Retour (Flèche gauche) et Imprimante
import { useRouter } from 'next/navigation'; // Outil de routage de Next.js pour retourner à la page précédente

interface Props {
    reference: string; // Référence de la machine issue de SAP B1
}

export default function MachinePageHeader({ reference }: Props) {
    const router = useRouter(); // Router : navigation
    return (
        // Conteneur flexible alignant le bouton Retour à gauche et les actions à droite
        <div className="flex items-center justify-between mb-8">
            
            {/* ⬅️ BOUTON RETOUR : Permet de revenir à la page du Parc Machines */}
            <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600/20 transition-all">
                    <ArrowLeft size={18} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Parc Machines</span>
            </button>
            
            {/* 🛠️ DROITE : Bouton d'impression PDF et Badge de Référence SAP */}
            <div className="flex items-center gap-3">
                {/* Bouton d'impression : déclenche l'imprimante système ou génère un PDF de la fiche machine */}
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/30 text-white transition-all group no-print"
                >
                    <Printer size={16} className="text-blue-400" />
                    <span className="text-[0.65rem] font-black uppercase tracking-widest">Générer Rapport PDF</span>
                </button>
                
                {/* Badge affichant le code d'équipement SAP Business One */}
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">
                    Réf SAP : {reference}
                </div>
            </div>
        </div>
    );
}
