'use client';
import { useState, useEffect } from 'react';
import {
    Wrench, Bell, Palette, Timer,
    Wifi, ClipboardList, Map
} from 'lucide-react';
import { useToast } from '../../../components/ui/toast'; // Correct: 3 levels up
import { getCurrentUser, loadPrefs, savePrefs, AppPreferences } from './types'; // same folder
import {
    Section, ToggleRow, SelectRow, InfoRow,
    ThemePicker, LangPicker, SaveBar, PasswordForm, BiometrySection
} from './SettingsComponents'; // same folder

interface TechWorkPrefs {
    autoStartTimer: boolean;
    confirmBeforeStop: boolean;
    timerFormat: '12h' | '24h';
    defaultView: 'calendar' | 'list' | 'top5';
    showCompletedOT: boolean;
    offlineMode: boolean;
    gpsLocation: boolean;
    autoMarkInProgress: boolean;
}

interface TechNotifPrefs {
    browser: boolean;
    newOTAssigned: boolean;
    approvalResult: boolean;
    overdueWarning: boolean;
    timerReminder: boolean;
    reminderIntervalMin: number;
}

export default function TechnicianSettingsPage() {
    const { success } = useToast();
    const user = getCurrentUser();

    const [prefs,  setPrefs]  = useState<AppPreferences>({ themeColor: 'blue', language: 'fr', compactMode: false, soundEnabled: true });
    const [work,   setWork]   = useState<TechWorkPrefs>({
        autoStartTimer: false, confirmBeforeStop: true, timerFormat: '24h',
        defaultView: 'top5', showCompletedOT: false, offlineMode: true,
        gpsLocation: false, autoMarkInProgress: true,
    });
    const [notifs, setNotifs] = useState<TechNotifPrefs>({
        browser: true, newOTAssigned: true, approvalResult: true,
        overdueWarning: true, timerReminder: false, reminderIntervalMin: 60,
    });
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);

    useEffect(() => {
        if (!user) return;
        setPrefs(loadPrefs(user.id, 'app',    prefs));
        setWork(loadPrefs(user.id,   'work',   work));
        setNotifs(loadPrefs(user.id, 'notifs', notifs));
    }, [user?.id]);

    function handleSave() {
        if (!user) return;
        setSaving(true);
        setTimeout(() => {
            savePrefs(user.id, 'app',    prefs);
            savePrefs(user.id, 'work',   work);
            savePrefs(user.id, 'notifs', notifs);
            setSaving(false);
            setSaved(true);
            success('Paramètres sauvegardés', 'Vos préférences technicien ont été enregistrées.');
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
                        Technicien — Préférences personnelles
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-2xl w-fit">
                    <Wrench size={16} className="text-blue-400" />
                    <span className="text-[0.65rem] font-bold text-blue-400 uppercase tracking-widest">Technicien</span>
                </div>
            </header>

            {/* ── Profil ── */}
            <Section icon={<Wrench size={16} />} title="Mon Profil" accent="border-blue-500">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                        { label: 'Nom',         value: user.name || '—' },
                        { label: 'Login',        value: user.username || '—', mono: true },
                        { label: 'Équipe',       value: (user as any).team || '—' },
                        { label: 'ID Matricule', value: `T-${String(user.id).padStart(4, '0')}`, mono: true },
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
            <Section icon={<Palette size={16} />} title="Apparence" accent="border-blue-500">
                <div className="flex items-center justify-between py-2">
                    <p className="text-xs font-bold text-slate-200">Couleur d'accent</p>
                    <ThemePicker value={prefs.themeColor} onChange={v => setPrefs(p => ({ ...p, themeColor: v }))} />
                </div>
                <div className="flex items-center justify-between py-2">
                    <p className="text-xs font-bold text-slate-200">Langue</p>
                    <LangPicker value={prefs.language} onChange={v => setPrefs(p => ({ ...p, language: v }))} />
                </div>
                <ToggleRow label="Mode compact" description="Réduit l'espacement pour voir plus d'OT" checked={prefs.compactMode} onChange={v => setPrefs(p => ({ ...p, compactMode: v }))} />
                <ToggleRow label="Sons d'alerte" description="Bip sonore pour les OT critiques" checked={prefs.soundEnabled} onChange={v => setPrefs(p => ({ ...p, soundEnabled: v }))} />
            </Section>

            {/* ── Timer & interventions ── */}
            <Section icon={<Timer size={16} />} title="Chronomètre & Interventions" subtitle="Comportement du compteur de temps" accent="border-emerald-500">
                <ToggleRow
                    label="Démarrage automatique du timer"
                    description="Lance le chrono dès l'ouverture d'un OT en statut 'en cours'"
                    checked={work.autoStartTimer}
                    onChange={v => setWork(p => ({ ...p, autoStartTimer: v }))}
                />
                <ToggleRow
                    label="Confirmation avant arrêt"
                    description="Demande une confirmation avant d'arrêter le compteur"
                    checked={work.confirmBeforeStop}
                    onChange={v => setWork(p => ({ ...p, confirmBeforeStop: v }))}
                />
                <ToggleRow
                    label="Marquer automatiquement 'En cours'"
                    description="Passe l'OT en statut in_progress au démarrage du timer"
                    checked={work.autoMarkInProgress}
                    onChange={v => setWork(p => ({ ...p, autoMarkInProgress: v }))}
                />
                <SelectRow
                    label="Format du chronomètre"
                    value={work.timerFormat}
                    options={[
                        { key: '24h', label: '24h (14:32:05)' },
                        { key: '12h', label: '12h (2:32 PM)' },
                    ]}
                    onChange={v => setWork(p => ({ ...p, timerFormat: v as any }))}
                />
            </Section>

            {/* ── Vue & affichage ── */}
            <Section icon={<ClipboardList size={16} />} title="Affichage des OT" accent="border-amber-500">
                <SelectRow
                    label="Vue par défaut du dashboard"
                    description="Ce que vous voyez en premier au chargement"
                    value={work.defaultView}
                    options={[
                        { key: 'top5',     label: 'Top 5 prioritaires' },
                        { key: 'calendar', label: 'Agenda calendrier' },
                        { key: 'list',     label: 'Liste complète' },
                    ]}
                    onChange={v => setWork(p => ({ ...p, defaultView: v as any }))}
                />
                <ToggleRow
                    label="Afficher les OT terminés"
                    description="Inclut les OT status 'done' et 'closed' dans la liste"
                    checked={work.showCompletedOT}
                    onChange={v => setWork(p => ({ ...p, showCompletedOT: v }))}
                />
            </Section>

            {/* ── Mode hors ligne ── */}
            <Section icon={<Wifi size={16} />} title="Mode Hors-Ligne" subtitle="Fonctionnement en zone sans réseau" accent="border-slate-400">
                <ToggleRow
                    label="Mode hors-ligne activé"
                    description="Synchronise automatiquement dès que le réseau revient"
                    checked={work.offlineMode}
                    onChange={v => setWork(p => ({ ...p, offlineMode: v }))}
                />
                <div className="p-3 rounded-xl bg-slate-900/50 border border-white/5">
                    <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mb-1">Données disponibles hors-ligne</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {['Mes OT assignés', 'Stock Pièces', 'Liste machines', 'Checklist interventions'].map(d => (
                            <span key={d} className="text-[0.6rem] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                ✓ {d}
                            </span>
                        ))}
                    </div>
                </div>
            </Section>

            {/* ── Notifications ── */}
            <Section icon={<Bell size={16} />} title="Notifications" accent="border-amber-500">
                <ToggleRow label="Notifications navigateur" checked={notifs.browser} onChange={v => setNotifs(p => ({ ...p, browser: v }))} />
                <div className="pt-2 space-y-1">
                    <ToggleRow label="Nouvel OT assigné" description="Alerte quand un responsable vous assigne un OT" checked={notifs.newOTAssigned} onChange={v => setNotifs(p => ({ ...p, newOTAssigned: v }))} />
                    <ToggleRow label="Résultat demande pièces" description="Notification quand le magasinier valide/refuse vos pièces" checked={notifs.approvalResult} onChange={v => setNotifs(p => ({ ...p, approvalResult: v }))} />
                    <ToggleRow label="OT en retard (rappel)" description="Alerte si un de vos OT dépasse la date planifiée" checked={notifs.overdueWarning} onChange={v => setNotifs(p => ({ ...p, overdueWarning: v }))} />
                    <div>
                        <ToggleRow
                            label="Rappel timer actif"
                            description="Vous rappelle si le chrono tourne depuis longtemps"
                            checked={notifs.timerReminder}
                            onChange={v => setNotifs(p => ({ ...p, timerReminder: v }))}
                        />
                        {notifs.timerReminder && (
                            <div className="ml-4 mt-2 flex items-center gap-3 animate-in fade-in duration-300">
                                <span className="text-[0.6rem] text-slate-500 font-bold uppercase tracking-widest">Rappel après</span>
                                <input
                                    type="range" min={15} max={240} step={15}
                                    value={notifs.reminderIntervalMin}
                                    onChange={e => setNotifs(p => ({ ...p, reminderIntervalMin: Number(e.target.value) }))}
                                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <span className="text-xs font-black text-white w-12 text-right">{notifs.reminderIntervalMin} min</span>
                            </div>
                        )}
                    </div>
                </div>
            </Section>

            <SaveBar onSave={handleSave} saving={saving} saved={saved} />
        </div>
    );
}
