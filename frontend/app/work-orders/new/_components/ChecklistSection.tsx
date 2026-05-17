import { ListChecks, Plus, Trash2, Download } from 'lucide-react'; // Importation des icônes de checklist, d'ajout, de corbeille et de téléchargement

// Déclaration de 3 modèles (Templates) de gammes standards pour faire gagner du temps aux techniciens
const SAP_TEMPLATES = {
    preventive: ['Inspection visuelle et sonore', 'Nettoyage des composants critiques', 'Lubrification / Graissage', 'Contrôle des serrages et fixations', 'Test fonctionnel et validation'],
    moteur: ['Démontage du carter de protection', "Inspection de l'usure des charbons/balais", 'Contrôle de l\'isolement bobinage', 'Nettoyage du collecteur', 'Remontage et test de montée en température'],
    hydraulique: ["Vérification du niveau et état de l'huile", "Purge du circuit d'air", 'Remplacement des crépines/filtres', "Contrôle d'étanchéité des raccords", 'Test de pression nominale'],
};

// Interface décrivant toutes les variables et fonctions fournies par le parent
interface Props {
    steps: string[]; // Liste des étapes déjà ajoutées
    currentStep: string; // Texte de l'étape en cours d'écriture
    onStepChange: (v: string) => void; // Fonction pour modifier le texte de l'étape courante
    onAddStep: () => void; // Fonction pour insérer l'étape dans la liste
    onRemoveStep: (i: number) => void; // Fonction pour retirer l'étape d'indice i
    onImportTemplate: (type: keyof typeof SAP_TEMPLATES) => void; // Fonction pour importer une gamme complète
}

export default function ChecklistSection({ steps, currentStep, onStepChange, onAddStep, onRemoveStep, onImportTemplate }: Props) {
    return (
        <div className="azure-card p-10 space-y-8">
            
            {/* EN-TÊTE DE LA SECTION DE CHECKLIST */}
            <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-5">
                <div className="flex items-center gap-3">
                    <ListChecks size={24} className="text-sky-400" />
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Étapes / Checklist d'Intervention</h2>
                </div>
                
                {/* 📋 FLUX IMPORT SAP : Boutons pour charger des procédures pré-enregistrées en un clic */}
                <div className="flex items-center gap-3">
                    <p className="text-[0.6rem] font-black text-slate-500 uppercase tracking-widest mr-2">Importer gamme SAP :</p>
                    {(['preventive', 'moteur', 'hydraulique'] as const).map((type, i) => (
                        <button key={type} type="button" onClick={() => onImportTemplate(type)}
                            className="px-3 py-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-[0.6rem] font-black text-sky-400 uppercase tracking-widest hover:bg-sky-500/20 transition-all"
                        >
                            {['Gamme-PV', 'Révision-M', 'Gamme-HYD'][i]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                {/* ✍️ ZONE D'AJOUT MANUEL D'UNE ÉTAPE */}
                <div className="flex gap-4">
                    <input
                        className="flex-1 w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-white text-base font-bold placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 transition-all"
                        placeholder="Ajouter une étape manuelle (ex: Vérifier le serrage moteur)"
                        value={currentStep} // Liaison avec le texte saisi
                        onChange={e => onStepChange(e.target.value)} // Met à jour le texte en direct
                        // Permet de valider en appuyant sur la touche "Entrée" du clavier pour aller plus vite !
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAddStep())}
                    />
                    {/* Bouton "+" pour ajouter l'étape */}
                    <button type="button" onClick={onAddStep} className="size-14 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-lg shadow-sky-500/20">
                        <Plus size={26} />
                    </button>
                </div>

                {/* 🧾 RÉSULTAT : LISTE DES ÉTAPES DE NOTRE CHECKLIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {steps.map((s, i) => (
                        // Boucle map sur chaque étape pour l'afficher à l'écran
                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:border-sky-500/20 transition-all">
                            <div className="flex items-center gap-4">
                                {/* Numéro de l'étape dans un petit carré bleu ciel */}
                                <div className="size-8 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center text-xs font-black">{i + 1}</div>
                                <span className="text-sm font-bold text-slate-200">{s}</span>
                            </div>
                            {/* Bouton poubelle pour supprimer cette étape de la checklist */}
                            <button type="button" onClick={() => onRemoveStep(i)} className="size-8 rounded-lg hover:bg-rose-500/10 text-slate-700 hover:text-rose-500 flex items-center justify-center transition-all">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    
                    {/* Affiche un message vide stylisé s'il n'y a encore aucune tâche définie */}
                    {steps.length === 0 && (
                        <div className="md:col-span-2 py-10 flex flex-col items-center justify-center text-slate-700 border-2 border-dashed border-white/5 rounded-2xl">
                            <Download size={32} className="mb-2 opacity-20" />
                            <p className="text-xs font-black uppercase tracking-widest opacity-30">Aucune étape définie pour cet OT</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
