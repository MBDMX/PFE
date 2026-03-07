'use client';
import { ClipboardList, Clock, Wrench, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const stats = [
    { label: 'OT assignés', value: 4, icon: ClipboardList, color: '#3b82f6', bg: '#dbeafe' },
    { label: 'En attente', value: 2, icon: Clock, color: '#f59e0b', bg: '#fef9c3' },
    { label: 'En cours', value: 1, icon: Wrench, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Terminés ce mois', value: 8, icon: CheckCircle, color: '#10b981', bg: '#dcfce7' },
];
const pieData = [
    { name: 'En attente', value: 2, color: '#f59e0b' },
    { name: 'En cours', value: 1, color: '#3b82f6' },
    { name: 'Terminé', value: 8, color: '#10b981' },
    { name: 'Annulé', value: 1, color: '#ef4444' },
];
const ots = [
    { id: 1, title: 'Vidange compresseur', machine: 'Compresseur A1', priority: 'medium', status: 'pending', due: '10/03/2026' },
    { id: 2, title: 'Remplacement courroie', machine: 'Tour CN-200', priority: 'high', status: 'in_progress', due: '07/03/2026' },
    { id: 3, title: 'Réparation presse', machine: 'Presse Hydraulique P5', priority: 'critical', status: 'pending', due: '06/03/2026' },
];
const statusBadge: Record<string, string> = { pending: 'badge badge-yellow', in_progress: 'badge badge-blue', done: 'badge badge-green' };
const priorityBadge: Record<string, string> = { medium: 'badge badge-blue', high: 'badge badge-orange', critical: 'badge badge-red', low: 'badge badge-gray' };
const statusLabel: Record<string, string> = { pending: 'En attente', in_progress: 'En cours', done: 'Terminé' };
const priorityLabel: Record<string, string> = { medium: 'Moyen', high: 'Élevé', critical: 'Critique', low: 'Faible' };

export default function ManagerDashboard() {
    return (
        <div>
            <h1 className="page-header">Tableau de bord — Responsable</h1>
            <div className="stat-grid">
                {stats.map(s => (
                    <div key={s.label} className="card stat-card">
                        <div className="stat-icon" style={{ background: s.bg }}><s.icon size={22} color={s.color} /></div>
                        <div><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>
                    </div>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                <div className="card">
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Statut des OT</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={75}>
                                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip />
                            <Legend iconType="circle" iconSize={10} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="card">
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>OT en attente</h2>
                    <table>
                        <thead><tr><th>Titre</th><th>Machine</th><th>Priorité</th><th>Statut</th><th>Échéance</th></tr></thead>
                        <tbody>
                            {ots.map(o => (
                                <tr key={o.id}>
                                    <td style={{ fontWeight: 600 }}>{o.title}</td>
                                    <td style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{o.machine}</td>
                                    <td><span className={priorityBadge[o.priority]}>{priorityLabel[o.priority]}</span></td>
                                    <td><span className={statusBadge[o.status]}>{statusLabel[o.status]}</span></td>
                                    <td style={{ fontSize: '0.82rem' }}>{o.due}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
