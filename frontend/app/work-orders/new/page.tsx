'use client'; // Indique à Next.js que ce fichier s'exécute côté navigateur (composant dynamique interactif)

import { useState, useEffect, Suspense } from 'react'; // React hooks (gestion état local, effets de bord, chargement différé)
import { useRouter, useSearchParams } from 'next/navigation'; // Outils de routage de Next.js
import { X, Save, AlertCircle } from 'lucide-react'; // Belles icônes vectorielles
import { gmaoApi } from '@/services/api'; // Service de communication avec le serveur backend FastAPI
import { useToast } from '@/components/ui/toast'; // Système de notifications pop-up esthétiques

// Importation des sections du formulaire (sous-composants modulaires)
import NewOTHeader from './_components/NewOTHeader'; // En-tête de la page de création
import MainInfoSection from './_components/MainInfoSection'; // Section des infos principales (titre, machine, description)
import AssignmentSection from './_components/AssignmentSection'; // Section d'affectation des techniciens
import SparePartsSection from './_components/SparePartsSection'; // Section pour ajouter des pièces détachées (avec recherche IA)
import ChecklistSection from './_components/ChecklistSection'; // Section checklist des tâches à cocher

export default function NewWorkOrder() {
    return (
        // Encapsulation dans un Suspense pour gérer proprement la lecture asynchrone des paramètres d'URL (useSearchParams)
        <Suspense fallback={<div className="h-screen flex items-center justify-center text-slate-500 animate-pulse uppercase font-black text-xs tracking-widest">Initialisation...</div>}>
            <NewWorkOrderContent />
        </Suspense>
    );
}

