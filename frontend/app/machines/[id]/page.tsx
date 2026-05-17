'use client'; // Indique à Next.js que c'est un composant côté client interactif

import { useParams } from 'next/navigation'; // Récupère l'ID passé dans l'URL de la page (ex: /machines/4 -> id = 4)
import { Brain, BarChart2 } from 'lucide-react'; // Icônes de cerveau et de graphe à barres
import { useMachineDetails } from './_components/useMachineDetails'; // Hook personnalisé gérant la fiche de cette machine
// Importation des sous-composants visuels spécialisés
import MachinePageHeader from './_components/MachinePageHeader';
import MachineHeroSection from './_components/MachineHeroSection';
import AIExplanationTable from './_components/AIExplanationTable';
import InterventionHistory from './_components/InterventionHistory';
import MachineStatsSidebar from './_components/MachineStatsSidebar';
import MachineActionButtons from './_components/MachineActionButtons';
import HealthTrendChart from './_components/HealthTrendChart';

export default function MachineDetailsPage() {
    const { id } = useParams(); // Extraction de l'identifiant machine depuis l'adresse du navigateur
    
    // ⚙️ CHARGEMENT DU HOOK DES DÉTAILS : Télécharge toutes les informations de la machine et ses statistiques financières et IA
    const { 
        machine, // Fiche brute de la machine (SAP)
        orders, // Liste de tous les OTs passés et programmés
        mlData, // Résultats de l'algorithme prédictif IA (santé, probabilité de panne)
        modelStats, // Statistiques techniques sur le modèle d'intelligence artificielle
        financials, // Coûts cumulés (coût de maintenance cumulé, MTTR)
        loading, // Vrai si le téléchargement est en cours
        triggering, // Vrai si on génère un ordre préventif dans SAP
        fetchAll, // Fonction pour relancer le téléchargement
        handleTriggerMaintenance, // Fonction pour forcer une maintenance préventive
        getMlRecommendedDate // Fonction IA calculant la date idéale recommandée pour la prochaine révision
    } = useMachineDetails(id as string);

    // ⏳ ÉCRAN D'ATTENTE DE CHARGEMENT DE L'IA (Affiche un bel indicateur de diagnostic animé)
    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <div className="size-12 rounded-2xl bg-blue-600/10 flex items-center justify-center animate-pulse">
                <Brain size={24} className="text-blue-400" />
            </div>
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Analyse de l'équipement en cours...</p>
        </div>
    );

    // ❌ ERREUR : MACHINE NON TROUVÉE
    if (!machine) return <div className="p-10 text-white font-black">Machine introuvable (ID: {id})</div>;

    // 🧮 CALCUL DES PARAMÈTRES VISUELS SELON L'ÉTAT DE SANTÉ IA (mlData ou health_score)
    const score = mlData?.score ?? machine.health_score ?? 100;
    const healthColor = score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400';
    const healthBg = score >= 75 ? 'from-emerald-500/10' : score >= 50 ? 'from-amber-500/10' : 'from-rose-500/10';
    const riskLabel = score >= 75 ? 'LOW RISK' : score >= 50 ? 'MEDIUM RISK' : 'HIGH RISK';
    
    // Badge de risque clignotant si critique pour alerter le technicien !
    const riskClass = score >= 75 ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400' : score >= 50 ? 'bg-amber-500/20 border-amber-500/20 text-amber-400' : 'bg-rose-500/20 border-rose-500/20 text-rose-400 animate-pulse';
    const mlDateInfo = getMlRecommendedDate(); // Date idéale prédite par l'IA

    return (
        // Conteneur général animé avec un fondu d'entrée très fluide
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-7xl mx-auto">
            {/* A. En-tête avec bouton retour au parc */}
            <MachinePageHeader reference={machine.reference} />
            
            {/* B. Section héroïque affichant la machine, sa photo et la jauge de santé circulaire */}
            <MachineHeroSection machine={machine} score={score} healthColor={healthColor} healthBg={healthBg} riskLabel={riskLabel} riskClass={riskClass} mlData={mlData} />

            {/* Grille double-colonne adaptative */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Colonne de gauche (2/3 de l'écran) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* C. Tableau d'explications SHAP/LIME de l'IA (Pourquoi la machine est en danger) */}
                    <AIExplanationTable mlData={mlData} modelStats={modelStats} />

                    {/* D. Graphique d'évolution historique de l'état physique de la machine sur les 7 derniers jours */}
                    <section className="azure-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <BarChart2 size={18} className="text-slate-400" />
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">Évolution Score de Santé — 7 Jours</h2>
                        </div>
                        <HealthTrendChart machineId={Number(id)} />
                    </section>

                    {/* E. Historique complet de tous les OTs curatifs/préventifs passés sur cet équipement */}
                    <InterventionHistory orders={orders} />
                </div>

                {/* Colonne de droite (1/3 de l'écran) */}
                <div>
                    {/* F. Panneau latéral d'indicateurs financiers (MTTR, Coûts SAP cumulés, MTBF) */}
                    <MachineStatsSidebar machine={machine} orders={orders} mlData={mlData} modelStats={modelStats} financials={financials} score={score} mlDateInfo={mlDateInfo} />
                    
                    {/* G. Boutons de commandes rapides (Planifier maintenance, Mettre à jour les capteurs) */}
                    <MachineActionButtons machine={machine} mlData={mlData} score={score} mlDateInfo={mlDateInfo} triggering={triggering} onTriggerMaintenance={handleTriggerMaintenance} onRefresh={fetchAll} />
                </div>
            </div>
        </div>
    );
}
