'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X, ChevronRight, HelpCircle, RotateCcw } from 'lucide-react';

interface GuideStep {
    id: string;
    targetId: string;
    title: string;
    content: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    page?: string; // Optional: only show on this page
}

const ALL_STEPS: GuideStep[] = [
    // GLOBAL / SIDEBAR
    { id: 'nav-dash', targetId: 'nav-dashboard', title: 'Navigation', content: 'Accédez à vos indicateurs.', position: 'right' },
    
    // MACHINES PAGE
    { id: 'sync-sap', targetId: 'sync-sap-btn', title: 'Source SAP', content: 'Synchro directe SAP ERP.', position: 'bottom', page: '/machines' },
    { id: 'search-mac', targetId: 'search-bar', title: 'Moteur IA', content: 'Recherche intelligente par nom.', position: 'bottom', page: '/machines' },
    { id: 'ml-score', targetId: 'ml-health-score', title: 'Santé IA', content: 'Prédiction de panne par ML.', position: 'right', page: '/machines' },
    
    // STOCK PAGE
    { id: 'stock-search', targetId: 'search-bar', title: 'Inventaire', content: 'Trouvez vos pièces SAP.', position: 'bottom', page: '/stock' },
    { id: 'stock-sync', targetId: 'sync-sap-btn-stock', title: 'Sync Stock', content: 'Mise à jour des quantités.', position: 'bottom', page: '/stock' },
    
    // WORK ORDERS
    { id: 'wo-create', targetId: 'create-wo-btn', title: 'Nouvelle OT', content: 'Créer un ordre de travail.', position: 'bottom', page: '/work-orders' },
    
    // SIDEBAR SYNC
    { id: 'sidebar-sync', targetId: 'sidebar-sync-btn', title: 'Offline', content: 'Synchronisez vos travaux.', position: 'right' }
];

export default function GuideBubble() {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const [isMounted, setIsMounted] = useState(false);
    const pathname = usePathname();

    // Filter steps for current page + global steps
    const steps = ALL_STEPS.filter(s => !s.page || s.page === pathname);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const hasIgnored = localStorage.getItem('gmao_guide_ignored');
        if (hasIgnored) return;

        const timer = setTimeout(() => {
            updatePosition(currentStepIndex);
        }, 1500);

        return () => clearTimeout(timer);
    }, [pathname, currentStepIndex]);

    useEffect(() => {
        const hasIgnored = localStorage.getItem('gmao_guide_ignored');
        if (hasIgnored || isVisible) return;

        const interval = setInterval(() => {
            if (currentStepIndex >= steps.length) return;
            const step = steps[currentStepIndex];
            if (document.getElementById(step.targetId)) {
                updatePosition(currentStepIndex);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [isVisible, currentStepIndex, pathname]);

    const updatePosition = (index: number) => {
        if (index >= steps.length) {
            setIsVisible(false);
            return;
        }
        const step = steps[index];
        const element = document.getElementById(step.targetId);
        
        if (element) {
            const rect = element.getBoundingClientRect();
            let top = 0;
            let left = 0;

            if (step.position === 'bottom') {
                top = rect.bottom + window.scrollY + 20;
                left = rect.left + window.scrollX + (rect.width / 2) - 175;
            } else if (step.position === 'top') {
                top = rect.top + window.scrollY - 180;
                left = rect.left + window.scrollX + (rect.width / 2) - 175;
            } else if (step.position === 'right') {
                top = rect.top + window.scrollY + (rect.height / 2) - 60;
                left = rect.right + window.scrollX + 25;
            } else if (step.position === 'left') {
                top = rect.top + window.scrollY + (rect.height / 2) - 60;
                left = rect.left + window.scrollX - 375;
            }

            setCoords({ top, left });
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            const next = currentStepIndex + 1;
            setCurrentStepIndex(next);
            updatePosition(next);
        } else {
            setIsVisible(false);
            // Don't mark as ignored yet, just finish current sequence
        }
    };

    const handleIgnore = () => {
        localStorage.setItem('gmao_guide_ignored', 'true');
        setIsVisible(false);
    };

    if (!isMounted) return null;

    const currentStep = steps[currentStepIndex];

    return (
        <>
            {/* Floating Help Trigger */}
            <button
                onClick={() => {
                    if (steps.length > 0) {
                        setCurrentStepIndex(0);
                        updatePosition(0);
                    }
                }}
                className="z-[9999] size-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-[0_15px_35px_rgba(0,0,0,0.5)] transition-all hover:scale-110 active:scale-95 group border-2 border-white/20"
                style={{ bottom: '40px', right: '40px', position: 'fixed' }}
                title="Besoin d'aide ?"
            >
                <HelpCircle size={28} className="group-hover:rotate-12 transition-transform" />
                {steps.length > 0 && (
                    <div className="absolute -top-1 -right-1 size-4 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse" />
                )}
            </button>

            {isVisible && steps.length > 0 && (
                <div 
                    className="fixed z-[999] w-[350px] azure-card p-6 border-blue-500/50 bg-slate-950/95 backdrop-blur-3xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] animate-in zoom-in-90 duration-300 ring-1 ring-white/10"
                    style={{ top: coords.top, left: coords.left }}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="size-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                                <HelpCircle size={20} />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-white uppercase tracking-tight leading-none">{currentStep.title}</h4>
                                <div className="text-[0.6rem] font-black text-blue-400 uppercase tracking-widest mt-1">Aide Interactive</div>
                            </div>
                        </div>
                        <button onClick={handleIgnore} className="text-slate-500 hover:text-white transition-colors p-1 bg-white/5 rounded-lg">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <p className="text-sm font-bold text-slate-100 leading-snug mb-8">
                        {currentStep.content}
                    </p>

                    <div className="flex items-center justify-between border-t border-white/5 pt-5">
                        <div className="flex items-center gap-1">
                            {steps.map((_, i) => (
                                <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === currentStepIndex ? 'w-6 bg-blue-500' : 'w-2 bg-white/10'}`} />
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={handleIgnore}
                                className="px-4 py-2 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest hover:text-rose-400 transition-colors"
                            >
                                Masquer
                            </button>
                            <button 
                                onClick={handleNext}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/30 active:scale-95"
                            >
                                {currentStepIndex === steps.length - 1 ? 'OK' : 'Suivant'}
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Triangle indicator */}
                    <div 
                        className={`absolute size-4 bg-slate-950 rotate-45 border-l border-t border-blue-500/50 ${
                            currentStep.position === 'bottom' ? '-top-2 left-1/2 -translate-x-1/2' : 
                            currentStep.position === 'top' ? '-bottom-2 left-1/2 -translate-x-1/2' :
                            currentStep.position === 'right' ? '-left-2 top-10' : 
                            currentStep.position === 'left' ? '-right-2 top-10' : ''
                        }`}
                    />
                </div>
            )}
        </>
    );
}
