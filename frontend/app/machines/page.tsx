'use client'; // Indique à Next.js que ce fichier s'exécute côté navigateur (composant dynamique interactif)

// Importation de notre hook personnalisé contenant toute la logique métier des machines
import { useMachinesList } from './_components/useMachinesList';
// Importation des 3 sous-composants visuels modulaires
import MachinesHeader from './_components/MachinesHeader';
import MachinesFilters from './_components/MachinesFilters';
import MachinesTable from './_components/MachinesTable';

export default function MachinesPage() {
    // ⚙️ INJECTION DU HOOK PERSONNALISÉ : Récupère tous les états et fonctions utiles
    const {
        sortedMachines, // Liste filtrée et triée de toutes les machines
        loading, // État de chargement (vrai/faux)
        isSyncing, // État de la synchronisation SAP ProcessForce (vrai/faux)
        sortConfig, // Configuration actuelle du tri (colonne + direction)
        searchTerm, // Texte recherché au clavier par l'utilisateur
        statusFilter, // Statut de panne filtré (ex: en_panne, ok)
        setSearchTerm, // Fonction pour changer le texte recherché
        setStatusFilter, // Fonction pour changer le filtre de statut
        handleSyncSAP, // Fonction déclenchée pour forcer la synchronisation avec SAP Business One
        handleSelectMachine, // Fonction déclenchée lors du clic sur une ligne (ouvre sa fiche)
        handleSort, // Fonction déclenchée pour changer le tri des colonnes
    } = useMachinesList();

    return (
        // Conteneur animé avec un fondu vers le haut au chargement de page
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 1. L'en-tête contenant le titre de la page et le bouton de synchronisation SAP */}
            <MachinesHeader isSyncing={isSyncing} onSync={handleSyncSAP} />

            {/* 2. Barre de recherche par mot-clé et sélecteur de filtrage par état de santé (fonctionnel/en panne) */}
            <MachinesFilters
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                onSearch={setSearchTerm}
                onFilter={setStatusFilter}
            />

            {/* 3. Le tableau affichant les machines avec leurs caractéristiques issues de SAP */}
            <MachinesTable
                machines={sortedMachines}
                loading={loading}
                sortConfig={sortConfig}
                onSort={handleSort}
                onSelect={handleSelectMachine}
            />
        </div>
    );
}
