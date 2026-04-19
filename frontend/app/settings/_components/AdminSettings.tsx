'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield, Bell, Palette, Globe, Database, Key,
    Users, Activity, Server, AlertTriangle, Lock,
    Loader2, RefreshCw, Download, UserPlus, Eye, EyeOff, Check
} from 'lucide-react';
import { gmaoApi } from '../../../services/api';
import { useToast } from '../../../components/ui/toast';
import {
    getCurrentUser, loadPrefs, savePrefs,
    AppPreferences, NotificationPrefs, ThemeColor, Language
} from './types';
import {
    Section, ToggleRow, SelectRow, InfoRow,
    ThemePicker, LangPicker, SaveBar, DangerAction, PasswordForm, BiometrySection
} from './SettingsComponents';

// ─── Admin-specific: New user form ────────────────────────────────────────

function NewUserForm({ onCreated }: { onCreated: () => void }) {
    const [form, setForm] = useState({ username: '', email: '', name: '', role: 'technician', password: '' });
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const { success, error } = useToast();

    async function handle() {
        if (!form.username || !form.email || !form.password || !form.name) return;
        setLoading(true);
        try {
            await gmaoApi.register(form);
            success('Utilisateur créé', `${form.name} (${form.role}) ajouté.`);
            setForm({ username: '', email: '', name: '', role: 'technician', password: '' });
            onCreated();
        } catch (e: any) {
            error('Erreur', e?.response?.data?.detail || 'Impossible de créer l\'utilisateur');
        } finally {
            setLoading(false);
        }
    }

    const fields = [
        { key: 'name', label: 'Nom complet', type: 'text', placeholder: 'Jean Dupont' },
        { key: 'username', label: 'Identifiant', type: 'text', placeholder: 'jdupont' },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'j.dupont@entreprise.com' },
    ];

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {fields.map(f => (
                    <div key={f.key}>
                        <label className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest block mb-1">{f.label}</label>
                        <input
                            type={f.type}
                            value={(form as any)[f.key]}
                            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                        />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest block mb-1">Rôle</label>
                    <select
                        value={form.role}
                        onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none appearance-none"
                    >
                        {['admin', 'manager', 'technician', 'magasinier'].map(r => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest block mb-1">Mot de passe initial</label>
                    <div className="relative">
                        <input
                            type={showPw ? 'text' : 'password'}
                            value={form.password}
                            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                            placeholder="Min. 8 caractères"
                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 pr-8"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPw(p => !p)} 
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                            {showPw ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                    </div>
                </div>
            </div>

            <button
                onClick={handle}
                disabled={loading || !form.username || !form.email || !form.password || !form.name}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[0.65rem] font-black uppercase tracking-widest rounded-xl transition-all"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Créer l'utilisateur
            </button>
        </div>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
    const router = useRouter();
    const { success, error: toastError } = useToast();
    const user = getCurrentUser();

    const [prefs, setPrefs] = useState<AppPreferences>({ themeColor: 'blue', language: 'fr', compactMode: false, soundEnabled: true });
    const [notifs, setNotifs] = useState({ email: true, browser: true, criticalAlerts: true, overdueOT: true, stockAlerts: true, newRequests: false, approvalUpdates: false, frequency: 'realtime' as const });
    const [sapConfig, setSapConfig] = useState({ endpoint: 'https://sap.entreprise.com/api/v2', syncInterval: '4', timeout: '30', enabled: true });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        if (!user) return;
        setPrefs(loadPrefs(user.id, 'app', prefs));
        setNotifs(loadPrefs(user.id, 'notifs', notifs));
        setSapConfig(loadPrefs(user.id, 'sap', sapConfig));
    }, [user?.id]);

    function handleSave() {
        if (!user) return;
        setSaving(true);
        setTimeout(() => {
            savePrefs(user.id, 'app', prefs);
            savePrefs(user.id, 'notifs', notifs);
            savePrefs(user.id, 'sap', sapConfig);
            setSaving(false);
            setSaved(true);
            success('Paramètres sauvegardés', 'Toutes vos préférences ont été mises à jour.');
            setTimeout(() => setSaved(false), 3000);
        }, 600);
    }

    async function handleReset() {
        if (!confirm('ATTENTION : Cette action supprime toutes les données et recharge les données de démonstration. Continuer ?')) return;
        setResetting(true);
        try {
            await gmaoApi.resetSystem();
            success('Système réinitialisé', 'Base de données rechargée avec les données de démo.');
            localStorage.clear();
            setTimeout(() => router.push('/login'), 1500);
        } catch {
            toastError('Erreur', 'La réinitialisation a échoué.');
        } finally {
            setResetting(false);
        }
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
                        Administration Système — Contrôle Total
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-2xl w-fit">
                    <Shield size={16} className="text-rose-400" />
                    <span className="text-[0.65rem] font-bold text-rose-400 uppercase tracking-widest">Administrateur</span>
                </div>
            </header>

            {/* ── Profil ── */}
            <Section icon={<Shield size={16} />} title="Profil Administrateur" accent="border-rose-500">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                        { label: 'Nom', value: user.name || '—' },
                        { label: 'Identifiant', value: user.username || '—', mono: true },
                        { label: 'Rôle', value: 'Administrateur' },
                        { label: 'ID Système', value: `#${user.id}`, mono: true },
                    ].map(r => (
                        <div key={r.label} className="p-3 rounded-xl bg-white/5 border border-white/5 font-medium">
                            <p className="text-[0.55rem] text-slate-500 uppercase tracking-widest font-bold mb-1">{r.label}</p>
                            <p className={`text-xs font-black text-white ${r.mono ? 'font-mono' : ''}`}>{r.value}</p>
                        </div>
                    ))}
                </div>
                <div className="pt-4 border-t border-white/5">
                    <p className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-3">Sécurité du compte</p>
                    <PasswordForm onSave={handleChangePassword} />
                </div>
            </Section>

            <BiometrySection />

            {/* ── Créer utilisateur ── */}
            <Section icon={<Users size={16} />} title="Gestion des Utilisateurs" subtitle="Créer de nouveaux comptes" accent="border-violet-500">
                <NewUserForm onCreated={() => success('Utilisateur ajouté', 'Compte créé avec succès.')} />
            </Section>

            {/* ── Apparence ── */}
            <Section icon={<Palette size={16} />} title="Apparence" accent="border-blue-500">
                <div className="flex items-center justify-between py-2">
                    <div>
                        <p className="text-xs font-bold text-slate-200">Couleur d'accent</p>
                        <p className="text-[0.6rem] text-slate-500 mt-0.5 font-medium">Personnalisez le thème de l'interface</p>
                    </div>
                    <ThemePicker value={prefs.themeColor} onChange={v => setPrefs(p => ({ ...p, themeColor: v }))} />
                </div>
                <div className="flex items-center justify-between py-2">
                    <div>
                        <p className="text-xs font-bold text-slate-200">Langue de l'interface</p>
                    </div>
                    <LangPicker value={prefs.language} onChange={v => setPrefs(p => ({ ...p, language: v }))} />
                </div>
                <ToggleRow label="Mode compact" description="Réduit l'espacement pour afficher plus d'informations" checked={prefs.compactMode} onChange={v => setPrefs(p => ({ ...p, compactMode: v }))} />
                <ToggleRow label="Sons système" description="Notifications sonores pour les alertes critiques" checked={prefs.soundEnabled} onChange={v => setPrefs(p => ({ ...p, soundEnabled: v }))} />
            </Section>

            {/* ── Notifications ── */}
            <Section icon={<Bell size={16} />} title="Notifications" accent="border-amber-500">
                <SelectRow
                    label="Fréquence des alertes"
                    value={notifs.frequency}
                    options={[
                        { key: 'realtime', label: 'Temps réel' },
                        { key: 'hourly', label: 'Toutes les heures' },
                        { key: 'daily', label: 'Quotidien' },
                        { key: 'never', label: 'Désactivé' },
                    ]}
                    onChange={v => setNotifs(p => ({ ...p, frequency: v as any }))}
                />
                <ToggleRow label="Alertes critiques" description="OT priorité critique créé ou en retard" checked={notifs.criticalAlerts} onChange={v => setNotifs(p => ({ ...p, criticalAlerts: v }))} />
                <ToggleRow label="Alertes stock bas" description="Pièces sous le seuil minimum" checked={notifs.stockAlerts} onChange={v => setNotifs(p => ({ ...p, stockAlerts: v }))} />
                <ToggleRow label="Notifications email" checked={notifs.email} onChange={v => setNotifs(p => ({ ...p, email: v }))} />
                <ToggleRow label="Notifications navigateur" checked={notifs.browser} onChange={v => setNotifs(p => ({ ...p, browser: v }))} />
            </Section>

            {/* ── SAP / Intégration ── */}
            <Section icon={<Server size={16} />} title="Intégration SAP / RPA" subtitle="Configuration de la connexion ERP" accent="border-emerald-500">
                <ToggleRow label="Synchronisation SAP activée" description="Désactivez pour le mode démo/test" checked={sapConfig.enabled} onChange={v => setSapConfig(p => ({ ...p, enabled: v }))} />
                <div className="space-y-3 pt-2">
                    {[
                        { key: 'endpoint', label: 'Endpoint API SAP', placeholder: 'https://sap.domain.com/api/v2' },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest block mb-1">{f.label}</label>
                            <input
                                value={(sapConfig as any)[f.key]}
                                onChange={e => setSapConfig(p => ({ ...p, [f.key]: e.target.value }))}
                                placeholder={f.placeholder}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50"
                            />
                        </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest block mb-1">Intervalle sync (h)</label>
                            <select value={sapConfig.syncInterval} onChange={e => setSapConfig(p => ({ ...p, syncInterval: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none appearance-none" >
                                {['1', '2', '4', '8', '12', '24'].map(v => <option key={v} value={v}>Toutes les {v}h</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest block mb-1">Timeout (sec)</label>
                            <select value={sapConfig.timeout} onChange={e => setSapConfig(p => ({ ...p, timeout: e.target.value }))} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none appearance-none" >
                                {['10', '20', '30', '60'].map(v => <option key={v} value={v}>{v}s</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <button 
                  type="button" 
                  className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-[0.65rem] font-black uppercase tracking-widest hover:bg-emerald-600/20 transition-all"
                >
                    <RefreshCw size={12} /> Tester la connexion SAP
                </button>
            </Section>

            {/* ── Zone dangereuse ── */}
            <Section icon={<AlertTriangle size={16} />} title="Zone Dangereuse" subtitle="Actions irréversibles" accent="border-rose-600">
                <DangerAction
                    title="Réinitialiser la base de données"
                    description="Supprime toutes les données et recharge les données de démonstration. Action irréversible."
                    buttonLabel={resetting ? 'Réinitialisation...' : 'Réinitialiser'}
                    onClick={handleReset}
                    loading={resetting}
                />
                <DangerAction
                    title="Exporter les logs système"
                    description="Télécharge tous les journaux d'activité au format CSV."
                    buttonLabel="Exporter"
                    onClick={() => success('Export lancé', 'Génération du fichier en cours...')}
                />
            </Section>

            <SaveBar onSave={handleSave} saving={saving} saved={saved} />
        </div>
    );
}