function NewWorkOrderContent() {
    const router = useRouter(); // Permet les redirections (ex: revenir à la liste après création)
    const searchParams = useSearchParams(); // Permet de lire les paramètres de l'URL (ex: ?machine=MACHINE-01)
    const { success, error: toastError } = useToast(); // Outil de notifications pop-up
    
    // VARIABLES D'ÉTAT DU FORMULAIRE :
    const [loading, setLoading] = useState(false); // Vrai quand on clique sur "Enregistrer" pour bloquer les boutons
    const [machines, setMachines] = useState<any[]>([]); // Liste de toutes les machines récupérées du serveur
    const [allTechnicians, setAllTechnicians] = useState<any[]>([]); // Liste de tous les techniciens configurés
    const [steps, setSteps] = useState<string[]>([]); // Liste des étapes/tâches de la checklist de l'OT
    const [currentStep, setCurrentStep] = useState(''); // Étape en cours de saisie au clavier
    const [selectedParts, setSelectedParts] = useState<any[]>([]); // Liste des pièces détachées ajoutées à l'intervention
    const [aiResults, setAiResults] = useState<any[]>([]); // Résultats retournés par la suggestion de pièces par IA

    // Structure initiale des données de saisie
    const [formData, setFormData] = useState({
        title: '', description: '', equipmentId: searchParams.get('machine') || '',
        type: 'corrective', priority: 'medium', location: '', team: '',
        technicianId: '', responsiblePerson: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString().slice(0, 16),
    });

    // 📡 EFFET DE BORD : CHARGEMENT PARALÈLLE DES DONNÉES AU DÉMARRAGE (MACHINES & TECHNICIENS)
    useEffect(() => {
        const load = async () => {
            try {
                // Déclenche simultanément le téléchargement des machines et des techniciens
                const [mats, techs] = await Promise.all([gmaoApi.getMachines(), gmaoApi.getTechnicians()]);
                setMachines(mats);
                setAllTechnicians(techs);
                
                // Pré-remplissage automatique si on arrive depuis la page d'une machine précise
                const prefillRef = searchParams.get('machine');
                if (prefillRef) {
                    const m = mats.find((m: any) => m.reference === prefillRef);
                    if (m) setFormData(prev => ({ ...prev, location: m.location }));
                }
            } catch (err) { console.error('Failed to load data', err); }
        };
        load();
    }, [searchParams]);

    // Fonction utilitaire pour mettre à jour des champs précis de l'état `formData`
    const handleChange = (updates: Partial<typeof formData>) => setFormData(prev => ({ ...prev, ...updates }));

    // 🔧 GESTION DE L'AJOUT DES PIÈCES DÉTACHÉES
    const handleAddPart = (part: any) => {
        const idx = selectedParts.findIndex(p => p.part_code === part.part_code);
        if (idx >= 0) { 
            // Si la pièce existe déjà dans le panier, on incrémente sa quantité de 1
            const updated = [...selectedParts]; 
            updated[idx].quantity += 1; 
            setSelectedParts(updated); 
        } else {
            // Sinon, on ajoute la nouvelle ligne de pièce détachée
            setSelectedParts([...selectedParts, part]);
        }
        setAiResults([]); // Vide les suggestions de l'IA une fois la pièce sélectionnée
    };

    // 📝 AJOUT MANUEL D'UNE ÉTAPE DE CHECKLIST
    const handleAddStep = () => { 
        if (currentStep.trim()) { 
            setSteps([...steps, currentStep.trim()]); 
            setCurrentStep(''); // Réinitialise l'input
        } 
    };

    // 💾 SOUMISSION DU FORMULAIRE ET ENREGISTREMENT DANS SAP / INDEXEDDB
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Empêche le rechargement de page natif
        setLoading(true); // Bloque le bouton de soumission
        try {
            // Envoie le bon créé complet au serveur backend FastAPI
            const res = await gmaoApi.createWorkOrder({ ...formData, parts: selectedParts, steps });
            res.offline
                // Si pas d'internet, l'application sauvegarde dans Dexie IndexedDB et créera l'OT sur SAP plus tard
                ? success('Mode Hors-Ligne', "L'ordre de travail est enregistré localement.")
                // Si connecté, l'OT est écrit directement en temps réel dans le système ERP de SAP !
                : success('Ordre de Travail créé', `${res.sap_order_id || 'SAP Confirmation'} enregistré.`);
            router.push('/work-orders'); // Redirige vers la liste globale
        } catch (err: any) {
            // Gestion et affichage des messages d'erreurs en provenance de la Service Layer SAP
            const msg = err.response?.data?.detail || "Erreur lors de la création de l'OT";
            toastError('Erreur SAP', Array.isArray(msg) ? msg.join(', ') : msg);
            setLoading(false); // Débloque le bouton pour pouvoir corriger
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto py-12 px-6">
            {/* L'en-tête de la page */}
            <NewOTHeader />
            
            {/* Formulaire complet */}
            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* 1. Informations générales (Nom, machine, type de panne, priorité) */}
                <MainInfoSection formData={formData} machines={machines} onChange={handleChange} />

                {/* Grille double-colonne */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 2. Affectation de l'intervenant (Technicien) */}
                    <AssignmentSection formData={formData} allTechnicians={allTechnicians} onChange={handleChange} />
                    {/* 3. Choix des pièces détachées et suggestions IA */}
                    <SparePartsSection selectedParts={selectedParts} aiResults={aiResults} onAiSearch={setAiResults} onAddPart={handleAddPart} onRemovePart={code => setSelectedParts(selectedParts.filter(p => p.part_code !== code))} />
                </div>

                {/* 4. Checklist des tâches à réaliser avec possibilité d'importer des modèles (préventif, hydraulique, moteur) */}
                <ChecklistSection steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} onAddStep={handleAddStep} onRemoveStep={i => setSteps(steps.filter((_, idx) => idx !== i))} onImportTemplate={type => setSteps([...steps, ...{ preventive: ['Inspection visuelle et sonore', 'Nettoyage des composants critiques', 'Lubrification / Graissage', 'Contrôle des serrages et fixations', 'Test fonctionnel et validation'], moteur: ['Démontage du carter de protection', "Inspection de l'usure des charbons/balais", "Contrôle de l'isolement bobinage", 'Nettoyage du collecteur', 'Remontage et test de montée en température'], hydraulique: ["Vérification du niveau et état de l'huile", "Purge du circuit d'air", 'Remplacement des crépines/filtres', "Contrôle d'étanchéité des raccords", 'Test de pression nominale'] }[type]])} />

                {/* 5. Boutons de validation en bas de page */}
                <div className="flex gap-6 pt-10">
                    {/* Annulation */}
                    <button type="button" onClick={() => router.push('/work-orders')} className="flex-1 py-6 rounded-[2rem] bg-white/5 text-slate-400 font-black uppercase text-sm tracking-[0.2em] hover:bg-white/10 border border-white/5 transition-all flex items-center justify-center gap-3">
                        <X size={20} /> Annuler
                    </button>
                    {/* Soumission finale */}
                    <button type="submit" disabled={loading} className="flex-[2] py-6 rounded-[2rem] bg-blue-600 text-white font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-blue-500/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                        {loading ? <div className="animate-spin size-6 border-2 border-white/30 border-t-white rounded-full" /> : <><Save size={20} /> Transmettre l'Ordre à SAP</>}
                    </button>
                </div>
            </form>

            {/* Encadré informatif expliquant la liaison temps réel avec SAP RPA */}
            <div className="mt-12 flex items-center justify-center gap-4 px-10 py-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 text-amber-500/60 max-w-3xl mx-auto">
                <AlertCircle size={20} />
                <p className="text-[0.7rem] font-black uppercase tracking-[0.15em] leading-relaxed text-center">Système Connecté : Cette action génère un ID d'ordre permanent synchronisé avec SAP RPA.</p>
            </div>
        </div>
    );
}
