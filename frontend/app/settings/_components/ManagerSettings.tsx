'use client';
import { useState, useEffect } from 'react';
import {
    TrendingUp, Bell, Palette, Users,
    ClipboardList, CalendarClock, Activity, Check
} from 'lucide-react';
import { useToast } from '../../../components/ui/toast'; // Correct: 3 levels up
import {
    getCurrentUser, loadPrefs, savePrefs, AppPreferences
} from './types'; // Correct: same folder
import {
    Section, ToggleRow, SelectRow, InfoRow,
    ThemePicker, LangPicker, SaveBar, PasswordForm, BiometrySection
} from './SettingsComponents'; // Correct: same folder

interface ManagerNotifPrefs {
    email: boolean;
    browser: boolean;
    frequency: 'realtime' | 'hourly' | 'daily' | 'never';
    criticalOT: boolean;
    overdueOT: boolean;
    stockAlerts: boolean;
    maintenanceDue: boolean;
    technicianOverdue: boolean;
    pendingDeletion: boolean;
}

interface ManagerWorkPrefs {
    defaultPriority: 'low' | 'medium' | 'high' | 'critical';
    overdueThresholdDays: number;
    autoAssignTeam: boolean;
    showKpiOnLoad: boolean;
    mtbfWarningDays: number;
    maintenanceAdvanceDays: number;
}

