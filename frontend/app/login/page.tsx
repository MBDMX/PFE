'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Wrench, ArrowRight, Eye, EyeOff } from 'lucide-react';
import api from '@/services/api';
import { FaceLogin } from '@/components/FaceLogin';

// Role → dashboard route map (read-only, never user-controlled)
const ROLE_ROUTES: Record<string, string> = {
  admin: '/dashboard/admin',
  technician: '/dashboard/technician',
  manager: '/dashboard/manager',
  magasinier: '/dashboard/magasinier',
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const usernameRef = useRef<HTMLInputElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    usernameRef.current?.focus();
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const payload = JSON.parse(
        window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      const route = ROLE_ROUTES[payload.role];
      if (route) router.replace(route);
    } catch { }
  }, []);

  const ready = username.trim().length > 0 && password.length > 0;

  async function handleLogin() {
    if (!ready || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { identifier: username, password });
      const { access_token, refresh_token } = res.data;

      // Store tokens and user info
      localStorage.setItem('token', access_token);
      if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Decode role from JWT (backend is the source of truth)
      const payload = JSON.parse(
        window.atob(access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      const route = ROLE_ROUTES[payload.role];
      if (!route) throw new Error('Rôle inconnu');
      router.replace(route);
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
      {/* Ambient glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[70%] h-[60%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[50%] bg-blue-400/10 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '3s' }} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[90%] sm:max-w-[480px] p-8 sm:p-12
                      bg-[#112240] rounded-[2rem]
                      border-2 border-white/90
                      shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)]">

        {/* Header */}
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

        {/* Form */}
        <div className="space-y-5">

          {/* Username */}
          <div className="group relative">
            <input
              ref={usernameRef}
              type="text"
              placeholder="Identifiant"
              autoComplete="username"
              className="w-full pl-6 pr-14 py-4 sm:py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-300/60 focus:bg-white/10 transition-all font-medium text-white placeholder-white/40 text-sm sm:text-base"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && usernameRef.current?.nextElementSibling && (usernameRef.current.nextElementSibling as HTMLElement)?.focus?.()}
            />
            <User size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-300 transition-colors pointer-events-none" />
          </div>

          {/* Password */}
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

          {/* Forgot password */}
          <div className="flex justify-end">
            <button
              type="button"
              className="text-[10px] font-bold text-blue-300/40 hover:text-blue-300 transition-colors tracking-widest uppercase hover:underline"
              onClick={() => setError('Contactez votre administrateur système.')}
            >
              Mot de passe oublié ?
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 text-red-300 px-4 py-3 rounded-2xl text-center text-[10px] font-black tracking-widest uppercase border border-red-500/20 animate-in fade-in duration-300">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="relative pt-2">
            <div className={`absolute inset-0 bg-blue-400/30 blur-2xl rounded-full scale-90 transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} />
            <button
              onClick={handleLogin}
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

          {/* Biometric Login */}
          <div className="pt-4 space-y-4">
            <div className="flex items-center gap-4 py-2">
              <div className="h-[1px] flex-1 bg-white/5" />
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Ou</span>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>

            <FaceLogin 
              onSuccess={(data) => {
                localStorage.setItem('token', data.access_token);
                if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                const route = ROLE_ROUTES[data.user.role];
                if (route) router.replace(route);
              }}
            />
          </div>

        </div>
      </div>
    </div>
  );
}