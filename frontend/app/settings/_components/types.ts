export interface UserProfile {
    id: number;
    username: string;
    email: string;
    name: string;
    role: string;
    team?: string;
    manager_id?: number;
}

export type ThemeColor = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose';
export type Language = 'fr' | 'en' | 'ar';
export type NotifFreq = 'realtime' | 'hourly' | 'daily' | 'never';

export interface AppPreferences {
    themeColor: ThemeColor;
    language: Language;
    compactMode: boolean;
    soundEnabled: boolean;
}

export interface NotificationPrefs {
    email: boolean;
    browser: boolean;
    frequency: NotifFreq;
    criticalAlerts: boolean;
    overdueOT: boolean;
    stockAlerts: boolean;
    newRequests: boolean;
    approvalUpdates: boolean;
}

export const THEME_COLORS: { key: ThemeColor; label: string; class: string }[] = [
    { key: 'blue',    label: 'Azure',    class: 'bg-blue-500'    },
    { key: 'violet',  label: 'Violet',   class: 'bg-violet-500'  },
    { key: 'emerald', label: 'Emerald',  class: 'bg-emerald-500' },
    { key: 'amber',   label: 'Ambre',    class: 'bg-amber-500'   },
    { key: 'rose',    label: 'Rose',     class: 'bg-rose-500'    },
];

export const LANGUAGES: { key: Language; label: string; flag: string }[] = [
    { key: 'fr', label: 'Français',  flag: '🇫🇷' },
    { key: 'en', label: 'English',   flag: '🇬🇧' },
    { key: 'ar', label: 'العربية',   flag: '🇹🇳' },
];

// Read JWT from localStorage
export function getCurrentUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        return JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
        return null;
    }
}

// Persist prefs in localStorage per user id
export function loadPrefs<T>(userId: number, key: string, defaults: T): T {
    try {
        const raw = localStorage.getItem(`prefs_${userId}_${key}`);
        return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
        return defaults;
    }
}

export function savePrefs<T>(userId: number, key: string, data: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`prefs_${userId}_${key}`, JSON.stringify(data));
}
