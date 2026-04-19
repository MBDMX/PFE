'use client';
import { ReactNode, useState } from 'react';
import { ChevronRight, Check, Camera } from 'lucide-react';
import { THEME_COLORS, LANGUAGES, ThemeColor, Language } from './types';

// ── Section wrapper ────────────────────────────────────────────────────────

interface SectionProps {
    icon: ReactNode;
    title: string;
    subtitle?: string;
    children: ReactNode;
    accent?: string; // tailwind color class for left border
}

export function Section({ icon, title, subtitle, children, accent = 'border-blue-500' }: SectionProps) {
    return (
        <div className={`azure-card p-6 border-l-2 ${accent}`}>
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/5">
                <div className="size-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                    {icon}
                </div>
                <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">{title}</h2>
                    {subtitle && <p className="text-[0.6rem] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>}
                </div>
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

// ── Toggle row ─────────────────────────────────────────────────────────────

interface ToggleProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}

export function ToggleRow({ label, description, checked, onChange, disabled }: ToggleProps) {
    return (
        <div className={`flex items-center justify-between py-2 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="pr-4">
                <p className="text-xs font-bold text-slate-200">{label}</p>
                {description && <p className="text-[0.6rem] text-slate-500 mt-0.5 font-medium">{description}</p>}
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 ${
                    checked ? 'bg-blue-500' : 'bg-slate-700'
                }`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-300 ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );
}

// ── Select row ─────────────────────────────────────────────────────────────

interface SelectRowProps {
    label: string;
    description?: string;
    value: string;
    options: { key: string; label: string }[];
    onChange: (v: string) => void;
}

export function SelectRow({ label, description, value, options, onChange }: SelectRowProps) {
    return (
        <div className="flex items-center justify-between py-2">
            <div className="pr-4">
                <p className="text-xs font-bold text-slate-200">{label}</p>
                {description && <p className="text-[0.6rem] text-slate-500 mt-0.5 font-medium">{description}</p>}
            </div>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 shrink-0"
            >
                {options.map(o => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                ))}
            </select>
        </div>
    );
}

// ── Info row (read-only) ───────────────────────────────────────────────────

export function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
            <span className={`text-xs font-bold text-slate-200 ${mono ? 'font-mono' : ''}`}>{value}</span>
        </div>
    );
}

// ── Theme color picker ─────────────────────────────────────────────────────

export function ThemePicker({ value, onChange }: { value: ThemeColor; onChange: (v: ThemeColor) => void }) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {THEME_COLORS.map(c => (
                <button
                    key={c.key}
                    onClick={() => onChange(c.key)}
                    title={c.label}
                    className={`size-8 rounded-full ${c.class} flex items-center justify-center transition-all ${
                        value === c.key ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-slate-950 scale-110' : 'opacity-60 hover:opacity-100'
                    }`}
                >
                    {value === c.key && <Check size={14} className="text-white" strokeWidth={3} />}
                </button>
            ))}
        </div>
    );
}

// ── Language picker ────────────────────────────────────────────────────────

export function LangPicker({ value, onChange }: { value: Language; onChange: (v: Language) => void }) {
    return (
        <div className="flex items-center gap-2">
            {LANGUAGES.map(l => (
                <button
                    key={l.key}
                    onClick={() => onChange(l.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.65rem] font-black uppercase tracking-widest transition-all border ${
                        value === l.key
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'text-slate-500 border-transparent hover:bg-white/5 hover:text-white'
                    }`}
                >
                    <span>{l.flag}</span> {l.label}
                </button>
            ))}
        </div>
    );
}

// ── Save button ────────────────────────────────────────────────────────────

export function SaveBar({ onSave, saving, saved }: { onSave: () => void; saving: boolean; saved: boolean }) {
    return (
        <div className="flex items-center justify-end gap-3 pt-2">
            {saved && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold animate-in fade-in duration-300">
                    <Check size={14} strokeWidth={3} /> Préférences sauvegardées
                </div>
            )}
            <button
                onClick={onSave}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
            >
                {saving ? (
                    <span className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <Check size={14} />
                )}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
        </div>
    );
}

// ── Danger zone ────────────────────────────────────────────────────────────

export function DangerAction({
    title,
    description,
    buttonLabel,
    onClick,
    loading = false,
}: {
    title: string;
    description: string;
    buttonLabel: string;
    onClick: () => void;
    loading?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-rose-500/5 border border-rose-500/15">
            <div>
                <p className="text-xs font-bold text-rose-300">{title}</p>
                <p className="text-[0.6rem] text-slate-500 mt-0.5 font-medium">{description}</p>
            </div>
            <button
                onClick={onClick}
                disabled={loading}
                className="shrink-0 px-4 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-white text-[0.65rem] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
                {loading ? '...' : buttonLabel}
            </button>
        </div>
    );
}

import { FaceEnroll } from '@/components/FaceEnroll';

// ── Biometry section ───────────────────────────────────────────────────────

export function BiometrySection() {
    return (
        <Section 
            icon={<Camera size={16} />} 
            title="Connexion Biométrique" 
            subtitle="Gérez l'accès par reconnaissance faciale"
            accent="border-blue-500"
        >
            <FaceEnroll />
        </Section>
    );
}

// ── Password change form ───────────────────────────────────────────────────

export function PasswordForm({ onSave }: { onSave: (current: string, next: string) => Promise<void> }) {
    const [current, setCurrent]   = useState('');
    const [next, setNext]         = useState('');
    const [confirm, setConfirm]   = useState('');
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');
    const [success, setSuccess]   = useState(false);

    const mismatch = next && confirm && next !== confirm;
    const weak     = next && next.length < 8;
    const ready    = current && next && confirm && !mismatch && !weak;

    async function handle() {
        if (!ready) return;
        setLoading(true);
        setError('');
        try {
            await onSave(current, next);
            setSuccess(true);
            setCurrent(''); setNext(''); setConfirm('');
            setTimeout(() => setSuccess(false), 3000);
        } catch (e: any) {
            setError(e?.message || 'Erreur lors du changement de mot de passe');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-3">
            {[
                { label: 'Mot de passe actuel', val: current, set: setCurrent },
                { label: 'Nouveau mot de passe', val: next, set: setNext },
                { label: 'Confirmer le nouveau', val: confirm, set: setConfirm }
            ].map((field, i) => (
                <div key={i}>
                    <label className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest block mb-1">{field.label}</label>
                    <input
                        type="password"
                        value={field.val}
                        onChange={e => field.set(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
                        placeholder="••••••••"
                    />
                </div>
            ))}

            {mismatch && <p className="text-[0.6rem] text-rose-400 font-bold">Les mots de passe ne correspondent pas</p>}
            {weak      && <p className="text-[0.6rem] text-amber-400 font-bold">Minimum 8 caractères requis</p>}
            {error     && <p className="text-[0.6rem] text-rose-400 font-bold">{error}</p>}
            {success   && <p className="text-[0.6rem] text-emerald-400 font-bold flex items-center gap-1"><Check size={12} /> Mot de passe mis à jour</p>}

            <button
                onClick={handle}
                disabled={!ready || loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[0.65rem] font-black uppercase tracking-widest transition-all"
            >
                {loading ? 'Mise à jour...' : 'Changer le mot de passe'}
            </button>
        </div>
    );
}
