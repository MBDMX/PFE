import { Clock, Activity, CheckCircle } from 'lucide-react'; // Importation des icônes Clock (en attente), Activity (en cours) et CheckCircle (terminés)

// Définition de l'interface des propriétés (Props) reçues par ce composant
interface Props {
    orders: any[]; // Le tableau complet de tous nos ordres de travail locaux (IndexedDB)
}

export default function WorkOrdersStats({ orders }: Props) {
    // Configuration des 3 types de statistiques qu'on veut afficher (libellé, clé de statut en base, couleur Tailwind, icône)
    const stats = [
        { label: 'En Attente', status: 'open', color: 'amber', icon: Clock },
        { label: 'En Cours', status: 'in_progress', color: 'blue', icon: Activity },
        { label: 'Terminés', status: 'done', color: 'emerald', icon: CheckCircle },
    ];

    return (
        // Conteneur flexible qui enveloppe les 3 petites cartes de statistiques
        <div className="flex flex-wrap gap-4 mb-8">
            {stats.map(({ label, status, color, icon: Icon }) => (
                // Boucle map sur chaque statistique pour dessiner sa carte visuelle correspondante
                <div key={status} className={`azure-card flex-1 py-4 px-6 flex items-center gap-4 bg-${color}-500/5 border-${color}-500/20`}>
                    {/* Icône de la carte enveloppée dans un carré coloré de fond */}
                    <div className={`size-10 rounded-xl bg-${color}-500/10 flex items-center justify-center text-${color}-500`}>
                        <Icon size={20} />
                    </div>
                    {/* Contenu textuel de la carte */}
                    <div>
                        {/* 📊 OBTENTION DU NOMBRE D'OTs POUR CE STATUT PRÉCIS */}
                        {/* Filtre la liste pour ne garder que les OTs ayant ce statut, puis affiche la longueur de la liste obtenue */}
                        <div className="text-xl font-black text-white">{orders.filter(o => o.status === status).length}</div>
                        {/* Libellé en petites lettres capitales élégantes */}
                        <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
