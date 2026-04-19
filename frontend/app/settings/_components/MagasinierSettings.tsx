'use client';
import { useState, useEffect } from 'react';
import {
    Warehouse, Bell, Palette, Package,
    Printer, RefreshCw, AlertTriangle, BarChart2
} from 'lucide-react';
import { useToast } from '../../../components/ui/toast';
import { getCurrentUser, loadPrefs, savePrefs, AppPreferences } from './types';
import {
    Section, ToggleRow, SelectRow, InfoRow,
    ThemePicker, LangPicker, SaveBar, PasswordForm, BiometrySection
} from './SettingsComponents';

interface MagWorkPrefs {
    criticalStockThreshold: number;
    lowStockThreshold: number;
    defaultOrderQty: number;
    autoPrintBonSortie: boolean;
    printCopies: number;
    showStockValue: boolean;
    alertOnApprove: boolean;
    sapSyncAuto: boolean;
    sapSyncIntervalH: number;
}

interface MagNotifPrefs {
    browser: boolean;
    email: boolean;
    newRequest: boolean;
    criticalStock: boolean;
    sapSyncError: boolean;
    dailyReport: boolean;
}

export default function MagasinierSettingsPage() {
    const { success } = useToast();
    const user = getCurrentUser();

    const [prefs,  setPrefs]  = useState<AppPreferences>({ themeColor: 'amber', language: 'fr', compactMode: false, soundEnabled: true });
    const [work,   setWork]   = useState<MagWorkPrefs>({
        criticalStockThreshold: 2, lowStockThreshold: 5, defaultOrderQty: 10,
        autoPrintBonSortie: false, printCopies: 2, showStockValue: true,
        alertOnApprove: true, sapSyncAuto: true, sapSyncIntervalH: 4,
    });
    const [notifs, setNotifs] = useState<MagNotifPrefs>({
        browser: true, email: false, newRequest: true,
        criticalStock: true, sapSyncError: true, dailyReport: false,
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
            success('Paramètres sauvegardés', 'Vos préférences magasinier ont été enregistrées.');
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
                        Magasinier — Préférences du dépôt
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-2xl w-fit">
                    <Warehouse size={16} className="text-amber-400" />
                    <span className="text-[0.65rem] font-bold text-amber-400 uppercase tracking-widest">Magasinier</span>
                </div>
            </header>

            {/* ── Profil ── */}
            <Section icon={<Warehouse size={16} />} title="Mon Profil" accent="border-amber-500">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 font-medium">
                    {[
                        { label: 'Nom',         value: user.name || '—' },
                        { label: 'Login',        value: user.username || '—', mono: true },
                        { label: 'Terminal',     value: 'Magasin Central' },
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
            <Section icon={<Palette size={16} />} title="Apparence" accent="border-amber-500">
                <div className="flex items-center justify-between py-2">
                    <p className="text-xs font-bold text-slate-200">Couleur d'accent</p>
                    <ThemePicker value={prefs.themeColor} onChange={v => setPrefs(p => ({ ...p, themeColor: v }))} />
                </div>
                <div className="flex items-center justify-between py-2">
                    <p className="text-xs font-bold text-slate-200">Langue</p>
                    <LangPicker value={prefs.language} onChange={v => setPrefs(p => ({ ...p, language: v }))} />
                </div>
                <ToggleRow label="Afficher la valeur monétaire du stock" description="Montre le coût total en TND dans les listes" checked={work.showStockValue} onChange={v => setWork(p => ({ ...p, showStockValue: v }))} />
            </Section>

            {/* ── Seuils de stock ── */}
            <Section icon={<Package size={16} />} title="Seuils de Stock" subtitle="Définissez vos niveaux d'alerte" accent="border-orange-500">
                <div className="space-y-5">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-xs font-bold text-slate-200">Seuil critique (rupture imminente)</p>
                                <p className="text-[0.6rem] text-rose-400 font-bold">Point rouge animé — commande urgente</p>
                            </div>
                            <span className="text-lg font-black text-rose-400">≤ {work.criticalStockThreshold} unités</span>
                        </div>
                        <input
                            type="range" min={1} max={10} step={1}
                            value={work.criticalStockThreshold}
                            onChange={e => setWork(p => ({ ...p, criticalStockThreshold: Number(e.target.value) }))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-xs font-bold text-slate-200">Seuil bas (alerte KPI)</p>
                                <p className="text-[0.6rem] text-amber-400 font-bold">Point orange — apparaît dans le KPI Alertes Stock</p>
                            </div>
                            <span className="text-lg font-black text-amber-400">≤ {work.lowStockThreshold} unités</span>
                        </div>
                        <input
                            type="range" min={work.criticalStockThreshold + 1} max={20} step={1}
                            value={work.lowStockThreshold}
                            onChange={e => setWork(p => ({ ...p, lowStockThreshold: Number(e.target.value) }))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-slate-200">Quantité de commande par défaut</p>
                            <span className="text-lg font-black text-blue-400">{work.defaultOrderQty} unités</span>
                        </div>
                        <input
                            type="range" min={1} max={50} step={1}
                            value={work.defaultOrderQty}
                            onChange={e => setWork(p => ({ ...p, defaultOrderQty: Number(e.target.value) }))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <p className="text-[0.6rem] text-slate-500 font-bold mt-1">Quantité pré-remplie dans le bouton "Commander" des alertes</p>
                    </div>
                </div>
            </Section>

            {/* ── Impression ── */}
            <Section icon={<Printer size={16} />} title="Impression & Bons de Sortie" accent="border-blue-500">
                <ToggleRow
                    label="Impression automatique après approbation"
                    description="Ouvre automatiquement la fenêtre d'impression du bon de sortie"
                    checked={work.autoPrintBonSortie}
                    onChange={v => setWork(p => ({ ...p, autoPrintBonSortie: v }))}
                />
                <SelectRow
                    label="Nombre d'exemplaires par défaut"
                    value={String(work.printCopies)}
                    options={['1', '2', '3'].map(n => ({ key: n, label: `${n} exemplaire${Number(n) > 1 ? 's' : ''}` }))}
                    onChange={v => setWork(p => ({ ...p, printCopies: Number(v) }))}
                />
                <ToggleRow
                    label="Alerte sonore après validation"
                    description="Bip de confirmation quand une demande est approuvée"
                    checked={work.alertOnApprove}
                    onChange={v => setWork(p => ({ ...p, alertOnApprove: v }))}
                />
            </Section>

            {/* ── SAP Sync ── */}
            <Section icon={<RefreshCw size={16} />} title="Synchronisation SAP / RPA" accent="border-emerald-500">
                <ToggleRow
                    label="Synchronisation automatique"
                    description="Synchronise l'inventaire avec SAP selon l'intervalle défini"
                    checked={work.sapSyncAuto}
                    onChange={v => setWork(p => ({ ...p, sapSyncAuto: v }))}
                />
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-slate-200">Intervalle de synchronisation</p>
                        <span className="text-sm font-black text-emerald-400">Toutes les {work.sapSyncIntervalH}h</span>
                    </div>
                    <input
                        type="range" min={1} max={24} step={1}
                        value={work.sapSyncIntervalH}
                        onChange={e => setWork(p => ({ ...p, sapSyncIntervalH: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        disabled={!work.sapSyncAuto}
                    />
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between font-medium">
                    <div>
                        <p className="text-xs font-bold text-emerald-300">Dernière synchronisation</p>
                        <p className="text-[0.6rem] text-slate-500 font-bold">il y a ~23 min — Inventaire à jour</p>
                    </div>
                    <button 
                      type="button" 
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 text-[0.6rem] font-black uppercase tracking-widest transition-all"
                    >
                        <RefreshCw size={11} /> Forcer sync
                    </button>
                </div>
            </Section>

            {/* ── Notifications ── */}
            <Section icon={<Bell size={16} />} title="Notifications" accent="border-amber-500">
                <ToggleRow label="Notifications navigateur" checked={notifs.browser} onChange={v => setNotifs(p => ({ ...p, browser: v }))} />
                <ToggleRow label="Notifications email" checked={notifs.email} onChange={v => setNotifs(p => ({ ...p, email: v }))} />
                <div className="pt-2 border-t border-white/5 space-y-1">
                    <ToggleRow label="Nouvelle demande de pièces" description="Alerte immédiate quand un technicien envoie une demande" checked={notifs.newRequest} onChange={v => setNotifs(p => ({ ...p, newRequest: v }))} />
                    <ToggleRow label="Alerte stock critique" description="Quand une pièce passe sous le seuil critique" checked={notifs.criticalStock} onChange={v => setNotifs(p => ({ ...p, criticalStock: v }))} />
                    <ToggleRow label="Erreur de synchronisation SAP" description="Si la sync SAP échoue ou expire" checked={notifs.sapSyncError} onChange={v => setNotifs(p => ({ ...p, sapSyncError: v }))} />
                    <ToggleRow label="Rapport quotidien" description="Résumé journalier des mouvements de stock (8h00)" checked={notifs.dailyReport} onChange={v => setNotifs(p => ({ ...p, dailyReport: v }))} />
                </div>
            </Section>

            <SaveBar onSave={handleSave} saving={saving} saved={saved} />
        </div>
    );
}
