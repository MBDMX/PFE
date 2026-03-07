'use client'; // Indique que ce composant s'exécute côté client (nécessaire pour useState/useEffect)

import { useState } from 'react'; // Hook pour gérer l'état local du composant
import { useRouter } from 'next/navigation'; // Hook pour gérer la navigation entre les pages
import { Shield, User, Lock, Wrench, ArrowRight, Eye, EyeOff } from 'lucide-react'; // Bibliothèque d'icônes modernes

// Simulation d'une base de données utilisateurs (données statiques pour la démo)
const USERS = [
  { username: 'admin',   password: 'admin123', role: 'admin',      name: 'Admin Principal' },
  { username: 'manager', password: 'mgr123',   role: 'manager',    name: 'Chef Maintenance' },
  { username: 'tech1',   password: 'tech123',  role: 'technician', name: 'Technicien #1' },
];

// Configuration des rôles (icônes, couleurs et bordures pour le design 3D)
const ROLES = [
  { 
    key: 'admin',      
    label: 'Admin', 
    icon: Shield,
    color: 'from-blue-600 to-indigo-700', // Dégradé au survol ou sélection
    border: 'border-blue-500/50',        // Bordure brillante spécifique
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
  // États pour stocker les saisies de l'utilisateur
  const [role, setRole]         = useState(''); // Rôle sélectionné
  const [username, setUsername] = useState(''); // Nom d'utilisateur
  const [password, setPassword] = useState(''); // Mot de passe
  const [showPassword, setShowPassword] = useState(false); // Toggle visibilité mot de passe
  const [error, setError]       = useState(''); // Message d'erreur si échec
  const router = useRouter(); // Instance pour rediriger l'utilisateur

  // Vérifie si tous les champs sont remplis pour activer le bouton de connexion
  const ready = role && username && password;

  // Fonction appelée lors du clic sur le bouton de connexion
  function handleLogin() {
    // Recherche de l'utilisateur dans notre tableau statique
    const user = USERS.find(u => u.username === username && u.password === password && u.role === role);
    
    if (!user) { 
      setError('AUTH_ERR: Identifiants invalides.'); // Affiche l'erreur si non trouvé
      return; 
    }

    // Sauvegarde les infos utilisateur en local (utilisé pour simuler une session)
    localStorage.setItem('user', JSON.stringify(user));
    
    // Redirection vers le tableau de bord correspondant au rôle
    router.push(`/dashboard/${user.role}`);
  }

  return (
    // Conteneur principal avec fond sombre "Midnight Blue" et police Outfit
    <div className="relative min-h-screen flex items-center justify-center bg-[#050b1a] overflow-hidden" style={{ fontFamily: '"Outfit", sans-serif' }}>
      
      {/* 🌌 Décor de fond : Cercles lumineux animés pour l'effet "Cosmic" 🌌 */}
      <div className="absolute top-[-15%] left-[-10%] w-[900px] h-[900px] bg-blue-900/10 rounded-full blur-[140px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '3s' }}></div>

      {/* 🧊 Carte de connexion "Light Glass" (Glassmorphism cristallin) 🧊 */}
      <div className="relative z-10 w-full max-w-[520px] mx-4 p-8 sm:p-12
                      bg-blue-950/20 backdrop-blur-[50px] rounded-[3.5rem] 
                      border border-blue-400/20 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8),_inset_0_1px_1px_rgba(255,255,255,0.05)]">
        
        {/* En-tête avec logo et icône lumineuse */}
        <div className="text-center mb-10">
          <div className="inline-flex relative mb-6">
             <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full"></div>
             <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-900/30 border border-blue-400/40 shadow-2xl">
                <Wrench size={38} className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
             </div>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight flex justify-center items-center gap-2">
            GMAO<span className="text-blue-400">PRO</span>
          </h1>
          <p className="text-blue-400/60 text-[10px] font-bold tracking-[0.4em] mt-3 uppercase">Excellence Azure</p>
        </div>

        <div className="space-y-8">
          
          {/* 🎲 Sélecteur de Rôles : Cartes Interactives 🎲 */}
          <div>
            <div className="grid grid-cols-3 gap-4">
              {ROLES.map(({ key, label, icon: Icon, border }) => {
                const isSelected = role === key;
                return (
                  <button 
                    key={key} 
                    onClick={() => setRole(key)}
                    className={`
                      relative group flex flex-col items-center justify-center gap-3 py-6 rounded-[2rem] transition-all duration-500
                      ${isSelected 
                        ? `bg-blue-400/10 ${border} border-2 text-white shadow-[0_0_30px_rgba(96,165,250,0.1)] translate-y-1 scale-95 shadow-inner` 
                        : `bg-white/5 border border-white/5 text-slate-500 hover:border-blue-400/40 hover:text-blue-300 hover:-translate-y-1`
                      }
                    `}
                  >
                    <Icon size={24} className={`relative z-10 transition-transform ${isSelected ? 'scale-110 drop-shadow-[0_0_10px_#60a5fa]' : 'group-hover:scale-110'}`} />
                    <span className="relative z-10 text-[9px] font-black uppercase tracking-widest leading-none">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 🔑 Champs de saisie cristallins (Pseudo-SaaS) */}
          <div className="space-y-4">
             {/* Nom de l'utilisateur */}
             <div className="group relative">
               <input 
                 type="text" 
                 placeholder="IDENTIFIANT"
                 className="w-full pl-6 pr-14 py-5 bg-blue-400/5 border border-white/10 rounded-2xl outline-none focus:border-blue-400/40 focus:bg-blue-400/10 transition-all font-semibold tracking-wider text-white placeholder-slate-600 shadow-inner text-sm"
                 value={username} onChange={e => setUsername(e.target.value)} 
               />
               <User size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-400 transition-colors" />
             </div>
             
             {/* Mot de passe avec toggle visibilité (Eye Icon) */}
             <div className="group relative">
               <input 
                 type={showPassword ? "text" : "password"} 
                 placeholder="MOT DE PASSE"
                 className={`w-full pl-6 pr-14 py-5 bg-blue-400/5 border border-white/10 rounded-2xl outline-none focus:border-blue-400/40 focus:bg-blue-400/10 transition-all font-semibold tracking-wider text-white placeholder-slate-600 shadow-inner text-sm ${!showPassword ? 'tracking-[0.4em]' : ''}`}
                 value={password} onChange={e => setPassword(e.target.value)} 
                 onKeyDown={e => e.key === 'Enter' && ready && handleLogin()} // Permet de valider avec la touche Entrée
               />
               <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 hover:text-blue-400 group-focus-within:text-blue-600 transition-colors"
               >
                 {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
               </button>
             </div>
             
             {/* Lien Mot de passe oublié */}
             <div className="flex justify-end px-2">
               <button 
                className="text-[10px] font-bold text-blue-400/60 hover:text-blue-400 transition-colors tracking-widest uppercase hover:underline"
                onClick={() => alert('Contactez l\'administrateur.')}
               >
                 Mot de passe oublié ?
               </button>
             </div>
          </div>

          {/* Affichage des erreurs si activé */}
          {error && (
            <div className="bg-red-500/10 text-red-300 p-4 rounded-2xl text-center text-[10px] font-black tracking-widest uppercase border border-red-500/20">
              {error}
            </div>
          )}

          {/* 🚀 Bouton 3D Lumineux avec Shimmer (effet de brillance) 🚀 */}
          <button 
            onClick={handleLogin} 
            disabled={!ready}
            className={`
              w-full group relative flex items-center justify-center gap-3 py-6 rounded-[2.5rem] font-black text-sm tracking-[0.25em] uppercase transition-all duration-300
              ${ready 
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_20px_40px_-10px_rgba(37,99,235,0.3)] hover:-translate-y-1.5 hover:shadow-[0_25px_50px_-10px_rgba(37,99,235,0.4)] active:translate-y-[4px] active:shadow-none cursor-pointer overflow-hidden' 
                : 'bg-blue-900/20 text-blue-900/40 cursor-not-allowed shadow-none'
              }
            `}
          >
            {/* Effet Shimmer (brillance qui passe) */}
            {ready && (
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"></div>
            )}
            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Ouvrir Session</span>
            <ArrowRight size={22} className={`${ready ? 'group-hover:translate-x-2' : ''} transition-transform relative z-10`} />
          </button>
          
        </div>
      </div>

      {/* Styles globaux pour les animations personnalisées */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
