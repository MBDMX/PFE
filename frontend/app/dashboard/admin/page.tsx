'use client';

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  LayoutDashboard, Users, Bell, RefreshCw, ShieldCheck,
  TrendingUp, Activity, AlertTriangle, CheckCircle, Clock,
  Package, Wrench, UserPlus, Trash2, Edit2, MoreVertical,
  ArrowUpRight, ChevronRight, Server, Database, Zap,
  Settings, LogOut, ClipboardList, Warehouse, Search, Filter,
  X, Eye, EyeOff, Check, Loader2, Shield, ArrowDown, ArrowUp, MapPin
} from "lucide-react";
import { gmaoApi } from "../../../services/api";
import api from "../../../services/api";

// ─── API Helper ─────────────────────────────────────────────────────────────

async function adminApi(method: string, path: string, body?: any) {
  try {
    const res = await api({
      method,
      url: path,
      data: body
    });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || 'Erreur serveur');
  }
}


// ─── Mock Data ─────────────────────────────────────────────────────────────

const CHART_DATA = [
  { label: "Jan", ot: 12, users: 4 }, { label: "Fév", ot: 34, users: 5 },
  { label: "Mar", ot: 28, users: 5 }, { label: "Avr", ot: 56, users: 6 },
  { label: "Mai", ot: 45, users: 7 }, { label: "Jun", ot: 78, users: 7 },
  { label: "Jul", ot: 65, users: 8 }, { label: "Aoû", ot: 89, users: 9 },
  { label: "Sep", ot: 72, users: 9 },
];

const PIE_DATA = [
  { name: "Admins", value: 2, color: "#3b82f6" },
  { name: "Responsables", value: 4, color: "#8b5cf6" },
  { name: "Techniciens", value: 11, color: "#10b981" },
  { name: "Magasiniers", value: 3, color: "#f59e0b" },
];

const USERS_DATA = [
  { id: 1, name: "Karim Mansouri", username: "kmansouri", role: "manager", status: "active", lastSeen: "Il y a 2 min", ot: 14 },
  { id: 2, name: "Sana Trabelsi", username: "strabelsi", role: "technician", status: "active", lastSeen: "En ligne", ot: 9 },
  { id: 3, name: "Bilel Hamdi", username: "bhamdi", role: "magasinier", status: "idle", lastSeen: "Il y a 1h", ot: 0 },
  { id: 4, name: "Ines Kouki", username: "ikouki", role: "technician", status: "active", lastSeen: "En ligne", ot: 6 },
  { id: 5, name: "Rami Gharbi", username: "rgharbi", role: "manager", status: "offline", lastSeen: "Hier", ot: 3 },
  { id: 6, name: "Lina Bouzid", username: "lbouzid", role: "technician", status: "active", lastSeen: "Il y a 5 min", ot: 7 },
];

const NOTIFS = [
  { id: 1, type: "stock", msg: "Stock critique : Roulement 6205 (Qté: 2)", time: "09:02", urgent: true },
  { id: 2, type: "ot", msg: "OT-0089 créé par Sana Trabelsi", time: "09:14", urgent: false },
  { id: 3, type: "sap", msg: "Synchronisation SAP réussie — 38 enreg.", time: "08:45", urgent: false },
  { id: 4, type: "user", msg: "Nouveau compte créé : Ines Kouki", time: "08:00", urgent: false },
  { id: 5, type: "ot", msg: "Demande pièces refusée — OT-0087", time: "08:30", urgent: true },
];

const SAP_MODULES = [
  "Ordres de travail (OT)", "Gestion des pièces & stock",
  "Données équipements", "Utilisateurs & rôles", "Historique interventions",
];

const ROLE_CONFIG = {
  admin: { label: "Administrateur", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-500/20" },
  manager: { label: "Responsable", color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-500/20" },
  technician: { label: "Technicien", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-500/20" },
  magasinier: { label: "Magasinier", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-500/20" },
};

const STATUS_DOT = {
  active: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]",
  idle: "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.4)]",
  offline: "bg-slate-600",
};

const NAV = [
  { id: "overview", label: "Vue Globale", icon: LayoutDashboard },
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "kpi", label: "KPI & Analytics", icon: TrendingUp },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "sync", label: "Synchro SAP", icon: RefreshCw },
  { id: "settings", label: "Paramètres", icon: Settings },
];

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, bg, delta, alert }) {
  return (
    <div className="azure-card group" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div className={`stat-icon-wrap ${bg}`} style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={22} className={color} strokeWidth={2.5} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, padding: "4px 8px", borderRadius: 8 }}
          className={alert ? "text-rose-400 bg-rose-400/10" : "text-emerald-400 bg-emerald-400/10"}>
          <TrendingUp size={11} />
          {delta}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", lineHeight: 1, transition: "transform 0.2s" }}
          className="group-hover:scale-105 origin-left">{value}</div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#64748b", marginTop: 8 }}>{label}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>{title}</h2>
      {sub && <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.18em", marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function AzureBadge({ role }) {
  const c = ROLE_CONFIG[role] || ROLE_CONFIG.technician;
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, letterSpacing: "0.06em", textTransform: "uppercase", border: "1px solid" }}
      className={`${c.color} ${c.bg} ${c.border}`}>{c.label}</span>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────

