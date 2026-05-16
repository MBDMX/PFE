'use client';
import { useParams } from 'next/navigation';
import { Brain, BarChart2 } from 'lucide-react';
import { useMachineDetails } from './_components/useMachineDetails';
import MachinePageHeader from './_components/MachinePageHeader';
import MachineHeroSection from './_components/MachineHeroSection';
import AIExplanationTable from './_components/AIExplanationTable';
import InterventionHistory from './_components/InterventionHistory';
import MachineStatsSidebar from './_components/MachineStatsSidebar';
import MachineActionButtons from './_components/MachineActionButtons';
import HealthTrendChart from './_components/HealthTrendChart';

export default function MachineDetailsPage() {
    const { id } = useParams();
    const { machine, orders, mlData, modelStats, financials, loading, triggering, fetchAll, handleTriggerMaintenance, getMlRecommendedDate } = useMachineDetails(id as string);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <div className="size-12 rounded-2xl bg-blue-600/10 flex items-center justify-center animate-pulse">
                <Brain size={24} className="text-blue-400" />
            </div>
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Analyse de l'équipement en cours...</p>
        </div>
    );

    if (!machine) return <div className="p-10 text-white font-black">Machine introuvable (ID: {id})</div>;

    const score = mlData?.score ?? machine.health_score ?? 100;
    const healthColor = score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400';
    const healthBg = score >= 75 ? 'from-emerald-500/10' : score >= 50 ? 'from-amber-500/10' : 'from-rose-500/10';
    const riskLabel = score >= 75 ? 'LOW RISK' : score >= 50 ? 'MEDIUM RISK' : 'HIGH RISK';
    const riskClass = score >= 75 ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400' : score >= 50 ? 'bg-amber-500/20 border-amber-500/20 text-amber-400' : 'bg-rose-500/20 border-rose-500/20 text-rose-400 animate-pulse';
    const mlDateInfo = getMlRecommendedDate();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-7xl mx-auto">
            <MachinePageHeader reference={machine.reference} />
            <MachineHeroSection machine={machine} score={score} healthColor={healthColor} healthBg={healthBg} riskLabel={riskLabel} riskClass={riskClass} mlData={mlData} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">
                    <AIExplanationTable mlData={mlData} modelStats={modelStats} />

                    <section className="azure-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <BarChart2 size={18} className="text-slate-400" />
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">Évolution Score de Santé — 7 Jours</h2>
                        </div>
                        <HealthTrendChart machineId={Number(id)} />
                    </section>

                    <InterventionHistory orders={orders} />
                </div>

                {/* Right Column */}
                <div>
                    <MachineStatsSidebar machine={machine} orders={orders} mlData={mlData} modelStats={modelStats} financials={financials} score={score} mlDateInfo={mlDateInfo} />
                    <MachineActionButtons machine={machine} mlData={mlData} score={score} mlDateInfo={mlDateInfo} triggering={triggering} onTriggerMaintenance={handleTriggerMaintenance} onRefresh={fetchAll} />
                </div>
            </div>
        </div>
    );
}
