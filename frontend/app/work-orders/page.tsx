'use client'; // Indique à Next.js que ce fichier s'exécute côté navigateur (composant interactif)

import { useState, useEffect } from 'react'; // Importation des fonctions React pour gérer les variables d'état (useState) et le chargement (useEffect)
import { useRouter } from 'next/navigation'; // Importation du système de navigation de Next.js pour changer de page

// useLiveQuery : Fonction de Dexie qui met à jour la page automatiquement dès que la base IndexedDB locale change
import { useLiveQuery } from 'dexie-react-hooks'; 
import { db } from '@/lib/db'; // Importation de la base de données IndexedDB locale (Dexie)
import { gmaoApi } from '@/services/api'; // Importation des fonctions pour parler au serveur FastAPI
import { useToast } from '@/components/ui/toast'; // Importation du système d'affichage de petites notifications (toasts) à l'écran

// Importation des sous-composants visuels qui structurent notre page
import WorkOrdersHeader from './_components/WorkOrdersHeader'; // Le haut de la page (titre + bouton synchro)
import WorkOrdersStats from './_components/WorkOrdersStats'; // Les petites cartes de statistiques en haut
import WorkOrdersFilters from './_components/WorkOrdersFilters'; // La barre de recherche et le menu de sélection du statut
import WorkOrdersTable from './_components/WorkOrdersTable'; // Le tableau qui liste toutes les interventions

// Définition des statuts possibles pour un Ordre de Travail (OT)
type WOStatus = 'open' | 'in_progress' | 'done' | 'closed' | 'pending_deletion';

// Définition de la structure exacte (champs et types) de l'objet "WorkOrder" en TypeScript
type WorkOrder = { 
    id: number; // Identifiant local unique (nombre entier)
    sap_order_id: string; // Identifiant correspondant dans SAP Business One (texte)
    title: string; // Titre de l'intervention (ex: "Panne de la ventilation")
    equipment_id: string; // Identifiant de la machine en panne
    technician_id: number | null; // ID du technicien assigné à la tâche (peut être nul si personne)
    priority: string; // Priorité (low, medium, high, critical)
    status: WOStatus; // Statut actuel de l'intervention
    planned_start_date: string; // Date prévue pour le début des travaux
    created_by?: number; // ID de l'utilisateur qui a créé le bon de travail
};

