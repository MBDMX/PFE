import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Search, Trash2, X, Check, Loader2, 
  Eye, EyeOff, ShieldCheck, Power, PowerOff, Mail, User, Key, Shield
} from 'lucide-react';
import { gmaoApi } from '../../../../services/api';
import api from '../../../../services/api';

const ROLE_CONFIG: any = {
  admin:      { label: "Administrateur", color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-500/20"    },
  manager:    { label: "Responsable",    color: "text-violet-400",  bg: "bg-violet-400/10",  border: "border-violet-500/20"  },
  technician: { label: "Technicien",     color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-500/20" },
  magasinier: { label: "Magasinier",     color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-500/20"   },
};

const INITIAL_PASSWORDS: Record<string, string> = {
  admin: 'Admin123!', manager: 'password', resp1: 'Resp123!', resp2: 'password',
  tech_meca: '1234', tech_elec: 'password', tech_hydra: 'password', tech_hvac: 'password',
  magasinier1: 'mag123',
};

const MOCK_USERS = [
  { id: 1, name: "Admin Principal",  username: "admin",       role: "admin",      is_active: true },
  { id: 2, name: "Chef Maintenance", username: "manager",     role: "manager",    is_active: true },
  { id: 3, name: "Jean Dupont",      username: "resp1",       role: "manager",    is_active: true },
  { id: 4, name: "Alice Martin",     username: "resp2",       role: "manager",    is_active: true },
  { id: 5, name: "Marc Méca",        username: "tech_meca",   role: "technician", is_active: true },
  { id: 9, name: "Magasinier Central",username: "magasinier1",role: "magasinier", is_active: true },
];

export function UsersManagement() {
  const [search, setSearch]               = useState("");
  const [showCreate, setShowCreate]       = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [form, setForm]                   = useState({ name: "", username: "", email: "", role: "technician", password: "" });
  const [users, setUsers]                 = useState<any[]>([]);
  const [passwords, setPasswords]         = useState<Record<string, string>>(INITIAL_PASSWORDS);
  const [loading, setLoading]             = useState(true);
  const [isSubmitting, setIsSubmitting]   = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await gmaoApi.get('/admin/users');
      setUsers(data && data.length > 0 ? data : MOCK_USERS);
    } catch (err) { setUsers(MOCK_USERS); }
    finally { setLoading(false); }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.password) return;
    setIsSubmitting(true);
    try {
      const res = await gmaoApi.register({ ...form, email: form.email || `${form.username}@gmao.com` });
      
      // Stocker le mot de passe dans l'état local pour pouvoir le visualiser immédiatement
      const userPwd = form.password;
      const userUsername = form.username;
      setPasswords(prev => ({ ...prev, [userUsername]: userPwd }));

      // Ajouter le nouvel utilisateur immédiatement à l'interface pour un feedback instantané
      const newUser = {
        id: res?.id || Date.now(),
        name: form.name,
        username: form.username,
        role: form.role,
        is_active: true
      };
      setUsers(prev => [newUser, ...prev]);

      setShowCreate(false);
      setForm({ name: "", username: "", email: "", role: "technician", password: "" });
      
      // Recharger en arrière-plan depuis le serveur si possible
      loadUsers();
    } catch (err: any) { 
      alert(err.message || "Erreur de création du compte."); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleToggleStatus = async (user: any) => {
    setUsers(users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    try { await api.patch(`/admin/users/${user.id}`, { is_active: !user.is_active }); } catch (err) { console.warn("Fallback local"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    setUsers(users.filter(u => u.id !== id));
    try { await api.delete(`/admin/users/${id}`); } catch (err) { console.warn("Fallback local"); }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500 relative">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Utilisateurs</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Gestion des comptes & permissions</p>
        </div>
        <button 
            onClick={() => setShowCreate(true)} 
            className="azure-btn px-6 py-2.5 flex items-center gap-2 bg-blue-600 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-600/20"
        >
          <UserPlus size={16} /> Créer un compte
        </button>
      </header>

      {/* FORMULAIRE MODAL ÉLÉGANT */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowCreate(false)} />
            <div className="relative w-full max-w-lg azure-card p-8 border-blue-500/30 bg-slate-900 shadow-[0_50px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                            <UserPlus size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Nouveau Compte</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Enregistrement utilisateur</p>
                        </div>
                    </div>
                    <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl"><X size={20} /></button>
                </div>

                <form onSubmit={handleCreate} className="space-y-5">
                    <div className="space-y-4">
                        <div className="relative">
                            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input required className="azure-input pl-12" placeholder="Nom complet (ex: Jean Dupont)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input className="azure-input pl-12" placeholder="Identifiant" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                            </div>
                            <div className="relative">
                                <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <select className="azure-input pl-12" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                                    <option value="technician">Technicien</option>
                                    <option value="manager">Responsable</option>
                                    <option value="magasinier">Magasinier</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="relative">
                            <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input required className="azure-input pl-12" type="text" placeholder="Mot de passe" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-6 py-3 border border-white/5 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-white hover:bg-white/5 rounded-xl transition-all">Annuler</button>
                        <button disabled={isSubmitting} type="submit" className="flex-1 azure-btn bg-blue-600 px-6 py-3 text-white shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2">
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Créer le compte</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* RECHERCHE */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input className="azure-input pl-12 h-12 border-white/5 focus:border-blue-500/50" placeholder="Rechercher un utilisateur..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* TABLEAU */}
      <div className="azure-card p-0 overflow-hidden shadow-2xl border-white/5">
        <table className="azure-table w-full text-left">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <th className="p-4 w-48">Rôle</th>
              <th className="p-4">Nom complet</th>
              <th className="p-4">Identifiant</th>
              <th className="p-4">Mot de passe</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const knownPwd = passwords[u.username] || 'password';
              const isVisible = showPasswords[u.id];
              const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.technician;
              return (
                <tr key={u.id} className={`group border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors ${!u.is_active ? 'opacity-40 grayscale-[0.8]' : ''}`}>
                  <td className="p-4">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider border ${rc.color} ${rc.bg} ${rc.border}`}>
                      {rc.label}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-sm text-white">{u.name}</td>
                  <td className="p-4">
                    <code className="text-[10px] font-black text-blue-300 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">{u.username}</code>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-black text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 min-w-[80px] text-center">
                        {isVisible ? knownPwd : '••••••••'}
                      </code>
                      <button onClick={() => setShowPasswords(p => ({...p, [u.id]: !p[u.id]}))}>
                        {isVisible ? <EyeOff size={12} className="text-slate-500" /> : <Eye size={12} className="text-slate-500" />}
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg border transition-all ${u.is_active ? 'hover:bg-rose-500/20 border-white/5 text-slate-500' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'}`}
                            title={u.is_active ? "Désactiver" : "Activer"}
                        >
                            {u.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                        </button>
                        <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg border border-white/5 text-slate-700 hover:bg-rose-500 hover:text-white transition-all">
                            <Trash2 size={14} />
                        </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 p-5 rounded-2xl bg-blue-600/5 border border-blue-500/10 flex gap-4 items-start">
        <div className="size-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} className="text-blue-400" />
        </div>
        <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
          <span className="text-white">Sécurité Admin :</span> Le bouton <Power size={10} className="inline mx-1" /> permet de révoquer l'accès d'un compte en temps réel. Cette action est irréversible sans intervention manuelle de l'administrateur.
        </p>
      </div>
    </div>
  );
}
