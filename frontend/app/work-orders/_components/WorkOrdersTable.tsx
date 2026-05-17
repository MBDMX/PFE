import { useRouter } from 'next/navigation'; // Navigation Next.js pour changer de page
// Importation des icônes vectorielles esthétiques
import { ClipboardList, User, Calendar, ArrowUpRight, Loader2, Trash2, ArrowUp, ArrowDown, Clock, Activity, AlertTriangle, CheckCircle, X } from 'lucide-react';

// Types TypeScript pour valider les données de notre composant
type WOStatus = 'open' | 'in_progress' | 'done' | 'closed' | 'pending_deletion';
type WorkOrder = { id: number; sap_order_id: string; title: string; equipment_id: string; technician_id: number | null; priority: string; status: WOStatus; planned_start_date: string; created_by?: number; };

// Interface décrivant toutes les variables et fonctions fournies au composant par son parent
interface Props {
    orders: WorkOrder[]; // Les interventions filtrées et triées à afficher
    loading: boolean; // Si vrai, affiche un squelette de chargement animé (skeleton loader)
    isUpdating: number | null; // ID de la ligne en cours d'action pour afficher un sablier sur son bouton
    sortField: string; // Nom de la colonne actuellement triée
    sortOrder: 'asc' | 'desc'; // Sens du tri (croissant/décroissant)
    isManager: boolean; // Droit du manager (vrai/faux)
    currentUserId?: number; // ID de l'utilisateur connecté
    onSort: (field: string) => void; // Fonction déclenchée quand on clique sur une colonne pour trier
    onDelete: (order: WorkOrder) => void; // Fonction déclenchée lors du clic sur Supprimer
    onNavigate: (id: number) => void; // Fonction pour naviguer vers la fiche de l'OT
    formatDate: (d: string | null) => string; // Fonction pour formater les dates joliment
}

// 🎨 CARTE DE CORRESPONDANCE DES STATUTS (Labels, couleurs et icônes)
const STATUS_MAP: Record<string, any> = {
    open: { label: 'Ouvert', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock },
    in_progress: { label: 'En cours', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Activity },
    pending_deletion: { label: 'Attente Suppr.', color: 'text-rose-500', bg: 'bg-rose-500/10', icon: AlertTriangle },
    done: { label: 'Terminé', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle },
    closed: { label: 'Clôturé', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: X },
};