export default function WorkOrdersPage() {
    const router = useRouter(); // router : Outil pour pouvoir rediriger l'utilisateur vers une autre page (ex: détails d'un OT)
    const { success, error: toastError } = useToast(); // success / toastError : Fonctions pour afficher de beaux messages pop-up
    
    // VARIABLES D'ÉTAT (REACT STATES) : Gèrent ce qui s'affiche à l'écran en temps réel
    const [loading, setLoading] = useState(true); // loading : Si vrai (true), affiche un cercle qui tourne pour faire patienter l'utilisateur
    const [searchTerm, setSearchTerm] = useState(''); // searchTerm : Stocke le texte que l'utilisateur écrit pour chercher un OT
    const [statusFilter, setStatusFilter] = useState('all'); // statusFilter : Filtre pour n'afficher qu'un seul statut (par défaut 'all' = tout)
    const [isUpdating, setIsUpdating] = useState<number | null>(null); // isUpdating : Stocke l'ID de l'OT en cours de suppression pour afficher un spinner sur son bouton
    const [isSyncing, setIsSyncing] = useState(false); // isSyncing : Si vrai, indique que la synchronisation avec SAP est en cours
    const [mounted, setMounted] = useState(false); // mounted : Permet de s'assurer que le composant est bien chargé dans le navigateur
    const [sortField, setSortField] = useState('id'); // sortField : Nom de la colonne sur laquelle on trie le tableau (par défaut par ID)
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // sortOrder : Sens du tri ('asc' = du plus petit au plus grand, 'desc' = inverse)

    // RÉCUPÉRATION DU RÔLE UTILISATEUR :
    const currentUser = gmaoApi.getCurrentUser(); // Récupère les infos de l'utilisateur connecté depuis le cache local (localStorage)
    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin'; // isManager : Vrai si l'utilisateur est un responsable ou un administrateur
    const showSyncBtn = mounted && (isManager || currentUser?.role === 'technician'); // showSyncBtn : Vrai si l'utilisateur a le droit de cliquer sur "Synchroniser SAP"

    // 📡 1. LECTURE AUTOMATIQUE DU CACHE LOCAL (INDEXEDDB - DEXIE)
    // Ce hook lit instantanément la table 'workOrders' de notre base de données du navigateur.
    // Si la base locale change (ajout, modif, suppression), la page se rafraîchit automatiquement !
    const orders = useLiveQuery(() => db.workOrders.toArray(), [], [] as WorkOrder[]) as WorkOrder[];

    // 🔄 2. CHARGEMENT AUTOMATIQUE DES DONNÉES DEPUIS LE SERVEUR
    // S'exécute une seule fois au chargement de la page
    useEffect(() => {
        setMounted(true); // Indique à React que le composant est prêt
        setLoading(true); // Déclenche l'animation de chargement
        // Demande au serveur FastAPI de renvoyer les OTs les plus récents et de mettre à jour la base locale
        gmaoApi.getWorkOrders().finally(() => setLoading(false)); // Une fois fini (réussi ou échoué), on arrête le chargement
    }, []);

    // 🔌 3. ACTION : SYNCHRONISATION EN DIRECT AVEC SAP (SERVICE LAYER)
    async function handleSyncSAP() {
        setIsSyncing(true); // Affiche le spinner "En cours..." sur le bouton
        try {
            await gmaoApi.syncWorkOrdersFromSap(); // Appelle FastAPI qui va contacter le Service Layer de SAP Business One
            success('Synchronisation SAP réussie', 'Les ordres de travail ont été mis à jour.'); // Notification de succès
            await gmaoApi.getWorkOrders(); // Recharge les données locales fraîches dans IndexedDB
        } catch { 
            toastError('Erreur de synchronisation', 'Impossible de joindre le serveur SAP.'); // Notification d'échec si le réseau coupe
        } finally { 
            setIsSyncing(false); // Arrête le spinner sur le bouton
        }
    }

    // 🗑️ 4. ACTION : DEMANDE OU ACTION DE SUPPRESSION
    async function handleDelete(order: WorkOrder) {
        // Demande de confirmation à l'utilisateur avant d'agir
        if (!confirm(isManager ? 'Supprimer définitivement cet OT ?' : 'Demander la suppression de votre OT ?')) return;
        setIsUpdating(order.id); // Met un spinner de chargement spécifique sur la ligne de cet OT
        try { 
            await gmaoApi.deleteWorkOrder(order.id); // Demande à FastAPI de supprimer ou de mettre en attente la suppression
        } catch (err) { 
            console.error('Delete failed', err); // Affiche l'erreur dans la console de développement en cas de bug
        } finally { 
            setIsUpdating(null); // Enlève le spinner de chargement de la ligne
        }
    }

    // 📅 FONCTION UTILITAIRE : FORMATAGE LISIBLE DE LA DATE ET DE L'HEURE
    const formatDate = (dateStr: string | null) => {
        if (!dateStr || dateStr.startsWith('0001-01-01')) return 'Non planifié'; // Gère le cas des dates vides renvoyées par SAP
        try {
            const d = new Date(dateStr); // Crée un objet Date JavaScript
            // Renvoie au format français "DD/MM/YYYY à HHhMM" (ex: "17/05/2026 à 15h30")
            return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
        } catch { 
            return dateStr; // En cas d'erreur de format, renvoie le texte brut sans modification
        }
    };

    // ↕️ FONCTION INTERACTIVE : TRI DU TABLEAU LORS DU CLIC SUR LES COLONNES
    const toggleSort = (field: string) => {
        if (sortField === field) {
            // Si on clique sur la même colonne déjà triée, on inverse juste le sens (ascendant <-> descendant)
            setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
        } else { 
            setSortField(field); // Sinon, on change de colonne à trier
            setSortOrder('asc'); // Et on commence par le tri ascendant
        }
    };

    // 🔍 5. RECHERCHE ET FILTRAGE EN TEMPS RÉEL (Côté Navigateur)
    const filtered = orders.filter(o => {
        // Recherche floue : le texte saisi doit être présent dans le titre, l'ID SAP ou le code de la machine
        const matchSearch = (o.title + (o.sap_order_id || '') + (o.equipment_id || '')).toLowerCase().includes(searchTerm.toLowerCase());
        // L'OT doit correspondre à la recherche ET au statut sélectionné dans le menu déroulant
        return matchSearch && (statusFilter === 'all' || o.status === statusFilter);
    });

    // 📶 6. TRI DU TABLEAU SELON LA COLONNE ET L'ORDRE DÉFINIS
    const sorted = [...filtered].sort((a, b) => {
        const aVal = (a as any)[sortField], bVal = (b as any)[sortField]; // Récupère la valeur de la colonne pour la ligne A et B
        if (!aVal) return sortOrder === 'asc' ? -1 : 1; // Si valeur A vide, on la pousse à la fin
        if (!bVal) return sortOrder === 'asc' ? 1 : -1; // Si valeur B vide, on la pousse à la fin
        // Compare les deux valeurs selon le sens ascendant ou descendant
        return aVal < bVal ? (sortOrder === 'asc' ? -1 : 1) : aVal > bVal ? (sortOrder === 'asc' ? 1 : -1) : 0;
    });

    // 🎨 PARTIE VISUELLE (RENDU HTML/JSX) :
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700"> {/* Animation de fondu fluide à l'affichage */}
            {/* 1. Le titre et le bouton de synchronisation SAP en haut */}
            <WorkOrdersHeader isSyncing={isSyncing} showSyncBtn={showSyncBtn} onSync={handleSyncSAP} />
            
            {/* 2. Les petites cartes de statistiques (En attente, En cours, Terminés) */}
            <WorkOrdersStats orders={orders} />
            
            {/* 3. La barre de recherche interactive et le sélecteur de filtre par statut */}
            <WorkOrdersFilters searchTerm={searchTerm} statusFilter={statusFilter} onSearch={setSearchTerm} onFilter={setStatusFilter} />
            
            {/* 4. Le grand tableau contenant la liste triée et filtrée des interventions */}
            <WorkOrdersTable
                orders={sorted} loading={loading} isUpdating={isUpdating}
                sortField={sortField} sortOrder={sortOrder}
                isManager={isManager} currentUserId={currentUser?.id}
                onSort={toggleSort} onDelete={handleDelete}
                onNavigate={id => router.push(`/work-orders/${id}`)} // Clique sur une ligne redirige vers la fiche de l'OT
                formatDate={formatDate}
            />
        </div>
    );
}
