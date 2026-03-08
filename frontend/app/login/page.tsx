'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, User, Lock, Wrench, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';

const USERS = [
  { username: 'admin', password: 'admin123', role: 'admin', name: 'Admin Principal' },
  { username: 'manager', password: 'mgr123', role: 'manager', name: 'Chef Maintenance' },
  { username: 'tech1', password: 'tech123', role: 'technician', name: 'Technicien #1' },
];

const ROLES = [
  {
    key: 'admin',
    label: 'Admin',
    icon: Shield,
    color: 'from-blue-600 to-indigo-700',
    border: 'border-blue-500/50',
  },
  {
    key: 'technician',
    label: 'Technicien',
    icon: Wrench,
    color: 'from-blue-500 to-cyan-600',
    border: 'border-blue-400/50',
  },
  {
    key: 'manager',
    label: 'Responsable',
    icon: User,
    color: 'from-blue-700 to-blue-900',
    border: 'border-blue-600/50',
  },
];

export default function LoginPage() {
  const [role, setRole] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (usernameRef.current) {
      usernameRef.current.focus();
    }
  }, []);

  const ready = role && username && password;

  function handleLogin() {
    const user = USERS.find(u => u.username === username && u.password === password && u.role === role);
    if (!user) {
      setError('AUTH_ERR: Identifiants invalides.');
      return;
    }
    localStorage.setItem('user', JSON.stringify(user));
    router.push(`/dashboard/${user.role}`);
  }

  return (
    /* 🌌 Beautiful Professional Blue Background 🌌 */
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center overflow-x-hidden overflow-y-auto bg-[#0f172a] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] py-10 sm:py-0" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
      
      {/* Decorative Glow Elements */}
      <div className="absolute top-[-10%] left-[-5%] w-[100%] sm:w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[100%] sm:w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '3s' }}></div>

      {/* 🧊 Beautiful Dark Blue Card (Lighter) with White Border 🧊 */}
      <div className="relative z-10 w-full max-w-[90%] sm:max-w-[480px] md:max-w-[500px] p-6 sm:p-10 md:p-12
                      bg-[#112240] rounded-[1.5rem] sm:rounded-[2.5rem] 
                      border-2 border-white/90 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] transition-all duration-700">
        
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex relative mb-6 sm:mb-8 group">
             <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full"></div>
             <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-[1.2rem] sm:rounded-[1.8rem] bg-white/5 border border-white/20 shadow-xl">
                <Wrench className="w-8 h-8 sm:w-10 sm:h-10 text-blue-300 drop-shadow-[0_0_10px_rgba(147,197,253,0.8)]" />
             </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter flex justify-center items-center gap-2">
            GMAO<span className="text-blue-400">PRO</span>
          </h1>
          <p className="text-blue-300/40 text-[9px] sm:text-[11px] font-bold tracking-[0.4em] sm:tracking-[0.5em] mt-3 uppercase">Excellence Azure</p>
        </div>

        <div className="space-y-6 sm:space-y-10">
          
          {/* 🎲 Role Selection 🎲 */}
          <div>
            <div className="grid grid-cols-3 gap-3 sm:gap-5">
              {ROLES.map(({ key, label, icon: Icon, border }) => {
                const isSelected = role === key;
                return (
                  <button 
                    key={key} 
                    onClick={() => setRole(key)}
                    className={`
                      relative group flex flex-col items-center justify-center gap-2 sm:gap-3 py-4 sm:py-6 rounded-[1.2rem] sm:rounded-[2rem] transition-all duration-500
                      ${isSelected 
                        ? `bg-white/10 ${border} border-2 text-white shadow-[0_10px_20px_-5px_rgba(59,130,246,0.3)] translate-y-0.5 scale-95` 
                        : `bg-white/5 border border-white/5 text-slate-400 hover:border-blue-300/60 hover:text-white sm:hover:-translate-y-1.5`
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 relative z-10 transition-transform ${isSelected ? 'scale-110 drop-shadow-[0_0_10px_white]' : 'group-hover:scale-110'}`} />
                    <span className="relative z-10 text-[7px] sm:text-[10px] font-black uppercase tracking-wider leading-none">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 🔑 Inputs: Clear Case Identification */}
          <div className="space-y-4 sm:space-y-5">
             <div className="group relative">
               <input 
                 ref={usernameRef}
                 type="text" 
                 placeholder="Identifiant"
                 className="w-full pl-5 sm:pl-6 pr-12 sm:pr-14 py-4 sm:py-5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl outline-none focus:border-blue-300/60 focus:bg-white/10 transition-all font-medium text-white placeholder-white/60 shadow-inner text-sm sm:text-base"
                 style={{ fontVariant: 'normal', textTransform: 'none' }}
                 value={username} onChange={e => setUsername(e.target.value)} 
               />
               <User size={18} className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 text-white/60 group-focus-within:text-blue-300 transition-colors" />
             </div>
             
             <div className="group relative">
               <input 
                 type={showPassword ? "text" : "password"} 
                 placeholder="Mot de passe"
                 className="w-full pl-5 sm:pl-6 pr-12 sm:pr-14 py-4 sm:py-5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl outline-none focus:border-blue-300/60 focus:bg-white/10 transition-all font-medium text-white placeholder-white/60 shadow-inner text-sm sm:text-base"
                 style={{ fontVariant: 'normal', textTransform: 'none' }}
                 value={password} onChange={e => setPassword(e.target.value)} 
                 onKeyDown={e => e.key === 'Enter' && ready && handleLogin()}
               />
               <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 text-white/60 hover:text-blue-300 group-focus-within:text-blue-300 transition-colors z-10"
               >
                 {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
               </button>
             </div>
             
             <div className="flex justify-end px-1">
               <button 
                className="text-[10px] sm:text-[11px] font-bold text-blue-300/50 hover:text-blue-300 transition-colors tracking-widest uppercase hover:underline"
                onClick={() => alert('Contactez l\'administrateur.')}
               >
                 Mot de passe oublié ?
               </button>
             </div>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-300 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center text-[9px] sm:text-[10px] font-black tracking-widest uppercase border border-red-500/20">
              {error}
            </div>
          )}

          {/* 🚀 LIGHT & BEAUTIFUL BUTTON (No Hover Action) 🚀 */}
          <div className="relative pt-2">
            {/* Luminous Glow when Ready */}
            <div className={`absolute inset-0 bg-blue-400/30 blur-2xl rounded-full scale-90 transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}></div>
            
            <button 
              onClick={handleLogin} 
              disabled={!ready}
              className={`
                w-full relative flex items-center justify-center gap-3 sm:gap-4 py-4 sm:py-6 rounded-[1.5rem] sm:rounded-[2.5rem] font-black text-sm sm:text-base tracking-[0.2em] uppercase transition-all duration-500
                ${ready 
                  ? 'bg-gradient-to-r from-blue-400 to-cyan-300 text-blue-950 shadow-[0_20px_40px_-10px_rgba(59,130,246,0.6)] active:translate-y-[4px] cursor-pointer' 
                  : 'bg-white/10 text-white/60 border border-white/20 cursor-not-allowed shadow-inner'
                }
              `}
            >
              <span className={`relative z-10 flex items-center gap-2 sm:gap-3`}>
                SE CONNECTER
              </span>
              <ArrowRight size={20} className="sm:size-6 relative z-10" />
            </button>
          </div>
          
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
      `}} />
    </div>
  );
}
