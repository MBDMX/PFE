'use client'; // Exécution côté navigateur

import { useState, useEffect } from 'react'; // React hooks d'états et d'effets
import { useRouter } from 'next/navigation'; // Outil de routage de Next.js pour naviguer d'une page à l'autre
import api, { gmaoApi } from '@/services/api'; // Services de communication avec nos API REST backend

// Définition de la structure TypeScript d'un objet Machine
type Machine = {
    id: number; name: string; reference: string; location: string;
    status: 'operational' | 'maintenance' | 'breakdown'; health_score: number;
    last_maintenance_date?: string; next_maintenance_date?: string; maintenance_frequency_days?: number;
};

// ⚙️ HOOK PERSONNALISÉ CENTRALISANT TOUTE LA LOGIQUE MÉTIER DE LA LISTE DES MACHINES
export function useMachinesList() {
    const router = useRouter(); // Permet la redirection
    
    // états React locaux pour stocker les données et gérer les états d'attente
    const [machines, setMachines] = useState<Machine[]>([]); // Parc complet des machines
    const [loading, setLoading] = useState(true); // Vrai si le chargement initial est en cours
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null); // Machine sélectionnée
    const [machineOrders, setMachineOrders] = useState<any[]>([]); // Ordres de travail rattachés à une machine
    const [loadingOrders, setLoadingOrders] = useState(false); // Vrai si on télécharge les OTs d'une machine
    const [triggeringMaintenance, setTriggeringMaintenance] = useState(false); // Vrai si on lance une maintenance préventive
    const [isSyncing, setIsSyncing] = useState(false); // Vrai si la synchronisation SAP ProcessForce tourne
    
    // Configurations de tri et de filtrage
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState(''); // Contenu de la barre de recherche
    const [statusFilter, setStatusFilter] = useState('all'); // Statut filtré (tous, opérationnel, panne)

    // 📡 1. LECTURE DES MACHINES DEPUIS L'API & INJECTION DE L'IA PRÉDICTIVE (ML HEALTH SCORE)
    const fetchMachines = async () => {
        setLoading(true);
        try {
            // Promise.all télécharge en parallèle (1) le parc machines et (2) les scores prédictifs d'usure de l'algorithme de Machine Learning (ML)
            const [data, mlRes] = await Promise.all([
                gmaoApi.getMachines(),
                api.get('/predictive/machine-health').catch(() => ({ data: { data: [] } })) // Sécurité si le module ML est indisponible
            ]);
            const mlScores = mlRes.data?.data || [];
            
            // Fusion des données de base de la machine avec les données prédictives de l'IA (score de santé prédictif, facteurs de risques)
            setMachines(data.map((m: Machine) => {
                const mlData = mlScores.find((s: any) => s.id === m.id);
                return { 
                    ...m, 
                    ml_score: mlData?.score, // Score d'état de santé par l'IA (en %)
                    ml_risk: mlData?.risk, // Niveau de risque de panne (Faible/Moyen/Critique)
                    ml_reasons: mlData?.reasons || [] // Facteurs physiques expliquant le risque (vibrations, température, frottement)
                };
            }));
        } catch (err) {
            console.error('Erreur chargement machines:', err);
        } finally {
            setLoading(false);
        }
    };

    // 🔄 2. SYNCHRONISATION DIRECTE DEPUIS SAP PROCESSFORCE ODATA
    async function handleSyncSAP() {
        setIsSyncing(true);
        try {
            const res = await gmaoApi.syncMachinesFromSap(); // Lancement de la synchronisation via le backend
            await fetchMachines(); // Re-téléchargement du parc mis à jour
            // Déclenche un événement global pour afficher une belle notification verte de succès
            window.dispatchEvent(new CustomEvent('api:success', { detail: res.message || 'Synchronisation SAP terminée' }));
        } catch {
            window.dispatchEvent(new CustomEvent('api:error', { detail: 'Échec de la synchronisation SAP' }));
        } finally { setIsSyncing(false); }
    }

    // 📂 3. REDIRECTION VERS LA FICHE DÉTAILLÉE DE LA MACHINE
    function handleSelectMachine(m: Machine) {
        router.push(`/machines/${m.id}`); // Navigation vers l'ID précis
    }

    // ⚡ 4. CRÉATION INSTANTANÉE D'UN OT PRÉVENTIF (Déclenchement manuel SAP)
    async function handleTriggerMaintenance(m: Machine) {
        setTriggeringMaintenance(true);
        try {
            const res = await gmaoApi.triggerMaintenance(m.id); // Crée automatiquement l'OT préventif
            await fetchMachines(); // Rafraîchit le parc
            setMachineOrders(await gmaoApi.getMachineWorkOrders(m.id)); // Recharge la liste des OTs
            const freshRes = await api.get('/machines');
            const freshMachine = freshRes.data.find((mac: Machine) => mac.id === m.id);
            if (freshMachine) setSelectedMachine(freshMachine);
            window.dispatchEvent(new CustomEvent('api:success', { detail: `OT préventif créé (${res.sap_order_id})` }));
        } catch (err) {
            console.error('Trigger maintenance failed', err);
        } finally { setTriggeringMaintenance(false); }
    }

    // 🔀 5. CONFIGURATION DU TRI DES COLONNES
    const handleSort = (key: string) => {
        setSortConfig(prev => ({ key, direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    // 🔍 6. FILTRAGE DYNAMIQUE DES MACHINES (Recherche textuelle + Statut)
    const filteredMachines = machines.filter(m => {
        const matchSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.reference.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'all' || m.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // 📊 7. TRI PHYSIQUE DES LIGNES DANS LE TABLEAU
    const sortedMachines = [...filteredMachines].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        let aVal = (a as any)[key], bVal = (b as any)[key];
        
        // Cas particulier si on trie par Score de Santé IA (ml_score)
        if (key === 'ml_score') { 
            aVal = (a as any).ml_score ?? a.health_score; 
            bVal = (b as any).ml_score ?? b.health_score; 
        }
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Démarre la lecture des machines au chargement initial du composant
    useEffect(() => { fetchMachines(); }, []);

    // Retourne tous les outils et variables pour qu'ils soient consommés par le composant de page.tsx
    return {
        sortedMachines, loading, selectedMachine, machineOrders, loadingOrders,
        triggeringMaintenance, isSyncing, sortConfig, searchTerm, statusFilter,
        setSearchTerm, setStatusFilter, setSelectedMachine,
        handleSyncSAP, handleSelectMachine, handleTriggerMaintenance, handleSort,
    };
}
