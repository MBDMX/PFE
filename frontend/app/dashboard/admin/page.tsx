'use client';
import { Wrench, ClipboardList, Package, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const stats = [
    { label: 'Machines total', value: 4, icon: Wrench, color: '#3b82f6', bg: '#dbeafe' },
    { label: 'Opérationnelles', value: 2, icon: CheckCircle, color: '#10b981', bg: '#dcfce7' },
    { label: 'OT ouverts', value: 3, icon: ClipboardList, color: '#f59e0b', bg: '#fef9c3' },
    { label: 'Alertes stock', value: 1, icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2' },
];

const chartData = [
    { mois: 'Oct', OT: 8 }, { mois: 'Nov', OT: 12 }, { mois: 'Déc', OT: 6 },
    { mois: 'Jan', OT: 10 }, { mois: 'Fév', OT: 9 }, { mois: 'Mar', OT: 4 },
];

const recent = [
    { id: 1, title: 'Vidange compresseur', machine: 'Compresseur A1', status: 'pending', priority: 'medium' },
    { id: 2, title: 'Remplacement courroie', machine: 'Tour CN-200', status: 'in_progress', priority: 'high' },
    { id: 3, title: 'Inspection convoyeur', machine: 'Convoyeur B3', status: 'done', priority: 'low' },
    { id: 4, title: 'Réparation presse', machine: 'Presse Hydraulique P5', status: 'pending', priority: 'critical' },
];

const statusBadge: Record<string, string> = {
    pending: 'badge badge-yellow', in_progress: 'badge badge-blue', done: 'badge badge-green', cancelled: 'badge badge-gray',
};
const statusLabel: Record<string, string> = {
    pending: 'En attente', in_progress: 'En cours', done: 'Terminé', cancelled: 'Annulé',
};
const priorityBadge: Record<string, string> = {
    low: 'badge badge-gray', medium: 'badge badge-blue', high: 'badge badge-orange', critical: 'badge badge-red',
};
const priorityLabel: Record<string, string> = {
    low: 'Faible', medium: 'Moyen', high: 'Élevé', critical: 'Critique',
};

export default function AdminDashboard() {
    return (
        <div>
            <h1 className="page-header">Tableau de bord — Administrateur</h1>

            {/* Stat Cards */}
            <div className="stat-grid">
                {stats.map(s => (
                    <div key={s.label} className="card stat-card">
                        <div className="stat-icon" style={{ background: s.bg }}>
                            <s.icon size={22} color={s.color} />
                        </div>
                        <div>
                            <div className="stat-value">{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Chart */}
                <div className="card">
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>OT par mois</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="OT" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent OT */}
                <div className="card">
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Ordres de travail récents</h2>
                    <table>
                        <thead><tr><th>Titre</th><th>Priorité</th><th>Statut</th></tr></thead>
                        <tbody>
                            {recent.map(r => (
                                <tr key={r.id}>
                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.title}</div>
                                        <div style={{ fontSize: '0.77rem', color: 'var(--muted)' }}>{r.machine}</div>
                                    </td>
                                    <td><span className={priorityBadge[r.priority]}>{priorityLabel[r.priority]}</span></td>
                                    <td><span className={statusBadge[r.status]}>{statusLabel[r.status]}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