function Overview({ setTab, notifCount }) {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [stats, mStats, systemLogs, healthData] = await Promise.all([
          gmaoApi.getStats(),
          gmaoApi.getManagerStats(),
          gmaoApi.getSystemLogs(),
          gmaoApi.getMachineHealth()
        ]);
        setData({ ...stats, ...mStats });
        setLogs(systemLogs || []);
        setHealth(healthData?.summary || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = [
    { label: "OT Totaux", value: data?.totalOT || 0, icon: ClipboardList, color: "text-blue-400", bg: "bg-blue-400/10", delta: "+12%" },
    { label: "Parc Machines", value: data?.totalMachines || 0, icon: Wrench, color: "text-violet-400", bg: "bg-violet-400/10", delta: "100%" },
    { label: "Utilisateurs", value: data?.totalTechnicians || 0, icon: Users, color: "text-emerald-400", bg: "bg-emerald-400/10", delta: "Actifs" },
    { label: "Stock Bas", value: data?.lowStock || 0, icon: Package, color: "text-amber-400", bg: "bg-amber-400/10", delta: (data?.lowStock || 0) > 0 ? "Alert" : "OK", alert: (data?.lowStock || 0) > 0 },
    { label: "Sync Status", value: "98%", icon: RefreshCw, color: "text-blue-500", bg: "bg-blue-400/10", delta: "Stable" },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#64748b" }}>
      <Loader2 className="animate-spin" size={32} />
      <span style={{ marginLeft: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Chargement du centre de contrôle...</span>
    </div>
  );

  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, background: "linear-gradient(to right, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.04em" }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.2em", marginTop: 4 }}>
            Control Center — Global System Vision
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", padding: "10px 20px", borderRadius: 16 }}>
            <Activity size={18} className="text-blue-500 animate-pulse" />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#60a5fa" }}>Système OK</span>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", cursor: "pointer" }}
               onClick={() => setTab('notifications')}>
            <Bell size={20} color="#94a3b8" />
            {notifCount > 0 && <div style={{ position: "absolute", top: 12, right: 12, width: 8, height: 8, background: "#ef4444", borderRadius: "50%", border: "2px solid #0f172a" }} />}
          </div>
        </div>
      </header>

      {/* STATISTICS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 32 }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* CHARTS SECTION */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="azure-card" style={{ overflow: "hidden" }}>
             <SectionHeader title="Activité des Interventions" sub="OT créés vs Terminé (Mois en cours)" />
             <div style={{ height: 260, width: "100%", paddingRight: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CHART_DATA}>
                  <defs>
                    <linearGradient id="colorOT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12, color: "#fff" }} />
                  <Area type="monotone" dataKey="ot" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorOT)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="azure-card">
            <SectionHeader title="Dernières Activités" sub="Journal d'audit en temps réel" />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {logs.slice(0, 4).map((n, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 16 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.target === "Users" ? "#8b5cf6" : "#3b82f6" }} />
                  <div style={{ flex: 1, fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{n.action}</div>
                  <div style={{ fontSize: 11, color: "#475569", fontWeight: 800 }}>{n.time}</div>
                </div>
              ))}
              <button onClick={() => setTab('logs')} style={{ marginTop: 8, textAlign: "center", fontSize: 11, fontWeight: 900, color: "#60a5fa", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                Voir tous les logs <ChevronRight size={12} style={{ display: "inline", marginBottom: 1 }} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="azure-card">
            <SectionHeader title="Ratios OT" sub="Performance résolution" />
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: "Résolus", value: data?.doneOT || 0, color: "#10b981" },
                    { name: "En cours", value: (data?.totalOT || 0) - (data?.doneOT || 0), color: "#3b82f6" }
                  ]} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} strokeWidth={0}>
                    <Cell fill="#10b981" />
                    <Cell fill="#3b82f6" />
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ textAlign: "center", marginTop: 12 }}>
               <div style={{ fontSize: 24, fontWeight: 950, color: "#fff" }}>{data?.resolutionRate || 0}%</div>
               <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Taux de Clôture</div>
            </div>
          </div>

          <div className="azure-card">
            <SectionHeader title="Prédictions ML" sub="Santé du parc" />
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", border: "4px solid #10b981", borderTopColor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(45deg)" }}>
                <span style={{ transform: "rotate(-45deg)", fontSize: 16, fontWeight: 900, color: "#10b981" }}>{health?.average_fleet_health || 100}%</span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>Indice Fiabilité</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981" }}>{health?.at_high_risk || 0} machines à risque</div>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
              L'analyse IA surveille <b>{health?.total_monitored || 0}</b> machines. {health?.at_high_risk > 0 ? "Des anomalies critiques ont été détectées." : "Aucune anomalie critique détectée aujourd'hui."}
            </p>
            <button onClick={() => setTab('ml')} style={{ width: "100%", marginTop: 16, padding: "10px", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 12, color: "#a78bfa", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer" }}>
               Analyse IA détaillée
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", email: "", role: "technician", password: "" });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await adminApi('GET', '/admin/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = (users || []).filter(u =>
    (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.role || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.name || !form.username || !form.password) return;
    try {
      await gmaoApi.register(form);
      loadUsers();
      setForm({ name: "", username: "", email: "", role: "technician", password: "" });
      setShowCreate(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    try {
      await adminApi('DELETE', `/admin/users/${id}`);
      loadUsers();
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await adminApi('PATCH', `/admin/users/${id}`, { is_active: !currentStatus });
      loadUsers();
      if (selected?.id === id) setSelected({ ...selected, is_active: !currentStatus });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdatePermissions = async (id, module, action, currentPerms) => {
    try {
      const perms = typeof currentPerms === 'string' ? JSON.parse(currentPerms || '{}') : (currentPerms || {});
      const modulePerms = perms[module] || "";
      
      let newModulePerms = "";
      if (modulePerms.includes(action)) {
        newModulePerms = modulePerms.replace(action, "");
      } else {
        newModulePerms = modulePerms + action;
      }
      
      const updatedPerms = { ...perms, [module]: newModulePerms };
      const permsStr = JSON.stringify(updatedPerms);
      
      await adminApi('PATCH', `/admin/users/${id}`, { permissions: permsStr });
      loadUsers();
      if (selected?.id === id) setSelected({ ...selected, permissions: permsStr });
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh", color: "#64748b" }}>
      <Loader2 className="animate-spin" size={24} />
    </div>
  );

  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 900, background: "linear-gradient(to right, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.03em" }}>
            Gestion des Utilisateurs
          </h1>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.18em", marginTop: 4 }}>
            Contrôle d'accès, permissions & sécurité
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#2563eb", color: "#fff", borderRadius: 16, border: "none", fontWeight: 800, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", boxShadow: "0 8px 20px rgba(37,99,235,0.35)", transition: "all 0.2s" }}>
          <UserPlus size={16} /> Créer un compte
        </button>
      </header>

      {/* Create form omitted for brevity - assuming it's above */}
      {showCreate && (
        <div className="azure-card" style={{ marginBottom: 24, borderColor: "rgba(37,99,235,0.35)", background: "rgba(37,99,235,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.15em" }}>Nouveau Compte</span>
            <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer" }}><X size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
            {[
              { key: "name", placeholder: "Nom complet" },
              { key: "username", placeholder: "Identifiant" },
              { key: "email", placeholder: "Email", type: "email" },
              { key: "password", placeholder: "Mot de passe", type: "password" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.15em", display: "block", marginBottom: 6 }}>{f.placeholder}</label>
                <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} type={f.type || "text"}
                  style={{ width: "100%", background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#fff", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.15em", display: "block", marginBottom: 6 }}>Rôle</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                style={{ width: "100%", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#fff", outline: "none", appearance: "none", cursor: "pointer" }}>
                <option value="admin">Admin</option>
                <option value="manager">Responsable</option>
                <option value="technician">Technicien</option>
                <option value="magasinier">Magasinier</option>
              </select>
            </div>
            <button onClick={handleCreate}
              style={{ padding: "10px 20px", background: "#10b981", color: "#fff", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              <Check size={14} /> Créer
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 24 }}>
        <Search style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#475569" }} size={16} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, identifiant ou rôle..."
          style={{ width: "100%", background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "12px 16px 12px 44px", fontSize: 13, fontWeight: 600, color: "#fff", outline: "none", boxSizing: "border-box" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 20 }}>
        {/* Table */}
        <div className="azure-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["Utilisateur", "Rôle", "Statut", ""].map(h => (
                  <th key={h} style={{ padding: "14px 20px", fontSize: 10, fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.15em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.technician;
                return (
                  <tr key={u.id} onClick={() => setSelected(selected?.id === u.id ? null : u)}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "background 0.15s", background: selected?.id === u.id ? "rgba(37,99,235,0.08)" : "transparent" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${rc.color.replace("text-", "")}40, transparent)`, border: `2px solid ${rc.color.replace("text-", "")}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff" }}>
                          {(u.name || "U")[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#e2e8f0" }}>{u.name}</div>
                          <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}><AzureBadge role={u.role} /></td>
                    <td style={{ padding: "14px 20px" }}>
                       <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: u.is_active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: u.is_active ? "#10b981" : "#f87171", border: "1px solid", borderColor: u.is_active ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)" }}>
                         {u.is_active ? "ACTIF" : "INACTIF"}
                       </span>
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                       <ChevronRight size={14} className="text-slate-700" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (() => {
          const rc = ROLE_CONFIG[selected.role] || ROLE_CONFIG.technician;
          const perms = typeof selected.permissions === 'string' ? JSON.parse(selected.permissions || '{}') : (selected.permissions || {});
          
          return (
            <div className="azure-card" style={{ borderColor: rc.border.replace("border-", "rgba(") }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: `${rc.bg}`, border: `2px solid`, borderColor: rc.border.includes("blue") ? "#3b82f6" : rc.border.includes("violet") ? "#8b5cf6" : rc.border.includes("emerald") ? "#10b981" : "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#fff" }}>
                    {(selected.name || "U")[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>{selected.name}</div>
                    <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 2 }}>{selected.username}</div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 6, cursor: "pointer", color: "#64748b" }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <button 
                  onClick={() => handleToggleActive(selected.id, selected.is_active)}
                  style={{ flex: 1, padding: "12px", borderRadius: 14, background: selected.is_active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: "1px solid", borderColor: selected.is_active ? "#10b98133" : "#ef444433", color: selected.is_active ? "#10b981" : "#f87171", fontSize: 11, fontWeight: 900, textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {selected.is_active ? <Check size={14}/> : <X size={14}/>}
                  {selected.is_active ? "Compte Actif" : "Compte Désactivé"}
                </button>
                <button style={{ padding: "12px", borderRadius: 14, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)", color: "#f87171", cursor: "pointer" }}
                        onClick={() => handleDelete(selected.id)}>
                   <Trash2 size={16} />
                </button>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.15em", display: "block", marginBottom: 12 }}>Changer le rôle système</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {Object.keys(ROLE_CONFIG).map(r => (
                    <button key={r} onClick={() => handleUpdateRole(selected.id, r)}
                      style={{ padding: "10px", borderRadius: 12, border: "1px solid", borderColor: selected.role === r ? "#3b82f655" : "rgba(255,255,255,0.05)", background: selected.role === r ? "rgba(59,130,246,0.15)" : "rgba(15,23,42,0.4)", color: selected.role === r ? "#fff" : "#475569", fontSize: 11, fontWeight: 800, textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}>
                      {ROLE_CONFIG[r].label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                 <label style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.15em", display: "block", marginBottom: 12 }}>Contrôle Accès Modules (R/W/D)</label>
                 <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { id: "dashboard", label: "Tableau de Bord" },
                      { id: "stock",     label: "Gestion du Stock" },
                      { id: "work",      label: "Ordres de Travail" },
                      { id: "system",    label: "Configuration Système" },
                    ].map(module => {
                      const mPerms = perms[module.id] || "";
                      return (
                        <div key={module.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.04)" }}>
                           <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{module.label}</span>
                           <div style={{ display: "flex", gap: 6 }}>
                              {["R", "W", "D"].map(action => {
                                const active = mPerms.includes(action);
                                return (
                                  <button 
                                    key={action}
                                    onClick={() => handleUpdatePermissions(selected.id, module.id, action, selected.permissions)}
                                    style={{ 
                                      width: 28, height: 28, borderRadius: 6, border: "1px solid", 
                                      borderColor: active ? (action === 'R' ? "#3b82f655" : action === 'W' ? "#10b98155" : "#ef444455") : "rgba(255,255,255,0.05)",
                                      background: active ? (action === 'R' ? "rgba(59,130,246,0.2)" : action === 'W' ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)") : "rgba(0,0,0,0.2)",
                                      color: active ? (action === 'R' ? "#60a5fa" : action === 'W' ? "#34d399" : "#f87171") : "#475569",
                                      fontSize: 10, fontWeight: 900, cursor: "pointer"
                                    }}
                                  >
                                    {action}
                                  </button>
                                );
                              })}
                           </div>
                        </div>
                      );
                    })}
                 </div>
              </div>

              <div style={{ padding: 16, borderRadius: 14, background: "rgba(37,99,235,0.05)", border: "1px solid rgba(37,99,235,0.1)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <Shield size={16} className="text-blue-400" />
                  <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5, fontWeight: 600 }}>
                    <b style={{ color: "#fff" }}>Sécurité Globale :</b> Les permissions surchargent les droits par défaut du rôle. Un compte désactivé ne peut plus accéder à la plateforme.
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function KPIPage() {
  const kpis = [
    { label: "OT Créés", value: 142, delta: "+12%", color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
    { label: "OT Clôturés", value: 118, delta: "+8%", color: "#10b981", bg: "rgba(16,185,129,0.08)" },
    { label: "Taux Résolution", value: "83%", delta: "+5%", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
    { label: "Pièces Validées", value: 67, delta: "-3%", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
    { label: "Stock Critique", value: 4, delta: "↑2", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
    { label: "Interventions/Jour", value: 7.2, delta: "+1.1", color: "#06b6d4", bg: "rgba(6,182,212,0.08)" },
  ];
  const bars = [
    { label: "Jan", ot: 90, closed: 75 }, { label: "Fév", ot: 105, closed: 88 },
    { label: "Mar", ot: 98, closed: 82 }, { label: "Avr", ot: 120, closed: 99 },
    { label: "Mai", ot: 142, closed: 118 },
  ];
  return (
    <div>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, background: "linear-gradient(to right, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.03em" }}>KPI & Analytics</h1>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.18em", marginTop: 4 }}>Indicateurs clés de performance</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {kpis.map(k => (
          <div key={k.label} className="azure-card group" style={{ background: k.bg, borderColor: `${k.color}25` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#475569", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 8, background: k.delta.includes("-") ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)", color: k.delta.includes("-") ? "#f87171" : "#34d399" }}>{k.delta}</div>
            </div>
            <div style={{ marginTop: 12, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "70%", background: k.color, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        <div className="azure-card">
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>Évolution OT — 5 Mois</h2>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 4 }}>OT créés vs clôturés</p>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bars}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12, color: "#fff" }} />
                <Area type="monotone" dataKey="ot" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#g1)" name="OT Créés" />
                <Area type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#g2)" name="OT Clôturés" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="azure-card">
          <h2 style={{ fontSize: 14, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>Répartition par Rôle</h2>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={PIE_DATA} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                  {PIE_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 11 }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: "#64748b", fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 8, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>83%</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.15em" }}>Taux résolution</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsPage() {
  const typeColors = { ot: "#3b82f6", stock: "#ef4444", sap: "#8b5cf6", user: "#10b981" };
  const typeIcons = { ot: ClipboardList, stock: Package, sap: Database, user: Users };
  return (
    <div>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, background: "linear-gradient(to right, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.03em" }}>Notifications</h1>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.18em", marginTop: 4 }}>Alertes système en temps réel</p>
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {NOTIFS.map(n => {
          const color = typeColors[n.type] || "#3b82f6";
          const Icon = typeIcons[n.type] || Bell;
          return (
            <div key={n.id} className="azure-card"
              style={{ padding: "16px 20px", borderColor: n.urgent ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.06)", background: n.urgent ? "rgba(239,68,68,0.04)" : undefined }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={18} color={color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{n.msg}</div>
                  {n.urgent && (
                    <span style={{ fontSize: 10, fontWeight: 900, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.12em", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <AlertTriangle size={10} /> URGENT
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", fontFamily: "monospace", flexShrink: 0 }}>{n.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastSync, setLastSync] = useState("Aujourd'hui 08:45");
  const doSync = async () => {
    setSyncing(true); setProgress(10);
    try {
      // Parallel sync
      await Promise.all([
        gmaoApi.syncStockFromSap(),
        gmaoApi.syncMachinesFromSap(),
        gmaoApi.syncWorkOrdersFromSap()
      ]);
      setProgress(100);
      setLastSync("À l'instant");
      setTimeout(() => {
        setSyncing(false);
        setProgress(0);
      }, 1000);
    } catch (err) {
      alert("Erreur de synchronisation SAP: " + err.message);
      setSyncing(false);
    }
  };
  return (
    <div>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, background: "linear-gradient(to right, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.03em" }}>Synchronisation SAP</h1>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.18em", marginTop: 4 }}>Instance: PRD_SAP_R3 — Azure RPA</p>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="azure-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Server size={20} className={syncing ? "text-blue-400 animate-spin" : "text-slate-500"} />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 13, color: "#fff", textTransform: "uppercase", letterSpacing: "0.1em" }}>Synchronisation SAP</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <Database size={10} /> Instance: PRD_SAP_R3
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
              <span style={{ fontSize: 10, fontWeight: 900, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.15em" }}>Connecté</span>
            </div>
          </div>
          <div style={{ background: "rgba(15,23,42,0.4)", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.05)", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.15em" }}>Temps avant refresh</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#fff", fontFamily: "monospace" }}>1h 47m 23s</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ height: "100%", width: "88%", background: "#3b82f6", borderRadius: 2, transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#475569", fontStyle: "italic" }}>Dernière sync: {lastSync}</span>
            </div>
          </div>
          {syncing && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ height: 4, background: "rgba(37,99,235,0.15)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #3b82f6, #8b5cf6)", borderRadius: 2, transition: "width 0.06s linear" }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#60a5fa", marginTop: 6, letterSpacing: "0.15em", textTransform: "uppercase" }}>Synchronisation en cours… {progress}%</div>
            </div>
          )}
          <button onClick={doSync} disabled={syncing}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", background: syncing ? "rgba(37,99,235,0.1)" : "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.4)", borderRadius: 12, color: "#60a5fa", fontWeight: 900, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", cursor: syncing ? "not-allowed" : "pointer", opacity: syncing ? 0.7 : 1, transition: "all 0.2s" }}>
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Synchronisation…" : "Lancer la synchro"}
          </button>
        </div>

        <div className="azure-card">
          <h2 style={{ fontSize: 13, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>Modules Synchronisés</h2>
          {SAP_MODULES.map(m => (
            <div key={m} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>
              <CheckCircle size={14} className="text-emerald-400" /> {m}
            </div>
          ))}
          <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", fontSize: 11, color: "#6ee7b7", fontWeight: 700, lineHeight: 1.6 }}>
            L'agent RPA vérifie les stocks SAP toutes les 2h pour assurer l'intégrité des données locales et la génération des besoins.
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 900, background: "linear-gradient(to right, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.03em" }}>Paramètres</h1>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.18em", marginTop: 4 }}>Administration Système — Contrôle Total</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 20, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <Shield size={14} className="text-rose-400" />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.12em" }}>Administrateur</span>
        </div>
      </header>
      {[
        { icon: Users, title: "Gestion des Utilisateurs", accent: "#8b5cf6", items: ["Créer / modifier / supprimer des comptes", "Attribuer et révoquer des rôles", "Contrôler l'accès au système"] },
        { icon: Bell, title: "Notifications", accent: "#f59e0b", items: ["Alertes OT critiques", "Alertes stock bas", "Notifications navigateur & email"] },
        { icon: Server, title: "Intégration SAP / RPA", accent: "#10b981", items: ["Endpoint API SAP", "Intervalle de synchronisation", "Timeout de connexion"] },
        { icon: AlertTriangle, title: "Zone Dangereuse", accent: "#ef4444", items: ["Réinitialiser la base de données", "Exporter les logs système", "Gestion des sauvegardes"] },
      ].map(s => (
        <div key={s.title} className="azure-card" style={{ marginBottom: 16, borderLeftWidth: 2, borderLeftColor: s.accent }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
              <s.icon size={16} />
            </div>
            <h2 style={{ fontSize: 13, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "0.12em" }}>{s.title}</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {s.items.map(item => (
              <div key={item} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>{item}</span>
                <button style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


function MachinesPage() {
  const [machines, setMachines] = useState([]);
  useEffect(() => { gmaoApi.getMachines().then(setMachines); }, []);
  return (
    <div>
      <SectionHeader title="Parc Machines" sub="Vision globale des équipements critiques" />
      <div className="azure-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {["Machine", "Référence", "Localisation", "Santé"].map(h => (
                <th key={h} style={{ padding: "16px 20px", fontSize: 10, fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.15em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {machines.map(m => (
              <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "16px 20px", fontWeight: 700, color: "#fff" }}>{m.name}</td>
                <td style={{ padding: "16px 20px", color: "#94a3b8", fontSize: 12 }}>{m.reference}</td>
                <td style={{ padding: "16px 20px", color: "#94a3b8", fontSize: 12 }}>{m.location}</td>
                <td style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, maxWidth: 100 }}>
                       <div style={{ width: `${m.health_score}%`, height: "100%", background: m.health_score > 70 ? "#10b981" : m.health_score > 40 ? "#f59e0b" : "#ef4444", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 900, color: "#fff" }}>{m.health_score}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockPage() {
  const [stock, setStock] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all, critical, low, healthy
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    setLoading(true);
    gmaoApi.getStock().then(data => {
      setStock(data);
      setLoading(false);
    }); 
  }, []);

  const filtered = stock.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.reference.toLowerCase().includes(search.toLowerCase());
    
    if (filter === "critical") return matchesSearch && item.quantity <= 2;
    if (filter === "low") return matchesSearch && item.quantity > 2 && item.quantity <= 5;
    if (filter === "healthy") return matchesSearch && item.quantity > 5;
    return matchesSearch;
  });

  const getStatusColor = (q) => {
    if (q <= 2) return { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "Critique" };
    if (q <= 5) return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "Bas" };
    return { color: "#10b981", bg: "rgba(16,185,129,0.1)", label: "Optimum" };
  };

  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <SectionHeader title="Inventaire des Pièces" sub="Contrôle en temps réel du stock magasin" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="azure-card" style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, minWidth: 300 }}>
            <Search size={16} className="text-slate-500" />
            <input 
              type="text" 
              placeholder="Rechercher une pièce..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: "none", border: "none", outline: "none", color: "#fff", fontSize: 13, width: "100%" }}
            />
          </div>
          <div className="azure-card" style={{ padding: 6, display: "flex", gap: 4 }}>
             {[
               { id: "all", label: "Tous" },
               { id: "critical", label: "Critique" },
               { id: "low", label: "Bas" },
             ].map(f => (
               <button 
                 key={f.id}
                 onClick={() => setFilter(f.id)}
                 style={{ 
                   padding: "6px 12px", 
                   borderRadius: 12, 
                   border: "none", 
                   fontSize: 11, 
                   fontWeight: 800, 
                   cursor: "pointer",
                   textTransform: "uppercase",
                   background: filter === f.id ? "#3b82f6" : "transparent",
                   color: filter === f.id ? "#fff" : "#64748b",
                   transition: "all 0.2s"
                 }}
               >
                 {f.label}
               </button>
             ))}
          </div>
        </div>
      </header>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh", color: "#64748b" }}>
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {filtered.map(item => {
            const status = getStatusColor(item.quantity);
            return (
              <div key={item.id} className="azure-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* Header with Image or Placeholder */}
                <div style={{ height: 140, background: "rgba(255,255,255,0.02)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.1)" }}>
                      <Package size={40} />
                      <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>Image non dispo</span>
                    </div>
                  )}
                  <div style={{ position: "absolute", top: 12, right: 12, padding: "4px 10px", borderRadius: 8, background: status.bg, border: `1px solid ${status.color}33`, color: status.color, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", backdropFilter: "blur(8px)" }}>
                    {status.label}
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: 20 }}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#fff", marginBottom: 4 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, fontFamily: "monospace" }}>REF: {item.reference}</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: 4 }}>Quantité</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: status.color }}>{item.quantity} <span style={{ fontSize: 10, color: "#475569" }}>{item.unit}</span></div>
                    </div>
                    <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: 4 }}>Localisation</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <MapPin size={12} className="text-blue-400" /> {item.location || "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Stock Bar */}
                  <div style={{ marginTop: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
                      <span style={{ color: "#475569" }}>Niveau de Stock</span>
                      <span style={{ color: status.color }}>{Math.min(100, (item.quantity / 10) * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (item.quantity / 10) * 100)}%`, background: status.color, borderRadius: 3, boxShadow: `0 0 10px ${status.color}33` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OfflinePage() {
  const [status, setStatus] = useState(null);
  useEffect(() => { gmaoApi.getSystemStatus().then(setStatus); }, []);

  return (
    <div>
      <SectionHeader title="Supervision Mode Offline" sub="Gestion de la synchronisation locale (Dexie.js)" />
      <div className="azure-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock size={24} className="text-emerald-500" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>Base de données locale active</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>IndexDB (Dexie) — État : {status?.db_connected ? "Connecté" : "Déconnecté"}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
           <div style={{ padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>En attente</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#f59e0b" }}>{status?.pending_sync_count || 0}</div>
           </div>
           <div style={{ padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Conflits</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#ef4444" }}>{status?.conflict_count || 0}</div>
           </div>
           <div style={{ padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Intégrité</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#10b981" }}>{status?.integrity_score || 100}%</div>
           </div>
        </div>
      </div>
      <button style={{ padding: "12px 24px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 16, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 11, cursor: "pointer" }}>
         Forcer la réconciliation globale
      </button>
    </div>
  );
}

function ScannerPage() {
  return (
    <div>
      <SectionHeader title="Scanner PDA" sub="Historique des scans et vérification des opérations" />
      <div className="azure-card">
         {[
           { time: "14:22", tech: "Sana Trabelsi", item: "Courroie B47", action: "Sortie Stock", status: "Validé" },
           { time: "11:05", tech: "Lina Bouzid", item: "Roulement 6205", action: "Entrée Stock", status: "Validé" },
           { time: "09:45", tech: "Karim Mansouri", item: "Vérin FESTO", action: "Sortie Stock", status: "Validé" },
         ].map((log, i) => (
           <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: i === 2 ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
             <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa" }}>
                <Warehouse size={18} />
             </div>
             <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{log.item} — {log.action}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>Scanné par <b>{log.tech}</b></div>
             </div>
             <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "#10b981" }}>{log.status}</div>
                <div style={{ fontSize: 10, color: "#475569" }}>{log.time}</div>
             </div>
           </div>
         ))}
      </div>
    </div>
  );
}

function MLPage() {
  const [health, setHealth] = useState(null);
  useEffect(() => { gmaoApi.getMachineHealth().then(setHealth); }, []);

  return (
    <div>
      <SectionHeader title="Intelligence Artificielle (ML)" sub="Prédictions de pannes et aide à la décision" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="azure-card">
          <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", marginBottom: 16 }}>Analyse de fiabilité prédictive</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
             {health?.data?.map(m => (
               <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 12 }}>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#fff" }}>{m.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: m.risk === 'High' ? "#ef4444" : "#10b981" }}>{m.score}%</div>
                  <AzureBadge role={m.risk === 'High' ? 'magasinier' : 'technician'} />
               </div>
             ))}
          </div>
        </div>
        <div className="azure-card">
          <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", marginBottom: 16 }}>Recommandations Système</div>
          {[
            "Optimisation du stock : Augmenter stock Filtres Hydrauliques",
            "Alerte surcharge : Équipe Maintenance Sud (88% cap.)",
            ...(health?.data?.filter(m => m.risk === 'High').map(m => `Remplacement préventif recommandé : ${m.name}`) || [])
          ].map((rec, i) => (
            <div key={i} style={{ padding: "10px 12px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 12, color: "#a78bfa", fontSize: 12, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
               <Activity size={14} /> {rec}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogsPage() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { gmaoApi.getSystemLogs().then(setLogs); }, []);

  return (
    <div>
      <SectionHeader title="Audit & Logs Système" sub="Traçabilité complète des actions effectuées" />
      <div className="azure-card" style={{ maxHeight: 600, overflowY: "auto" }}>
        {logs.map((log, i) => (
          <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 12 }}>
            <span style={{ color: "#60a5fa", fontWeight: 900 }}>[{log.time}]</span>
            <span style={{ color: "#475569", margin: "0 8px" }}>—</span>
            <b style={{ color: "#fff" }}>{log.user}</b>
            <span style={{ color: "#94a3b8", margin: "0 8px" }}>a effectué</span>
            <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{log.action}</span>
            <span style={{ marginLeft: 8, fontSize: 10, color: "#475569", textTransform: "uppercase", fontWeight: 800 }}>({log.target})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PAGES = { 
  overview: Overview, 
  users: UsersPage, 
  machines: MachinesPage, 
  stock: StockPage, 
  sync: SyncPage, 
  offline: OfflinePage, 
  scanner: ScannerPage, 
  ml: MLPage, 
  logs: LogsPage, 
  settings: SettingsPage 
};

// ─── Root App ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') ?? 'overview') as keyof typeof PAGES;
  const notifCount = NOTIFS.filter(n => n.urgent).length;
  const Page = PAGES[tab] ?? Overview;

  function setTab(t: string) {
    window.history.pushState({}, '', `/dashboard/admin?tab=${t}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  return (
    <div style={{ fontFamily: "'Outfit', 'Inter', sans-serif", minHeight: "100%" }}>
      <style>{`
        .azure-card {
          background: rgba(15,23,42,0.7);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 20px;
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .azure-card:hover { border-color: rgba(255,255,255,0.1); box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
        .animate-pulse { animation: adm-pulse 2s infinite; }
        @keyframes adm-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .animate-spin { animation: adm-spin 1s linear infinite; }
        @keyframes adm-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .origin-left { transform-origin: left center; }
        .group:hover .group-hover\\:scale-105 { transform: scale(1.05); }
        .text-blue-400 { color: #60a5fa; } .text-blue-500 { color: #3b82f6; }
        .text-emerald-400 { color: #34d399; } .text-rose-400 { color: #f87171; }
        .text-amber-400 { color: #fbbf24; } .text-violet-400 { color: #a78bfa; }
        .text-slate-500 { color: #64748b; }
        .bg-blue-400\\/10 { background: rgba(96,165,250,0.1); }
        .bg-emerald-400\\/10 { background: rgba(52,211,153,0.1); }
        .bg-rose-400\\/10 { background: rgba(248,113,113,0.1); }
        .bg-amber-400\\/10 { background: rgba(251,191,36,0.1); }
        .bg-violet-400\\/10 { background: rgba(167,139,250,0.1); }
        .border-blue-500\\/20 { border-color: rgba(59,130,246,0.2); }
        .border-violet-500\\/20 { border-color: rgba(139,92,246,0.2); }
        .border-emerald-500\\/20 { border-color: rgba(16,185,129,0.2); }
        .border-amber-500\\/20 { border-color: rgba(245,158,11,0.2); }
        .bg-emerald-500 { background: #10b981; } .bg-amber-400 { background: #fbbf24; } .bg-slate-600 { background: #475569; }
        .shadow-\\[0_0_6px_rgba\\(16\\,185\\,129\\,0\\.6\\)\\] { box-shadow: 0 0 6px rgba(16,185,129,0.6); }
        .shadow-\\[0_0_6px_rgba\\(245\\,158\\,11\\,0\\.4\\)\\] { box-shadow: 0 0 6px rgba(245,158,11,0.4); }
      `}</style>

      <div style={{ padding: "32px 32px 48px" }}>
        <Page setTab={setTab} notifCount={notifCount} />
      </div>
    </div>
  );
}
