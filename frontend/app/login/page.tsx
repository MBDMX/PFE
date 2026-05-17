'use client'; // Indique à Next.js que ce fichier s'exécute côté navigateur (composant dynamique interactif)

import { useState, useEffect, useRef } from 'react'; // Gestion des états React et cycle de vie
import { useRouter } from 'next/navigation'; // Outil de routage de Next.js
import { User, Lock, Wrench, ArrowRight, Eye, EyeOff } from 'lucide-react'; // Icônes de sécurité et de maintenance
import api from '@/services/api';
import { FaceLogin } from '@/components/FaceLogin'; // Authentification biométrique par reconnaissance faciale
import { FaceEnroll } from '@/components/FaceEnroll'; // Enregistrement obligatoire du visage si absent

// 🗺️ DICTIONNAIRE DE REDIRECTION DES RÔLES :
// Associe chaque rôle à son interface/dashboard correspondant pour des raisons de sécurité
const ROLE_ROUTES: Record<string, string> = {
  admin: '/dashboard/admin',
  technician: '/dashboard/technician',
  manager: '/dashboard/manager',
  magasinier: '/dashboard/magasinier',
};

export default function LoginPage() {
  const [username, setUsername] = useState(''); // Nom d'utilisateur saisi
  const [password, setPassword] = useState(''); // Mot de passe saisi
  const [showPassword, setShowPassword] = useState(false); // Cache/Affiche le mot de passe
  const [error, setError] = useState(''); // Message d'erreur
  const [loading, setLoading] = useState(false); // Spinner de chargement actif

  const router = useRouter();
  const usernameRef = useRef<HTMLInputElement>(null); // Pointeur pour forcer le focus du clavier sur l'identifiant

  // 📡 AUTO-REDIRECT SI DÉJÀ CONNECTÉ (Vérification du cache JWT)
  useEffect(() => {
    usernameRef.current?.focus();
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      // Décode le payload du jeton JWT pour rediriger directement l'utilisateur
      const payload = JSON.parse(
        window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      const route = ROLE_ROUTES[payload.role];
      if (route) router.replace(route);
    } catch { }
  }, []);

  const ready = username.trim().length > 0 && password.length > 0; // Vrai si les deux champs sont saisis

  const [showEnrollment, setShowEnrollment] = useState(false); // Affiche la popup d'enrôlement Face ID obligatoire

  // 🔐 ACTION : ESSAI DE CONNEXION CLASSIQUE (Identifiant/Mot de passe)
  async function handleLogin() {
    if (!ready || loading) return;
    setLoading(true);
    setError('');
    try {
      // Requête HTTP POST vers FastAPI /auth/login
      const res = await api.post('/auth/login', { identifier: username, password });
      const { access_token, refresh_token, user } = res.data;

      // Stockage sécurisé des jetons JWT locaux dans le navigateur (localStorage)
      localStorage.setItem('token', access_token);
      if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));

      // ─── 📸 DOUBLE FACTEUR BIOMÉTRIQUE OBLIGATOIRE (MANDATORY FACE ENROLLMENT CHECK) ───
      // Si l'utilisateur n'a pas encore enregistré sa photo/visage (Face ID), on bloque
      // et on lui impose de s'enrôler pour sécuriser son compte !
      if (!user.has_face_id) {
        setShowEnrollment(true);
        return; // Stoppe la redirection
      }

      // Si le visage existe, redirection vers son dashboard dédié
      const route = ROLE_ROUTES[user.role];
      if (!route) throw new Error('Rôle inconnu');
      
      window.location.href = route; // Redirection physique propre
    } catch (err: any) {
      let msg = err.response?.data?.detail;
      if (Array.isArray(msg)) msg = msg[0]?.msg;
      
      setError(
        msg === 'Invalid credentials' || msg === 'Identifiants incorrects'
          ? 'Identifiant ou mot de passe incorrect.'
          : (typeof msg === 'string' ? msg : 'Erreur de connexion au serveur.')
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-screen w-full flex flex-col justify-center items-center overflow-hidden bg-[#0f172a]"
      style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
    >
      {/* Halos de lumière décoratifs en arrière-plan */}
      <div className="absolute top-[-10%] left-[-5%] w-[70%] h-[60%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[50%] bg-blue-400/10 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '3s' }} />

      {/* Carte principale de connexion */}
      <div className="relative z-10 w-full max-w-[90%] sm:max-w-[480px] p-8 sm:p-12
                      bg-[#112240] rounded-[2rem]
                      border-2 border-white/90
                      shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)]">

        {/* LOGO ET TITRE DE L'APPLICATION */}
        <div className="text-center mb-10">
          <div className="inline-flex relative mb-6">
            <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full" />
            <div className="relative flex items-center justify-center w-18 h-18 sm:w-20 sm:h-20 rounded-[1.8rem] bg-white/5 border border-white/20 shadow-xl p-5">
              <Wrench className="w-9 h-9 text-blue-300 drop-shadow-[0_0_10px_rgba(147,197,253,0.8)]" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter">
            GMAO<span className="text-blue-400">PRO</span>
          </h1>
          <p className="text-blue-300/40 text-[10px] font-bold tracking-[0.5em] mt-3 uppercase">
            Excellence Azure
          </p>
        </div>

        {/* Formulaire interactif */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
          className="space-y-5"
        >

          {/* Saisie de l'identifiant */}
          <div className="group relative">
            <input
              ref={usernameRef}
              type="text"
              placeholder="Identifiant"
              autoComplete="username"
              className="w-full pl-6 pr-14 py-4 sm:py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-300/60 focus:bg-white/10 transition-all font-medium text-white placeholder-white/40 text-sm sm:text-base"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
            />
            <User size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-300 transition-colors pointer-events-none" />
          </div>

          {/* Saisie du mot de passe avec œil d'affichage/masquage */}
          <div className="group relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mot de passe"
              autoComplete="current-password"
              className="w-full pl-6 pr-14 py-4 sm:py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-300/60 focus:bg-white/10 transition-all font-medium text-white placeholder-white/40 text-sm sm:text-base"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 hover:text-blue-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Mot de passe oublié */}
          <div className="flex justify-end">
            <button
              type="button"
              className="text-[10px] font-bold text-blue-300/40 hover:text-blue-300 transition-colors tracking-widest uppercase hover:underline"
              onClick={() => setError('Contactez votre administrateur système.')}
            >
              Mot de passe oublié ?
            </button>
          </div>

          {/* Affichage des messages d'erreurs en rouge */}
          {error && (
            <div className="bg-red-500/10 text-red-300 px-4 py-3 rounded-2xl text-center text-[10px] font-black tracking-widest uppercase border border-red-500/20 animate-in fade-in duration-300">
              {error}
            </div>
          )}

          {/* Bouton de validation de connexion */}
          <div className="relative pt-2">
            <div className={`absolute inset-0 bg-blue-400/30 blur-2xl rounded-full scale-90 transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} />
            <button
              type="submit"
              disabled={!ready || loading}
              className={`
                w-full relative flex items-center justify-center gap-3 py-5 rounded-[2rem]
                font-black text-sm tracking-[0.2em] uppercase transition-all duration-500
                ${ready && !loading
                  ? 'bg-gradient-to-r from-blue-400 to-cyan-300 text-blue-950 shadow-[0_20px_40px_-10px_rgba(59,130,246,0.6)] active:translate-y-1 cursor-pointer'
                  : 'bg-white/10 text-white/40 border border-white/10 cursor-not-allowed'
                }
              `}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 border-2 border-blue-950/40 border-t-blue-950 rounded-full animate-spin" />
                  Connexion...
                </span>
              ) : (
                <>Se connecter <ArrowRight size={18} /></>
              )}
            </button>
          </div>

          {/* Section biométrique alternative (Face ID) */}
          <div className="pt-4 space-y-4">
            <div className="flex items-center gap-4 py-2">
              <div className="h-[1px] flex-1 bg-white/5" />
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Ou</span>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>

            {/* Composant de reconnaissance faciale en direct (FaceLogin) */}
            <FaceLogin 
              onSuccess={(user) => {
                const role  = user?.role ?? JSON.parse(localStorage.getItem('user') || '{}').role;
                const route = ROLE_ROUTES[role] ?? '/dashboard/technician';
                router.replace(route);
              }}
            />
          </div>

        </form>
      </div>

      {/* ─── FENÊTRE DE SÉCURITÉ DE DOUBLE FACTEUR BIOMÉTRIQUE FORCE ENROLLMENT OVERLAY ─── */}
      {showEnrollment && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-700 p-4">
          <div className="w-full max-w-2xl bg-[#112240] rounded-[3rem] border border-white/10 p-8 shadow-2xl overflow-hidden relative">
            <FaceEnroll /> {/* Enregistre le visage avec la webcam */}
            
            <div className="mt-4 flex justify-center border-t border-white/5 pt-6">
              <button 
                onClick={() => {
                  const userStr = localStorage.getItem('user');
                  const user = userStr ? JSON.parse(userStr) : null;
                  const role = user?.role ?? 'technician';
                  window.location.href = ROLE_ROUTES[role] || '/dashboard';
                }}
                className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[0.6rem] font-bold text-white/40 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
              >
                Accéder au Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}