// 🎨 CARTE DE CORRESPONDANCE DES PRIORITÉS (Libellés, bordures et couleurs)
const PRIORITY_MAP: Record<string, any> = {
    high: { label: 'High', color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/10' },
    critical: { label: 'Critical', color: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-500/10' },
    urgent: { label: 'Critical', color: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-500/10' },
    low: { label: 'Low', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
    medium: { label: 'Medium', color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/10' },
};

// Petite flèche indiquant visuellement si la colonne est triée de manière ascendante (ArrowUp) ou descendante (ArrowDown)
const SortIcon = ({ field, sortField, sortOrder }: { field: string; sortField: string; sortOrder: string }) =>
    sortField === field ? (sortOrder === 'asc' ? <ArrowUp size={12} className="text-blue-400" /> : <ArrowDown size={12} className="text-blue-400" />) : null;

export default function WorkOrdersTable({ orders, loading, isUpdating, sortField, sortOrder, isManager, currentUserId, onSort, onDelete, onNavigate, formatDate }: Props) {
    // Déclaration des colonnes de notre tableau avec leur clé de tri (field) correspondante
    const cols = [
        { field: 'title', label: 'Intervention' },
        { field: 'priority', label: 'Priorité' },
        { field: null, label: 'Assigné à' },
        { field: 'status', label: 'Statut' },
        { field: 'planned_start_date', label: 'Échéance' },
    ];

    return (
        <div className="azure-card p-0 overflow-hidden shadow-2xl">
            <div className="azure-table-wrap">
                <table className="azure-table">
                    
                    {/* 1. EN-TÊTE DU TABLEAU (COLONNES CLICQUABLES POUR TRIER) */}
                    <thead>
                        <tr>
                            {cols.map(col => (
                                <th key={col.label} onClick={col.field ? () => onSort(col.field!) : undefined} className={col.field ? 'cursor-pointer hover:bg-white/5 transition-colors select-none' : 'select-none'}>
                                    <div className="flex items-center gap-2">
                                        {col.label} 
                                        {/* Affiche le symbole fléché du tri si cette colonne est triée */}
                                        {col.field && <SortIcon field={col.field} sortField={sortField} sortOrder={sortOrder} />}
                                    </div>
                                </th>
                            ))}
                            <th className="text-right select-none">Actions</th>
                        </tr>
                    </thead>
                    
                    {/* 2. CORPS DU TABLEAU (RÉSULTATS) */}
                    <tbody>
                        
                        {/* CAS A : LE COMPOSANT CHARGE (Affiche des barres grises animées) */}
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="py-8"><div className="h-4 bg-white/5 rounded-full w-3/4 mx-auto" /></td>
                                </tr>
                            ))
                        ) : orders.length > 0 ? (
                            
                            // CAS B : IL Y A DES RÉSULTATS (Boucle map sur chaque intervention)
                            orders.map(o => {
                                const status = STATUS_MAP[o.status] || STATUS_MAP.open; // Style correspondant au statut actuel
                                const priority = PRIORITY_MAP[(o.priority || 'medium').toLowerCase()] || PRIORITY_MAP.medium; // Style pour la priorité
                                // Un utilisateur peut supprimer un OT s'il est manager OU s'il en est l'auteur créateur
                                const canDelete = isManager || Number(o.created_by) === Number(currentUserId);
                                
                                return (
                                    <tr key={o.id} className="group transition-colors hover:bg-white/[0.01]">
                                        
                                        {/* Colonne 1 : Titre de la panne + Code SAP + Machine concernée */}
                                        <td>
                                            <div className="flex items-center gap-4">
                                                {/* Petit carré esthétique avec l'icône de document à gauche */}
                                                <div className="size-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20"><ClipboardList size={20} /></div>
                                                <div>
                                                    <div className="font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight text-sm">#{o.sap_order_id || o.id} - {o.title}</div>
                                                    <div className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mt-1">Machine: {o.equipment_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* Colonne 2 : Badge de priorité coloré */}
                                        <td><span className={`px-2 py-0.5 rounded-md border text-[0.6rem] font-black uppercase tracking-widest ${priority.border} ${priority.color} ${priority.bg}`}>{priority.label}</span></td>
                                        
                                        {/* Colonne 3 : Nom ou ID du technicien assigné à la tâche */}
                                        <td><div className="flex items-center gap-2 text-slate-400"><User size={14} className="text-slate-600" /><span className="font-bold text-xs uppercase tracking-tight">Tech ID: {o.technician_id || '--'}</span></div></td>
                                        
                                        {/* Colonne 4 : Badge avec le statut actuel (Ouvert, En cours, Terminé...) */}
                                        <td><div className={`azure-badge ${status.bg} ${status.color}`}><status.icon size={12} /><span className="uppercase tracking-widest font-black leading-none">{status.label}</span></div></td>
                                        
                                        {/* Colonne 5 : Date d'échéance formatée de l'intervention */}
                                        <td><div className="flex items-center gap-2 text-slate-500 font-bold text-[0.7rem] uppercase tracking-widest"><Calendar size={12} />{formatDate(o.planned_start_date)}</div></td>
                                        
                                        {/* Colonne 6 (Actions) : Boutons d'accès aux détails et de suppression */}
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2 pr-2">
                                                {/* Bouton fléché pour aller sur la fiche détaillée de l'OT */}
                                                <button onClick={() => onNavigate(o.id)} title="Voir les détails" className="size-9 rounded-lg bg-white/5 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 flex items-center justify-center transition-all"><ArrowUpRight size={14} /></button>
                                                
                                                {/* Affiche le bouton poubelle (supprimer) uniquement si l'utilisateur a l'autorisation */}
                                                {canDelete && (
                                                    <button onClick={() => onDelete(o)} disabled={isUpdating === o.id} title="Supprimer" className="size-9 rounded-lg bg-white/5 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all">
                                                        {/* Affiche un cercle qui tourne (Loader2) si l'OT est en cours d'effacement */}
                                                        {isUpdating === o.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            // CAS C : AUCUN RÉSULTAT EN BASE DE DONNÉES
                            <tr><td colSpan={6} className="py-20 text-center text-slate-500 italic font-medium">Aucun ordre de travail trouvé</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