export default function ManagerSettingsPage() {
    const { success } = useToast();
    const user = getCurrentUser();

    const [prefs,   setPrefs]   = useState<AppPreferences>({ themeColor: 'violet', language: 'fr', compactMode: false, soundEnabled: true });
    const [notifs,  setNotifs]  = useState<ManagerNotifPrefs>({
        email: true, browser: true, frequency: 'realtime',
        criticalOT: true, overdueOT: true, stockAlerts: true,
        maintenanceDue: true, technicianOverdue: true, pendingDeletion: true,
    });
    const [work, setWork] = useState<ManagerWorkPrefs>({
        defaultPriority: 'medium', overdueThresholdDays: 0,
        autoAssignTeam: false, showKpiOnLoad: true,
        mtbfWarningDays: 7, maintenanceAdvanceDays: 7,
    });
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);

    useEffect(() => {
        if (!user) return;
        setPrefs(loadPrefs(user.id, 'app', prefs));
        setNotifs(loadPrefs(user.id, 'notifs', notifs));
        setWork(loadPrefs(user.id, 'work', work));
    }, [user?.id]);

    function handleSave() {
        if (!user) return;
        setSaving(true);
        setTimeout(() => {
            savePrefs(user.id, 'app',    prefs);
            savePrefs(user.id, 'notifs', notifs);
            savePrefs(user.id, 'work',   work);
            setSaving(false);
            setSaved(true);
            success('Paramètres sauvegardés', 'Vos préférences responsable ont été enregistrées.');
            setTimeout(() => setSaved(false), 3000);
        }, 600);
    }

    async function handleChangePassword(current: string, next: string) {
        await new Promise(r => setTimeout(r, 800));
    }

    if (!user) return null;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-12">

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
                        Paramètres
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Responsable Maintenance — Préférences
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-4 py-2 rounded-2xl w-fit">
                    <TrendingUp size={16} className="text-violet-400" />
                    <span className="text-[0.65rem] font-bold text-violet-400 uppercase tracking-widest">Responsable</span>
                </div>
            </header>

            {/* ── Profil ── */}
            <Section icon={<TrendingUp size={16} />} title="Mon Profil" accent="border-violet-500">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    {[
                        { label: 'Nom',       value: user.name     || '—' },
                        { label: 'Login',     value: user.username || '—', mono: true },
                        { label: 'Équipe',    value: user.team     || 'Direction' },
                    ].map(r => (
                        <div key={r.label} className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <p className="text-[0.55rem] text-slate-500 uppercase tracking-widest font-bold mb-1">{r.label}</p>
                            <p className={`text-xs font-black text-white ${r.mono ? 'font-mono' : ''}`}>{r.value}</p>
                        </div>
                    ))}
                </div>
                <div className="pt-4 border-t border-white/5">
                    <p className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-3">Changer le mot de passe</p>
                    <PasswordForm onSave={handleChangePassword} />
                </div>
            </Section>

            <BiometrySection />


            {/* ── Apparence ── */}
            <Section icon={<Palette size={16} />} title="Apparence" accent="border-violet-500">
                <div className="flex items-center justify-between py-2">
                    <p className="text-xs font-bold text-slate-200">Couleur d'accent</p>
                    <ThemePicker value={prefs.themeColor} onChange={v => setPrefs(p => ({ ...p, themeColor: v }))} />
                </div>
                <div className="flex items-center justify-between py-2">
                    <p className="text-xs font-bold text-slate-200">Langue</p>
                    <LangPicker value={prefs.language} onChange={v => setPrefs(p => ({ ...p, language: v }))} />
                </div>
                <ToggleRow label="Mode compact" description="Densifie l'affichage des tableaux OT" checked={prefs.compactMode} onChange={v => setPrefs(p => ({ ...p, compactMode: v }))} />
            </Section>

            {/* ── Préférences de travail ── */}
            <Section icon={<ClipboardList size={16} />} title="Préférences OT" subtitle="Comportement par défaut des ordres de travail" accent="border-amber-500">
                <SelectRow
                    label="Priorité par défaut"
                    description="Priorité présélectionnée à la création d'un OT"
                    value={work.defaultPriority}
                    options={[
                        { key: 'low',      label: '🟢 Basse' },
                        { key: 'medium',   label: '🟡 Moyenne' },
                        { key: 'high',     label: '🟠 Haute' },
                        { key: 'critical', label: '🔴 Critique' },
                    ]}
                    onChange={v => setWork(p => ({ ...p, defaultPriority: v as any }))}
                />
                <ToggleRow
                    label="Afficher les KPIs au chargement"
                    description="Ouvre directement le dashboard KPI au démarrage"
                    checked={work.showKpiOnLoad}
                    onChange={v => setWork(p => ({ ...p, showKpiOnLoad: v }))}
                />
                <ToggleRow
                    label="Assignation automatique d'équipe"
                    description="Pré-assigne l'équipe selon la localisation de la machine"
                    checked={work.autoAssignTeam}
                    onChange={v => setWork(p => ({ ...p, autoAssignTeam: v }))}
                />
            </Section>

            {/* ── Maintenance préventive ── */}
            <Section icon={<CalendarClock size={16} />} title="Maintenance Préventive" subtitle="Seuils et alertes de maintenance" accent="border-emerald-500">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                            Alerte maintenance (jours avant)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range" min={1} max={30} step={1}
                                value={work.maintenanceAdvanceDays}
                                onChange={e => setWork(p => ({ ...p, maintenanceAdvanceDays: Number(e.target.value) }))}
                                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <span className="text-sm font-black text-white w-10 text-center">{work.maintenanceAdvanceDays}j</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                            Seuil alerte MTBF (jours)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range" min={1} max={30} step={1}
                                value={work.mtbfWarningDays}
                                onChange={e => setWork(p => ({ ...p, mtbfWarningDays: Number(e.target.value) }))}
                                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <span className="text-sm font-black text-white w-10 text-center">{work.mtbfWarningDays}j</span>
                        </div>
                    </div>
                </div>
            </Section>

            {/* ── Notifications ── */}
            <Section icon={<Bell size={16} />} title="Notifications" accent="border-amber-500">
                <SelectRow
                    label="Fréquence"
                    value={notifs.frequency}
                    options={[
                        { key: 'realtime', label: 'Temps réel' },
                        { key: 'hourly',   label: 'Toutes les heures' },
                        { key: 'daily',    label: 'Quotidien' },
                        { key: 'never',    label: 'Désactivé' },
                    ]}
                    onChange={v => setNotifs(p => ({ ...p, frequency: v as any }))}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <ToggleRow label="OT critiques non traités" checked={notifs.criticalOT} onChange={v => setNotifs(p => ({ ...p, criticalOT: v }))} />
                    <ToggleRow label="OT en retard" checked={notifs.overdueOT} onChange={v => setNotifs(p => ({ ...p, overdueOT: v }))} />
                    <ToggleRow label="Alertes stock bas" checked={notifs.stockAlerts} onChange={v => setNotifs(p => ({ ...p, stockAlerts: v }))} />
                    <ToggleRow label="Maintenances imminentes" checked={notifs.maintenanceDue} onChange={v => setNotifs(p => ({ ...p, maintenanceDue: v }))} />
                    <ToggleRow label="Technicien en retard" checked={notifs.technicianOverdue} onChange={v => setNotifs(p => ({ ...p, technicianOverdue: v }))} />
                    <ToggleRow label="Demandes de suppression OT" checked={notifs.pendingDeletion} onChange={v => setNotifs(p => ({ ...p, pendingDeletion: v }))} />
                </div>
                <div className="pt-2 border-t border-white/5">
                    <ToggleRow label="Notifications email" checked={notifs.email} onChange={v => setNotifs(p => ({ ...p, email: v }))} />
                    <ToggleRow label="Notifications navigateur (Push)" checked={notifs.browser} onChange={v => setNotifs(p => ({ ...p, browser: v }))} />
                </div>
            </Section>

            <SaveBar onSave={handleSave} saving={saving} saved={saved} />
        </div>
    );
}
