import { ArrowLeft } from 'lucide-react'; // Importation de l'icône de retour (flèche gauche)
import { useRouter } from 'next/navigation'; // Outil de routage Next.js pour changer de page

export default function NewOTHeader() {
    const router = useRouter(); // Outil pour pouvoir rediriger l'utilisateur
    return (
        // Conteneur flexible alignant le bouton retour et le titre de la page sur la même ligne
        <div className="flex items-center gap-6 mb-12">
            {/* Bouton de retour vers la liste générale des OTs */}
            <button
                onClick={() => router.push('/work-orders')} // Redirige vers /work-orders
                className="size-14 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5 shadow-xl"
            >
                <ArrowLeft size={28} />
            </button>
            {/* Titre principal et description */}
            <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">Nouvel Ordre de Travail</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">Génération d'une demande d'intervention avancée (SAP)</p>
            </div>
        </div>
    );
}
